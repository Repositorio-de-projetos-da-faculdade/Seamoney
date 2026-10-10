package com.seamoney.rules.store;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.seamoney.rules.domain.Order;
import com.seamoney.rules.domain.OrderStatus;
import com.seamoney.rules.domain.Pricing;
import com.seamoney.rules.domain.Recon;
import com.seamoney.rules.domain.Views.MonthPoint;
import com.seamoney.rules.domain.Views.OrderEvent;
import com.seamoney.rules.domain.Views.Stats;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

/** All SQL lives here. Plain JDBC on SQLite, no ORM. */
@Repository
public class OrderRepository {

    /** Columns needed to insert an order. Nullable columns are simply null. */
    public record NewOrder(
            String id,
            String reference,
            String supplierId,
            String supplierName,
            String supplierCountry,
            String supplierWallet,
            String invoiceNumber,
            long amountCents,
            String dueDate,
            int feeBps,
            long feeCents,
            long totalCents,
            double bankFeePct,
            double fxRate,
            long totalBrlCents,
            OrderStatus status,
            String extractionSource,
            String invoiceFilename,
            boolean demo,
            Long confirmMs,
            String paidAt,
            String reconciledAt,
            String createdAt) {}

    public record Supplier(String id, String name, String country, String walletAddress) {}

    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;

    public OrderRepository(JdbcTemplate jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    // ---------- reads ----------

    public List<Order> list(int limit) {
        return jdbc.query("SELECT * FROM orders ORDER BY created_at DESC LIMIT ?", orderMapper(), limit);
    }

    public Optional<Order> find(String id) {
        return jdbc.query("SELECT * FROM orders WHERE id = ?", orderMapper(), id).stream().findFirst();
    }

    public boolean referenceExists(String reference) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM orders WHERE reference = ?", Integer.class, reference);
        return n != null && n > 0;
    }

    public long count() {
        Long n = jdbc.queryForObject("SELECT COUNT(*) FROM orders", Long.class);
        return n == null ? 0 : n;
    }

    public List<OrderEvent> events(String orderId) {
        return jdbc.query(
                "SELECT * FROM order_events WHERE order_id = ? ORDER BY id ASC",
                (rs, i) -> new OrderEvent(rs.getLong("id"), rs.getString("order_id"), rs.getString("ts"), rs.getString("type"), rs.getString("detail")),
                orderId);
    }

    public Stats stats() {
        return jdbc.queryForObject(
                """
                SELECT
                  COALESCE(SUM(CASE WHEN status IN ('sent','reconciled')
                                    THEN CAST(ROUND(amount_cents * bank_fee_pct / 100.0) AS INTEGER) - fee_cents END), 0) AS savings,
                  COALESCE(SUM(CASE WHEN status != 'reconciled' THEN 1 ELSE 0 END), 0) AS in_progress,
                  COALESCE(SUM(CASE WHEN status = 'reconciled' THEN 1 ELSE 0 END), 0) AS reconciled,
                  AVG(confirm_ms) AS avg_ms,
                  COALESCE(SUM(CASE WHEN status IN ('sent','reconciled') THEN amount_cents END), 0) AS volume,
                  COALESCE(MAX(is_demo), 0) AS has_demo
                FROM orders
                """,
                (rs, i) -> {
                    double avg = rs.getDouble("avg_ms");
                    boolean noAverage = rs.wasNull(); // must be read right after the column it refers to
                    return new Stats(
                            rs.getLong("savings"),
                            rs.getLong("in_progress"),
                            rs.getLong("reconciled"),
                            noAverage ? null : avg,
                            rs.getLong("volume"),
                            rs.getInt("has_demo") == 1);
                });
    }

    /** Bank cost vs route fee per month, for the last {@code months} months (missing months are zero). */
    public List<MonthPoint> monthly(int months) {
        Map<String, long[]> byMonth = new HashMap<>();
        jdbc.query(
                """
                SELECT substr(created_at, 1, 7) AS month,
                       COALESCE(SUM(CAST(ROUND(amount_cents * bank_fee_pct / 100.0) AS INTEGER)), 0) AS bank,
                       COALESCE(SUM(fee_cents), 0) AS route
                FROM orders WHERE status IN ('sent','reconciled')
                GROUP BY month
                """,
                rs -> {
                    byMonth.put(rs.getString("month"), new long[] {rs.getLong("bank"), rs.getLong("route")});
                });
        List<MonthPoint> out = new ArrayList<>();
        LocalDate first = LocalDate.now(ZoneOffset.UTC).withDayOfMonth(1);
        for (int i = months - 1; i >= 0; i--) {
            LocalDate d = first.minusMonths(i);
            String key = "%d-%02d".formatted(d.getYear(), d.getMonthValue());
            long[] v = byMonth.getOrDefault(key, new long[] {0, 0});
            out.add(new MonthPoint(key, v[0], v[1]));
        }
        return out;
    }

    // ---------- suppliers ----------

    public Optional<Supplier> findSupplierByName(String name) {
        return jdbc.query(
                        "SELECT * FROM suppliers WHERE name = ?",
                        (rs, i) -> new Supplier(rs.getString("id"), rs.getString("name"), rs.getString("country"), rs.getString("wallet_address")),
                        name)
                .stream()
                .findFirst();
    }

    public void insertSupplier(String id, String name, String country, String wallet, String createdAt) {
        jdbc.update(
                "INSERT INTO suppliers (id, name, country, wallet_address, created_at) VALUES (?,?,?,?,?)",
                id, name, country, wallet, createdAt);
    }

