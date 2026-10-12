package com.seamoney.rules.domain;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * An import payment order. JSON field names are the contract with the web app.
 * {@code bankCostCents} and {@code savingsCents} are derived here so the UI never repeats business math.
 */
public record Order(
        String id,
        String reference,
        String supplierId,
        String supplierName,
        String supplierCountry,
        String supplierWallet,
        Network network,
        String invoiceNumber,
        long amountCents,
        String currency,
        String dueDate,
        int feeBps,
        long feeCents,
        long totalCents,
        double bankFeePct,
        Double fxRate,
        Long totalBrlCents,
        OrderStatus status,
        String createdBy,
        String createdRole,
        Decision approval,
        Decision closure,
        String extractionSource,
        String invoiceFilename,
        String txHash,
        Long blockNumber,
        Integer logIndex,
        String memoHex,
        Long confirmMs,
        String paidAt,
        String reconciledAt,
        Recon recon,
        String error,
        @JsonProperty("isDemo") boolean demo,
        String createdAt,
        String updatedAt,
        long bankCostCents,
        long savingsCents) {}
