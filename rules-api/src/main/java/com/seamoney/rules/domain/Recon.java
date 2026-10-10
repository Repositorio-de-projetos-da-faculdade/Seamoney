package com.seamoney.rules.domain;

/** Result of matching an order against the blockchain. Stored as JSON on the order. */
public record Recon(
        String txHash,
        int logIndex,
        long blockNumber,
        String matchedAt,
        long expectedCents,
        long paidCents,
        Checks checks) {

    public record Checks(boolean token, boolean recipient, boolean amount, boolean memo, boolean receipt) {
        public boolean allPassed() {
            return token && recipient && amount && memo && receipt;
        }
    }
}
