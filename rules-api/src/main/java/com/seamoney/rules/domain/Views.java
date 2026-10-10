package com.seamoney.rules.domain;

import java.util.List;

/** Small read models returned by the API. */
public final class Views {

    private Views() {}

    public record OrderEvent(long id, String orderId, String ts, String type, String detail) {}

    public record Stats(
            long savingsCents,
            long inProgress,
            long reconciled,
            Double avgConfirmMs,
            long volumeCents,
            boolean hasDemo) {}

    public record MonthPoint(String month, long bankCents, long routeCents) {}

    public record StatsResponse(Stats stats, List<MonthPoint> series) {}

    /** What the supplier is allowed to see on the public proof-of-payment page. */
    public record ProofOrder(
            String id,
            String invoiceNumber,
            long amountCents,
            String supplierName,
            String reference,
            String txHash,
            String paidAt) {}
}
