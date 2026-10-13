package com.seamoney.rules.service;

import com.seamoney.rules.AppProperties;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Every minute, looks at orders that have been in `sending` for a while and settles them from the chain (see
 * {@link OrderService#recover}). Without it an order whose send was cut short (a restart, a database error after
 * the chain had the payment) would stay in `sending` for ever.
 */
@Component
@ConditionalOnProperty(name = "seamoney.recovery.enabled", havingValue = "true", matchIfMissing = true)
public class SendingRecoveryJob {

    private static final Logger log = LoggerFactory.getLogger(SendingRecoveryJob.class);

    private final OrderService orders;
    private final AppProperties props;

    public SendingRecoveryJob(OrderService orders, AppProperties props) {
        this.orders = orders;
        this.props = props;
    }

    @Scheduled(fixedDelayString = "${seamoney.recovery.interval-ms:60000}", initialDelayString = "${seamoney.recovery.interval-ms:60000}")
    public void run() {
        try {
            int n = orders.recoverStuck(Duration.ofSeconds(props.recovery().stuckAfterSeconds()));
            if (n > 0) log.info("Looked at {} order(s) stuck in sending", n);
        } catch (RuntimeException e) {
            log.warn("Recovery pass failed: {}", e.getMessage());
        }
    }
}
