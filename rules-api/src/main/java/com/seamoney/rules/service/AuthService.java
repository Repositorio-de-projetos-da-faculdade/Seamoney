package com.seamoney.rules.service;

import com.seamoney.rules.domain.Membership;
import com.seamoney.rules.domain.User;
import com.seamoney.rules.security.JwtPrincipal;
import com.seamoney.rules.security.JwtTokenProvider;
import com.seamoney.rules.store.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthService {

    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final Clock clock;
    private final AuditService auditService;

    // In-memory rate limiting
    private final Map<String, Integer> attempts = new ConcurrentHashMap<>();
    private final Map<String, Long> lockouts = new ConcurrentHashMap<>();
    private static final int MAX_ATTEMPTS = 5;
    private static final long LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 mins

    public AuthService(UserRepository userRepo, PasswordEncoder passwordEncoder, JwtTokenProvider jwtTokenProvider, Clock clock, AuditService auditService) {
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtTokenProvider = jwtTokenProvider;
        this.clock = clock;
        this.auditService = auditService;
    }

    public String login(String email, String password, String ip) {
        checkLockout(email);

        Optional<User> userOpt = userRepo.findByEmail(email);
        if (userOpt.isEmpty() || !passwordEncoder.matches(password, userOpt.get().passwordHash())) {
            recordFailure(email);
            auditService.logFailedLogin(email, ip);
            throw new RuntimeException("Invalid credentials");
        }

        User user = userOpt.get();
        List<Membership> memberships = userRepo.findMemberships(user.id());
        if (memberships.isEmpty()) {
            throw new RuntimeException("User has no active organizations");
        }

        // Pick the first one as default
        Membership defaultMembership = memberships.get(0);
        String token = jwtTokenProvider.createToken(user.id(), defaultMembership.organizationId(), defaultMembership.role().name());

        attempts.remove(email);
        auditService.logLogin(user.id(), email, defaultMembership.organizationId(), ip);
        return token;
    }

    public String switchOrganization(JwtPrincipal currentPrincipal, String newOrgId, String ip) {
        Membership newMembership = userRepo.findMembership(currentPrincipal.userId(), newOrgId)
                .orElseThrow(() -> new RuntimeException("Organization not found or access denied"));

        String token = jwtTokenProvider.createToken(currentPrincipal.userId(), newOrgId, newMembership.role().name());
        auditService.logSwitchOrganization(currentPrincipal.userId(), currentPrincipal.orgId(), newOrgId, ip);
        return token;
    }

    private void checkLockout(String email) {
        Long lockoutTime = lockouts.get(email);
        if (lockoutTime != null) {
            if (clock.millis() < lockoutTime) {
                throw new RuntimeException("Account is temporarily locked due to too many failed attempts");
            } else {
                lockouts.remove(email);
                attempts.remove(email);
            }
        }
    }

    private void recordFailure(String email) {
        int count = attempts.getOrDefault(email, 0) + 1;
        if (count >= MAX_ATTEMPTS) {
            lockouts.put(email, clock.millis() + LOCKOUT_DURATION_MS);
        } else {
            attempts.put(email, count);
        }
    }
}
