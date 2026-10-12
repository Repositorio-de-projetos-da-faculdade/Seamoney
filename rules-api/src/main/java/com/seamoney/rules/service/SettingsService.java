package com.seamoney.rules.service;

import com.seamoney.rules.AppProperties;
import com.seamoney.rules.domain.Actor;
import com.seamoney.rules.service.OrderException.Code;
import com.seamoney.rules.store.SettingsRepository;
import org.springframework.stereotype.Service;

/** The company's settings: the approval threshold (owners only) and, read-only, the pricing every order uses. */
@Service
public class SettingsService {

    public record Settings(long approvalThresholdCents, int feeBps, double bankFeePct, double usdBrl) {}

    private final SettingsRepository repo;
    private final AppProperties props;

    public SettingsService(SettingsRepository repo, AppProperties props) {
        this.repo = repo;
        this.props = props;
    }

    /** From this amount up an order needs a second person; the company's own value, or the service default. */
    public long approvalThreshold(String orgId) {
        return repo.approvalThreshold(orgId).orElse(props.approvalThresholdCents());
    }

    public Settings get(String orgId) {
        return new Settings(approvalThreshold(orgId), props.feeBps(), props.bankFeePct(), props.usdBrl());
    }

    public Settings setApprovalThreshold(String orgId, Actor actor, long cents) {
        if (!"OWNER".equals(actor.role())) throw new OrderException("Only owners change the approval policy.", Code.FORBIDDEN);
        if (cents < 0 || cents > props.maxAmountCents()) throw new OrderException("The threshold must be between 0 and US$ 1,000,000.", Code.INVALID);
        repo.setApprovalThreshold(orgId, cents);
        return get(orgId);
    }
}
