package com.seamoney.rules;

import com.seamoney.rules.chain.ChainClient;
import com.seamoney.rules.chain.ChainException;
import com.seamoney.rules.domain.Network;
import com.seamoney.rules.domain.Pricing;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * An in-memory blockchain for tests: a payment becomes a transfer that reconciliation can find again. Like the chain
 * service, it remembers each Idempotency-Key and answers a repeated key with the first payment.
 */
public class FakeChain implements ChainClient {

    public static final String PARTNER = "0x7F44CF78Cd8052FB426Dd8C818498A1e1d7e8835";
    public static final String PARTNER_SOLANA = "A8KzP4sZzX8eBqW2qK5cM7dY3nN6yR1tE4xU7iV9oF2p";

    public final List<FoundTransfer> transfers = new CopyOnWriteArrayList<>();
    private final AtomicInteger counter = new AtomicInteger();

    private final Map<String, SentPayment> paid = new ConcurrentHashMap<>();
    private final Map<String, String> statuses = new ConcurrentHashMap<>();

    /** When set, the next sendPayment fails with this error, once. Nothing reaches the chain. */
    public volatile ChainException failNextPayment;
    /** When set, the next payment reaches the chain but the caller only sees a timeout, once. */
    public volatile boolean timeoutAfterSending;
    /** When set, the next payment is recorded on-chain with this (wrong) amount in base units. */
    public volatile BigInteger tamperNextAmount;

    public static String memoHex(String reference) {
        byte[] raw = reference.getBytes(StandardCharsets.UTF_8);
        return "0x" + HexFormat.of().formatHex(raw) + "00".repeat(32 - raw.length);
    }

    @Override
    public SentPayment sendPayment(Network network, String to, long amountCents, String reference, String idempotencyKey) {
        SentPayment earlier = paid.get(idempotencyKey);
        if (earlier != null) return earlier;
        ChainException failure = failNextPayment;
        if (failure != null) {
            failNextPayment = null;
            statuses.put(idempotencyKey, "failed");
            throw failure;
        }
        int n = counter.incrementAndGet();
        String tx = network == Network.TEMPO ? "0x" + "%064x".formatted(n) : "5J" + "%064x".formatted(n).replace("0", "X");
        BigInteger units = tamperNextAmount != null ? tamperNextAmount : Pricing.centsToUnits(amountCents);
        tamperNextAmount = null;
        String memo = memoHex(reference);
        String partner = network == Network.TEMPO ? PARTNER : PARTNER_SOLANA;
        transfers.add(new FoundTransfer(tx, 1, 100L + n, partner, to, units, memo));
        SentPayment sent = new SentPayment(tx, 100L + n, 1200, memo, partner);
        paid.put(idempotencyKey, sent);
        if (timeoutAfterSending) {
            timeoutAfterSending = false;
            statuses.put(idempotencyKey, "pending");
            throw new ChainException("The chain service is unavailable", new java.net.http.HttpTimeoutException("read timed out"));
        }
        statuses.put(idempotencyKey, "confirmed");
        return sent;
    }

    /** The chain service holds an unfinished attempt under this key that has not reached the chain. */
    public void rememberPending(String idempotencyKey) {
        statuses.put(idempotencyKey, "pending");
    }

    /** The chain service recorded the attempt under this key as failed. */
    public void rememberFailed(String idempotencyKey) {
        statuses.put(idempotencyKey, "failed");
    }

    @Override
    public Optional<String> paymentStatus(String idempotencyKey) {
        return Optional.ofNullable(statuses.get(idempotencyKey));
    }

    @Override
    public List<FoundTransfer> findTransfers(Network network, String to, String reference, long fromBlock) {
        String memo = memoHex(reference);
        return transfers.stream()
                .filter(t -> network.sameAddress(t.toAddress(), to) && t.memoHex().equals(memo))
                .toList();
    }

    @Override
    public Optional<TxInfo> transaction(Network network, String txHash) {
        return transfers.stream()
                .filter(t -> network.sameHash(t.txHash(), txHash))
                .findFirst()
                .map(t -> new TxInfo("success", t.blockNumber(), "2026-10-10T04:00:00Z"));
    }

    @Override
    public ChainHealth health() {
        return new ChainHealth(true, PARTNER, 1, true);
    }
}
