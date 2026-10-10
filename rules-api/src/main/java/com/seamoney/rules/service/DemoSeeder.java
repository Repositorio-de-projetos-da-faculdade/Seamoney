package com.seamoney.rules.service;

import com.seamoney.rules.AppProperties;
import com.seamoney.rules.domain.OrderStatus;
import com.seamoney.rules.domain.Pricing;
import com.seamoney.rules.store.OrderRepository;
import com.seamoney.rules.store.OrderRepository.NewOrder;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Demo history so the dashboard is not empty on a fresh database. Every row is flagged is_demo = 1 and the
 * UI labels it "Demo". None of these orders has an on-chain transaction. Disable with SEED_DEMO=false.
 */
@Component
public class DemoSeeder implements ApplicationRunner {

    private record Supplier(String name, String country) {}

    private record Row(String invoice, int supplier, long usdCents, int daysAgo, Long confirmMs, OrderStatus status) {}

    private static final List<Supplier> SUPPLIERS = List.of(
            new Supplier("Shenzhen Tech Co.", "CN"),
            new Supplier("Hong Kong Electronics", "HK"),
            new Supplier("Global Parts Ltd.", "CN"),
            new Supplier("Guangzhou Components", "CN"));

    private static final List<Row> HISTORY = List.of(
            new Row("INV-2026-0412", 0, 6_450_000, 175, 2400L, OrderStatus.RECONCILED),
            new Row("INV-2026-0507", 3, 7_120_000, 146, 1900L, OrderStatus.RECONCILED),
            new Row("INV-2026-0603", 1, 5_890_000, 118, 1600L, OrderStatus.RECONCILED),
            new Row("INV-2026-0711", 0, 9_230_000, 84, 1500L, OrderStatus.RECONCILED),
            new Row("INV-2026-0804", 2, 4_780_000, 53, 1400L, OrderStatus.RECONCILED),
            new Row("INV-2026-0921", 1, 4_230_000, 21, 1500L, OrderStatus.RECONCILED),
            new Row("INV-2026-0772", 0, 12_000_000, 2, null, OrderStatus.QUOTED));

    private final OrderRepository repo;
    private final AppProperties props;
    private final Clock clock;

    public DemoSeeder(OrderRepository repo, AppProperties props, Clock clock) {
        this.repo = repo;
        this.props = props;
        this.clock = clock;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!props.seedDemo() || repo.count() > 0) return;

        Instant now = clock.instant();
        String[] supplierIds = new String[SUPPLIERS.size()];
        String[] wallets = new String[SUPPLIERS.size()];
        for (int i = 0; i < SUPPLIERS.size(); i++) {
            Supplier s = SUPPLIERS.get(i);
            supplierIds[i] = "sup_" + Integer.toHexString(s.name().hashCode());
            wallets[i] = OrderService.randomAddress();
            repo.insertSupplier(supplierIds[i], s.name(), s.country(), wallets[i], now.minus(Duration.ofDays(200)).toString());
        }

        for (Row r : HISTORY) {
            Supplier s = SUPPLIERS.get(r.supplier());
            String created = now.minus(Duration.ofDays(r.daysAgo())).toString();
            long fee = Pricing.feeCents(r.usdCents(), props.feeBps());
            long total = r.usdCents() + fee;
            String id = "ORD-D" + r.invoice().substring(r.invoice().length() - 4);
            boolean paid = r.status() != OrderStatus.QUOTED;
            repo.insert(new NewOrder(
                    id, r.invoice(), supplierIds[r.supplier()], s.name(), s.country(), wallets[r.supplier()], r.invoice(),
                    r.usdCents(), now.minus(Duration.ofDays(r.daysAgo() - 14L)).toString().substring(0, 10), props.feeBps(), fee,
                    total, props.bankFeePct(), props.usdBrl(), Pricing.usdToBrlCents(total, props.usdBrl()), r.status(), "demo",
                    null, true, r.confirmMs(), paid ? created : null, r.status() == OrderStatus.RECONCILED ? created : null, created));
            repo.addEvent(id, "created", "Demo data", created);
        }
    }
}
