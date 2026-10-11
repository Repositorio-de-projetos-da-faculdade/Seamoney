package com.seamoney.rules.service;

import com.seamoney.rules.AppProperties;
import com.seamoney.rules.domain.Network;
import com.seamoney.rules.domain.OrderStatus;
import com.seamoney.rules.domain.Pricing;
import com.seamoney.rules.domain.Role;
import com.seamoney.rules.store.OrderRepository;
import com.seamoney.rules.store.OrderRepository.NewOrder;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Component
@Profile("demo")
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
    private final JdbcTemplate jdbc;
    private final PasswordEncoder encoder;

    public DemoSeeder(OrderRepository repo, AppProperties props, Clock clock, JdbcTemplate jdbc, PasswordEncoder encoder) {
        this.repo = repo;
        this.props = props;
        this.clock = clock;
        this.jdbc = jdbc;
        this.encoder = encoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!props.seedDemo()) return;
        Integer c = jdbc.queryForObject("SELECT COUNT(*) FROM organizations", Integer.class);
        if (c != null && c > 0) return;

        Instant now = clock.instant();
        String created = now.toString();
        
        String pass = encoder.encode("demo123");

        seedOrganization("org_1", "Porto Claro Importadora", pass, created, "porto");
        seedOrganization("org_2", "Acme Corp", pass, created, "acme");
    }

    private void seedOrganization(String orgId, String orgName, String pass, String created, String prefix) {
        jdbc.update("INSERT INTO organizations (id, name, created_at) VALUES (?,?,?)", orgId, orgName, created);

        String[] emails = {prefix + ".owner@example.com", prefix + ".approver@example.com", prefix + ".operator@example.com", prefix + ".accountant@example.com"};
        Role[] roles = {Role.OWNER, Role.APPROVER, Role.OPERATOR, Role.ACCOUNTANT};

        for (int i = 0; i < 4; i++) {
            String userId = "usr_" + prefix + "_" + i;
            jdbc.update("INSERT INTO users (id, email, password_hash, created_at) VALUES (?,?,?,?)", userId, emails[i], pass, created);
            jdbc.update("INSERT INTO memberships (user_id, organization_id, role, status) VALUES (?,?,?,?)", userId, orgId, roles[i].name(), "ACTIVE");
        }

        Instant now = clock.instant();
        String[] supplierIds = new String[SUPPLIERS.size()];
        String[] wallets = new String[SUPPLIERS.size()];
        for (int i = 0; i < SUPPLIERS.size(); i++) {
            Supplier s = SUPPLIERS.get(i);
            supplierIds[i] = "sup_" + orgId + "_" + Integer.toHexString(s.name().hashCode());
            wallets[i] = Network.TEMPO.randomAddress();
            repo.insertSupplier(orgId, supplierIds[i], s.name(), s.country(), wallets[i], Network.TEMPO, now.minus(Duration.ofDays(200)).toString());
        }

        for (Row r : HISTORY) {
            Supplier s = SUPPLIERS.get(r.supplier());
            String orderCreated = now.minus(Duration.ofDays(r.daysAgo())).toString();
            long fee = Pricing.feeCents(r.usdCents(), props.feeBps());
            long total = r.usdCents() + fee;
            String id = "ORD-" + orgId + "-" + r.invoice().substring(r.invoice().length() - 4);
            boolean paid = r.status() != OrderStatus.QUOTED;
            repo.insert(new NewOrder(
                    id, orgId, id + "-" + r.invoice(), supplierIds[r.supplier()], s.name(), s.country(), wallets[r.supplier()], Network.TEMPO, r.invoice(),
                    r.usdCents(), now.minus(Duration.ofDays(r.daysAgo() - 14L)).toString().substring(0, 10), props.feeBps(), fee,
                    total, props.bankFeePct(), props.usdBrl(), Pricing.usdToBrlCents(total, props.usdBrl()), r.status(), "demo",
                    null, true, r.confirmMs(), paid ? orderCreated : null, r.status() == OrderStatus.RECONCILED ? orderCreated : null, orderCreated));
            repo.addEvent(orgId, id, "created", "Demo data", orderCreated);
        }
    }
}
