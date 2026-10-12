package com.seamoney.rules.web;

import com.seamoney.rules.security.JwtPrincipal;
import com.seamoney.rules.service.AuditService;
import java.util.List;
import java.util.Map;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** The company's audit trail: sign-ins (and failed ones), company switches, every order and wallet decision. */
@RestController
@RequestMapping("/api/audit")
public class AuditController {

    private final AuditService audit;

    public AuditController(AuditService audit) {
        this.audit = audit;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('OWNER', 'APPROVER', 'ACCOUNTANT')")
    public Map<String, List<AuditService.Entry>> recent(@AuthenticationPrincipal JwtPrincipal principal, @RequestParam(defaultValue = "200") int limit) {
        return Map.of("entries", audit.recent(principal.orgId(), limit));
    }
}