    public void updateSupplier(String id, String wallet, String country) {
        jdbc.update("UPDATE suppliers SET wallet_address = ?, country = COALESCE(?, country) WHERE id = ?", wallet, country, id);
    }

    // ---------- writes ----------

    public void insert(NewOrder o) {
        jdbc.update(
                """
                INSERT INTO orders (id, reference, supplier_id, supplier_name, supplier_country, supplier_wallet,
                  invoice_number, amount_cents, currency, due_date, fee_bps, fee_cents, total_cents, bank_fee_pct,
                  fx_rate, total_brl_cents, status, extraction_source, invoice_filename, confirm_ms, paid_at,
                  reconciled_at, is_demo, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,'USD',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,
                o.id(), o.reference(), o.supplierId(), o.supplierName(), o.supplierCountry(), o.supplierWallet(),
                o.invoiceNumber(), o.amountCents(), o.dueDate(), o.feeBps(), o.feeCents(), o.totalCents(), o.bankFeePct(),
                o.fxRate(), o.totalBrlCents(), o.status().value(), o.extractionSource(), o.invoiceFilename(), o.confirmMs(),
                o.paidAt(), o.reconciledAt(), o.demo() ? 1 : 0, o.createdAt(), o.createdAt());
    }

    /** Atomic claim: only one caller can move quoted to sending, so a double click cannot pay twice. */
    public boolean claimForSending(String id, String now) {
        return jdbc.update("UPDATE orders SET status = 'sending', error = NULL, updated_at = ? WHERE id = ? AND status = 'quoted'", now, id) == 1;
    }

    public void markSent(String id, String txHash, long blockNumber, String memoHex, long confirmMs, String now) {
        jdbc.update(
                "UPDATE orders SET status = 'sent', tx_hash = ?, block_number = ?, memo_hex = ?, confirm_ms = ?, paid_at = ?, updated_at = ? WHERE id = ?",
                txHash, blockNumber, memoHex, confirmMs, now, now, id);
    }

    public void releaseClaim(String id, String error, String now) {
        jdbc.update("UPDATE orders SET status = 'quoted', error = ?, updated_at = ? WHERE id = ?", error, now, id);
    }

    public void markReconciled(String id, int logIndex, Recon recon) {
        try {
            jdbc.update(
                    "UPDATE orders SET status = 'reconciled', log_index = ?, reconciled_at = ?, recon_json = ?, updated_at = ? WHERE id = ?",
                    logIndex, recon.matchedAt(), mapper.writeValueAsString(recon), recon.matchedAt(), id);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    /** A transfer (tx hash + log index) may credit only one order. */
    public boolean alreadyCredited(String txHash, int logIndex, String excludeOrderId) {
        Integer n = jdbc.queryForObject(
                "SELECT COUNT(*) FROM orders WHERE tx_hash = ? AND log_index = ? AND status = 'reconciled' AND id != ?",
                Integer.class, txHash, logIndex, excludeOrderId);
        return n != null && n > 0;
    }

    public void addEvent(String orderId, String type, String detail, String ts) {
        jdbc.update("INSERT INTO order_events (order_id, ts, type, detail) VALUES (?,?,?,?)", orderId, ts, type, detail);
    }

    public void saveLead(String email, Long monthlyUsd, Double bankFeePct, String country, boolean consent, String createdAt) {
        jdbc.update(
                "INSERT INTO leads (email, monthly_usd, bank_fee_pct, country, consent, created_at) VALUES (?,?,?,?,?,?)",
                email, monthlyUsd, bankFeePct, country, consent ? 1 : 0, createdAt);
    }

    // ---------- mapping ----------

    private RowMapper<Order> orderMapper() {
        return (rs, i) -> {
            long amount = rs.getLong("amount_cents");
            double bankPct = rs.getDouble("bank_fee_pct");
            long fee = rs.getLong("fee_cents");
            long bankCost = Pricing.bankCostCents(amount, bankPct);
            return new Order(
                    rs.getString("id"), rs.getString("reference"), rs.getString("supplier_id"), rs.getString("supplier_name"),
                    rs.getString("supplier_country"), rs.getString("supplier_wallet"), rs.getString("invoice_number"),
                    amount, rs.getString("currency"), rs.getString("due_date"), rs.getInt("fee_bps"), fee,
                    rs.getLong("total_cents"), bankPct, nullableDouble(rs, "fx_rate"), nullableLong(rs, "total_brl_cents"),
                    OrderStatus.fromValue(rs.getString("status")), rs.getString("extraction_source"),
                    rs.getString("invoice_filename"), rs.getString("tx_hash"), nullableLong(rs, "block_number"),
                    nullableInt(rs, "log_index"), rs.getString("memo_hex"), nullableLong(rs, "confirm_ms"),
                    rs.getString("paid_at"), rs.getString("reconciled_at"), parseRecon(rs.getString("recon_json")),
                    rs.getString("error"), rs.getInt("is_demo") == 1, rs.getString("created_at"), rs.getString("updated_at"),
                    bankCost, bankCost - fee);
        };
    }

    private Recon parseRecon(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return mapper.readValue(json, Recon.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Corrupt recon_json", e);
        }
    }

    private static Long nullableLong(ResultSet rs, String col) throws SQLException {
        long v = rs.getLong(col);
        return rs.wasNull() ? null : v;
    }

    private static Integer nullableInt(ResultSet rs, String col) throws SQLException {
        int v = rs.getInt(col);
        return rs.wasNull() ? null : v;
    }

    private static Double nullableDouble(ResultSet rs, String col) throws SQLException {
        double v = rs.getDouble(col);
        return rs.wasNull() ? null : v;
    }
}
