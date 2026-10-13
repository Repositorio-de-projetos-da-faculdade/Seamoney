package com.seamoney.rules.web;

import com.seamoney.rules.security.JwtPrincipal;
import com.seamoney.rules.service.AuthException;
import com.seamoney.rules.service.AuthService;
import com.seamoney.rules.store.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final UserRepository users;

    public AuthController(AuthService authService, UserRepository users) {
        this.authService = authService;
        this.users = users;
    }

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req, HttpServletRequest request) {
        try {
            String token = authService.login(req.email(), req.password(), ClientIp.of(request));
            return ResponseEntity.ok(Map.of("token", token));
        } catch (AuthException e) {
            // only a refused sign-in carries a message for the person; any other failure is the generic 500
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@AuthenticationPrincipal JwtPrincipal principal, @RequestBody Map<String, String> body, HttpServletRequest request) {
        if (principal == null) return ResponseEntity.status(401).build();
        String newOrgId = body.get("organizationId");
        if (newOrgId != null && !newOrgId.equals(principal.orgId())) {
            try {
                String token = authService.switchOrganization(principal, newOrgId, ClientIp.of(request));
                return ResponseEntity.ok(Map.of("token", token));
            } catch (AuthException e) {
                return ResponseEntity.status(404).body(Map.of("error", "Organization not found"));
            }
        }
        // Not switching company: a new token for the same one, with the role the person holds now. If the membership
        // ended meanwhile there is nothing to refresh: sign in again.
        try {
            String token = authService.switchOrganization(principal, principal.orgId(), ClientIp.of(request));
            return ResponseEntity.ok(Map.of("token", token));
        } catch (AuthException e) {
            return ResponseEntity.status(401).body(Map.of("error", "Your access to this company has ended"));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@AuthenticationPrincipal JwtPrincipal principal) {
        if (principal == null) return ResponseEntity.status(401).build();
        List<UserRepository.Company> companies = users.findCompanies(principal.userId());
        String organizationName = companies.stream().filter(c -> c.id().equals(principal.orgId())).map(UserRepository.Company::name).findFirst().orElse("");
        return ResponseEntity.ok(Map.of(
                "id", principal.userId(),
                "email", users.findEmail(principal.userId()).orElse(""),
                "organizationId", principal.orgId(),
                "organizationName", organizationName,
                "role", principal.role(),
                "organizations", companies
        ));
    }
}
