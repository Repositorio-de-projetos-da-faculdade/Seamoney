package com.seamoney.rules.store;

import com.seamoney.rules.domain.Actor;
import com.seamoney.rules.domain.Network;
import com.seamoney.rules.domain.SupplierView;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Suppliers and their versioned wallets. Every query is filtered by the company. */
@Repository
public class SupplierRepository {

    private final JdbcTemplate jdbc;

    public SupplierRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<SupplierView> list(String orgId) {
        Map<String, List<SupplierView.Wallet>> wallets = new LinkedHashMap<>();
        jdbc.query(
                "SELECT * FROM supplier_wallets WHERE organization_id = ? ORDER BY network, version",
                rs -> {
                    wallets.computeIfAbsent(rs.getString("supplier_id"), k -> new ArrayList<>()).add(new SupplierView.Wallet(
                            rs.getString("id"), Network.fromValue(rs.getString("network")), rs.getString("address"), rs.getInt("version"),
                            rs.getString("status"), rs.getString("proposed_by"), rs.getString("proposed_role"), rs.getString("proposed_at"),
                            rs.getString("approved_by"), rs.getString("approved_role"), rs.getString("approved_at")));
                },
                orgId);
        // only suppliers in the registry (with at least one wallet row); older ones live only on their orders
        return jdbc.query(
                        "SELECT * FROM suppliers WHERE organization_id = ? ORDER BY name",
                        (rs, i) -> new SupplierView(
                                rs.getString("id"), rs.getString("name"), rs.getString("country"), rs.getString("city"), rs.getString("port"),
                                rs.getString("email"), rs.getString("created_at"), wallets.getOrDefault(rs.getString("id"), List.of())),
                        orgId)
                .stream()
                .filter(s -> !s.wallets().isEmpty())
                .toList();
    }

    public Optional<SupplierView> find(String orgId, String id) {
        return list(orgId).stream().filter(s -> s.id().equals(id)).findFirst();
    }

    public Optional<String> idByName(String orgId, String name) {
        return jdbc.queryForList("SELECT id FROM suppliers WHERE organization_id = ? AND LOWER(name) = LOWER(?)", String.class, orgId, name)
                .stream().findFirst();
    }

    public boolean hasRegistry(String orgId) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM supplier_wallets WHERE organization_id = ?", Integer.class, orgId);
        return n != null && n > 0;
    }

    public boolean hasWallets(String orgId, String supplierId) {
        Integer n = jdbc.queryForObject("SELECT COUNT(*) FROM supplier_wallets WHERE organization_id = ? AND supplier_id = ?", Integer.class, orgId, supplierId);
        return n != null && n > 0;
    }

    public Optional<String> approvedAddress(String orgId, String supplierId, Network network) {
        return jdbc.queryForList(
                        "SELECT address FROM supplier_wallets WHERE organization_id = ? AND supplier_id = ? AND network = ? AND status = 'approved'",
                        String.class, orgId, supplierId, network.value())
                .stream().findFirst();
    }

    public void insertSupplier(String orgId, String id, String name, String country, String city, String port, String email, String wallet, Network network, String now) {
        jdbc.update(
                "INSERT INTO suppliers (id, organization_id, name, country, city, port, email, wallet_address, network, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                id, orgId, name, country, city, port, email, wallet, network.value(), now);
    }

    public void updateProfile(String orgId, String id, String country, String city, String port, String email) {
        jdbc.update(
                "UPDATE suppliers SET country = COALESCE(?, country), city = COALESCE(?, city), port = COALESCE(?, port), email = COALESCE(?, email) WHERE id = ? AND organization_id = ?",
                country, city, port, email, id, orgId);
    }

    public int nextVersion(String orgId, String supplierId, Network network) {
        Integer v = jdbc.queryForObject(
                "SELECT COALESCE(MAX(version), 0) FROM supplier_wallets WHERE organization_id = ? AND supplier_id = ? AND network = ?",
                Integer.class, orgId, supplierId, network.value());
        return (v == null ? 0 : v) + 1;
    }

    /** A new version, as a proposal; an earlier open proposal on the same network is revoked. */
    public void propose(String orgId, String supplierId, String walletId, Network network, String address, int version, Actor by, String now) {
        jdbc.update(
                "UPDATE supplier_wallets SET status = 'revoked' WHERE organization_id = ? AND supplier_id = ? AND network = ? AND status = 'proposed'",
                orgId, supplierId, network.value());
        insertWallet(orgId, supplierId, walletId, network, address, version, "proposed", by, now, null, null);
    }

    /** Imported as is (the demo seed), with its status. */
    public void insertWallet(String orgId, String supplierId, String walletId, Network network, String address, int version, String status, Actor by, String at,
            Actor approvedBy, String approvedAt) {
        jdbc.update(
                "INSERT INTO supplier_wallets (id, organization_id, supplier_id, network, address, version, status, proposed_by, proposed_role, proposed_at, "
                        + "approved_by, approved_role, approved_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                walletId, orgId, supplierId, network.value(), address, version, status, by.userId(), by.role(), at,
                approvedBy == null ? null : approvedBy.userId(), approvedBy == null ? null : approvedBy.role(), approvedAt);
    }

    /** proposed -> approved, and the version in use on that network is revoked. False if it was no longer a proposal. */
    public boolean approve(String orgId, String supplierId, String walletId, Network network, Actor by, String now) {
        int changed = jdbc.update(
                "UPDATE supplier_wallets SET status = 'approved', approved_by = ?, approved_role = ?, approved_at = ? "
                        + "WHERE id = ? AND organization_id = ? AND supplier_id = ? AND status = 'proposed'",
                by.userId(), by.role(), now, walletId, orgId, supplierId);
        if (changed != 1) return false;
        jdbc.update(
                "UPDATE supplier_wallets SET status = 'revoked' WHERE organization_id = ? AND supplier_id = ? AND network = ? AND status = 'approved' AND id != ?",
                orgId, supplierId, network.value(), walletId);
        return true;
    }

    public boolean revokeProposal(String orgId, String supplierId, String walletId) {
        return jdbc.update(
                "UPDATE supplier_wallets SET status = 'revoked' WHERE id = ? AND organization_id = ? AND supplier_id = ? AND status = 'proposed'",
                walletId, orgId, supplierId) == 1;
    }
}
