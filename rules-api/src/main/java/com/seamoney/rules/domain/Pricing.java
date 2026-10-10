package com.seamoney.rules.domain;

import java.math.BigInteger;

/**
 * Pure money math. All amounts are integer cents so nothing drifts.
 * No framework dependencies: this class is unit-tested on its own.
 */
public final class Pricing {

    private Pricing() {}

    /** Half-up rounding of {@code amount * bps / 10_000} in integer arithmetic. */
    public static long feeCents(long amountCents, int feeBps) {
        return Math.floorDiv(amountCents * feeBps + 5_000, 10_000);
    }

    /** What the importer is assumed to pay today by bank wire (FX spread plus intermediary fees). */
    public static long bankCostCents(long amountCents, double bankFeePct) {
        return Math.round(amountCents * bankFeePct / 100.0);
    }

    public static Comparison compare(long amountCents, double bankFeePct, int feeBps) {
        long bank = bankCostCents(amountCents, bankFeePct);
        long route = feeCents(amountCents, feeBps);
        long savings = bank - route;
        return new Comparison(bank, route, savings, bank > 0 ? (double) savings / bank : 0.0);
    }

    /** USD cents to token base units: Tempo stablecoins have 6 decimals, cents have 2. */
    public static BigInteger centsToUnits(long cents) {
        if (cents < 0) throw new IllegalArgumentException("cents must be non-negative");
        return BigInteger.valueOf(cents).multiply(BigInteger.valueOf(10_000));
    }

    public static long unitsToCents(BigInteger units) {
        return units.divide(BigInteger.valueOf(10_000)).longValueExact();
    }

    /** Simulated FX: USD cents to BRL cents. Always labelled "simulated" in the UI. */
    public static long usdToBrlCents(long usdCents, double rate) {
        return Math.round(usdCents * rate);
    }

    public record Comparison(long bankCents, long routeCents, long savingsCents, double savingsShare) {}
}
