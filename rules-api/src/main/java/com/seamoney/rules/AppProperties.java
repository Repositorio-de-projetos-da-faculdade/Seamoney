package com.seamoney.rules;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Everything configurable lives under the {@code seamoney.*} prefix in application.yml. */
@ConfigurationProperties(prefix = "seamoney")
public record AppProperties(
        String chainServiceUrl,
        String chainServiceToken,
        double usdBrl,
        boolean seedDemo,
        int feeBps,
        double bankFeePct,
        long maxAmountCents,
        /** From this amount up an order needs a second person to approve it; below it the policy approves. */
        long approvalThresholdCents,
        Recovery recovery) {

    /** Orders left in `sending` are settled from the chain in the background; see OrderService.recover. */
    public record Recovery(boolean enabled, long intervalMs, long stuckAfterSeconds) {}
}
