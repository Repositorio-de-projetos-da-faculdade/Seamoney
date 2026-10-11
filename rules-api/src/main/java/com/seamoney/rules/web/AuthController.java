package com.seamoney.rules.web;

import com.seamoney.rules.security.JwtPrincipal;
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
            String token = authService.login(req.email(), req.password(), request.getRemoteAddr());
            return ResponseEntity.ok(Map.of("token", token));
        } catch (RuntimeException e) {
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@AuthenticationPrincipal JwtPrincipal principal, @RequestBody Map<String, String> body, HttpServletRequest request) {
        if (principal == null) return ResponseEntity.status(401).build();
        String newOrgId = body.get("organizationId");
        if (newOrgId != null && !newOrgId.equals(principal.orgId())) {
            try {
                String token = authService.switchOrganization(principal, newOrgId, request.getRemoteAddr());
                return ResponseEntity.ok(Map.of("token", token));
            } catch (Exception e) {
                return ResponseEntity.status(404).body(Map.of("error", "Organization not found"));
            }
        }
        // If not switching org, refresh is just generating a new token with same claims
        String token = authService.switchOrganization(principal, principal.orgId(), request.getRemoteAddr());
        return ResponseEntity.ok(Map.of("token", token));
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
