package com.seamoney.rules.domain;

import java.util.List;

/** A supplier and its wallet versions, as the web app reads them (GET /api/suppliers). */
public record SupplierView(String id, String name, String country, String city, String port, String email, String createdAt, List<Wallet> wallets) {

    /** One version of a receiving address on one network: proposed, approved (in use) or revoked. */
    public record Wallet(
            String id,
            Network network,
            String address,
            int version,
            String status,
            String proposedBy,
            String proposedRole,
            String proposedAt,
            String approvedBy,
            String approvedRole,
            String approvedAt) {}
}
