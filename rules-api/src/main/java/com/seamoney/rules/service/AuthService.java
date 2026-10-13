package com.seamoney.rules.service;

import com.seamoney.rules.domain.Membership;
import com.seamoney.rules.domain.User;
import com.seamoney.rules.security.JwtPrincipal;
import com.seamoney.rules.security.JwtTokenProvider;
import com.seamoney.rules.store.UserRepository;
import java.time.Clock;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final Clock clock;
    private final AuditService auditService;
    private final LoginAttempts attempts = new LoginAttempts();
    /** Checked against when the email is unknown, so an unknown email costs as much time as a wrong password. */
    private final String unknownUserHash;

    public AuthService(UserRepository userRepo, PasswordEncoder passwordEncoder, JwtTokenProvider jwtTokenProvider, Clock clock, AuditService auditService) {
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.clock = clock;
        this.auditService = auditService;
        this.unknownUserHash = passwordEncoder.encode("not-a-real-password");
    }

    /** @param ip where the request came from, for the lockout and for the audit trail */
    public String login(String rawEmail, String password, String ip) {
        String email = rawEmail == null ? "" : rawEmail.trim().toLowerCase(Locale.ROOT);
        String source = ip == null || ip.isBlank() ? "unknown" : ip;
        if (attempts.locked(email, source, clock.millis())) throw AuthException.locked();

        Optional<User> userOpt = userRepo.findByEmail(email);
        boolean ok = false;
        if (userOpt.isPresent()) {
            ok = passwordEncoder.matches(password, userOpt.get().passwordHash());
        } else {
            passwordEncoder.matches(password, unknownUserHash); // same cost as a wrong password; the answer is not used
        }
        if (!ok) {
            attempts.failed(email, source, clock.millis());
            // the address as stored when the account exists (so the company's audit trail finds it), as typed otherwise
            auditService.logFailedLogin(userOpt.map(User::email).orElse(rawEmail == null ? "" : rawEmail.trim()), source);
            throw AuthException.invalid("Invalid credentials");
        }

        User user = userOpt.get();
        List<Membership> memberships = userRepo.findMemberships(user.id());
        if (memberships.isEmpty()) {
            throw AuthException.invalid("User has no active organizations");
        }

        // Pick the first one as default
        Membership defaultMembership = memberships.get(0);
        String token = jwtTokenProvider.createToken(user.id(), defaultMembership.organizationId(), defaultMembership.role().name());

        attempts.succeeded(email, source);
        auditService.logLogin(user.id(), user.email(), defaultMembership.organizationId(), source);
        return token;
    }

    public String switchOrganization(JwtPrincipal currentPrincipal, String newOrgId, String ip) {
        Membership newMembership = userRepo.findMembership(currentPrincipal.userId(), newOrgId)
                .orElseThrow(() -> AuthException.invalid("Organization not found or access denied"));

        String token = jwtTokenProvider.createToken(currentPrincipal.userId(), newOrgId, newMembership.role().name());
        auditService.logSwitchOrganization(currentPrincipal.userId(), currentPrincipal.orgId(), newOrgId, ip);
        return token;
    }
}
