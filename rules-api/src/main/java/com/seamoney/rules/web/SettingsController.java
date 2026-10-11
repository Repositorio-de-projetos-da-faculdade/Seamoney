package com.seamoney.rules.web;

import com.seamoney.rules.domain.Actor;
import com.seamoney.rules.security.JwtPrincipal;
import com.seamoney.rules.service.AuditService;
import com.seamoney.rules.service.SettingsService;
import com.seamoney.rules.service.SettingsService.Settings;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    public record ThresholdRequest(@NotNull Long approvalThresholdCents) {}

    private final SettingsService settings;
    private final AuditService audit;

    public SettingsController(SettingsService settings, AuditService audit) {
        this.settings = settings;
        this.audit = audit;
    }

    @GetMapping
    public Settings get(@AuthenticationPrincipal JwtPrincipal principal) {
        return settings.get(principal.orgId());
    }

    @PutMapping
    @PreAuthorize("hasRole('OWNER')")
    public Settings put(@AuthenticationPrincipal JwtPrincipal principal, @Valid @RequestBody ThresholdRequest body) {
        long before = settings.approvalThreshold(principal.orgId());
        Settings after = settings.setApprovalThreshold(principal.orgId(), new Actor(principal.userId(), principal.role()), body.approvalThresholdCents());
        audit.logWrite(principal.orgId(), principal.userId(), "SETTINGS_CHANGED", "ORGANIZATION", principal.orgId(), String.valueOf(before),
                String.valueOf(after.approvalThresholdCents()));
        return after;
    }
}
