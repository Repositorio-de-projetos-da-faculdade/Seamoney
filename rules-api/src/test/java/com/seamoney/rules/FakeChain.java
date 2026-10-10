package com.seamoney.rules;

import com.seamoney.rules.chain.ChainClient;
import com.seamoney.rules.chain.ChainException;
import com.seamoney.rules.domain.Pricing;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

/** An in-memory blockchain for tests: a payment becomes a transfer that reconciliation can find again. */
public class FakeChain implements ChainClient {

    public static final String PARTNER = "0x7F44CF78Cd8052FB426Dd8C818498A1e1d7e8835";

    public final List<FoundTransfer> transfers = new CopyOnWriteArrayList<>();
    private final AtomicInteger counter = new AtomicInteger();

    /** When set, the next sendPayment fails with this error, once. */
    public volatile ChainException failNextPayment;
    /** When set, the next payment is recorded on-chain with this (wrong) amount in base units. */
    public volatile BigInteger tamperNextAmount;

    public static String memoHex(String reference) {
        byte[] raw = reference.getBytes(StandardCharsets.UTF_8);
        return "0x" + HexFormat.of().formatHex(raw) + "00".repeat(32 - raw.length);
    }

    @Override
    public SentPayment sendPayment(String to, long amountCents, String reference) {
        ChainException failure = failNextPayment;
        if (failure != null) {
            failNextPayment = null;
            throw failure;
        }
        int n = counter.incrementAndGet();
        String tx = "0x" + "%064x".formatted(n);
        BigInteger units = tamperNextAmount != null ? tamperNextAmount : Pricing.centsToUnits(amountCents);
        tamperNextAmount = null;
        String memo = memoHex(reference);
        transfers.add(new FoundTransfer(tx, 1, 100L + n, PARTNER, to, units, memo));
        return new SentPayment(tx, 100L + n, 1200, memo, PARTNER);
    }

    @Override
    public List<FoundTransfer> findTransfers(String to, String reference, long fromBlock) {
        String memo = memoHex(reference);
        return transfers.stream().filter(t -> t.toAddress().equalsIgnoreCase(to) && t.memoHex().equals(memo)).toList();
    }

    @Override
    public Optional<TxInfo> transaction(String txHash) {
        return transfers.stream()
                .filter(t -> t.txHash().equalsIgnoreCase(txHash))
                .findFirst()
                .map(t -> new TxInfo("success", t.blockNumber(), "2026-10-10T04:00:00Z"));
    }

    @Override
    public ChainHealth health() {
        return new ChainHealth(true, PARTNER, 1);
    }
}
