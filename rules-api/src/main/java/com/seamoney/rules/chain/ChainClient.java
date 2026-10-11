package com.seamoney.rules.chain;

import com.seamoney.rules.domain.Network;
import java.math.BigInteger;
import java.util.List;
import java.util.Optional;

/**
 * The only thing the business rules know about the blockchains. The real implementation calls the
 * Python chain service over HTTP; tests plug in a fake. Every call names the network it concerns.
 */
public interface ChainClient {

    /**
     * Sends the payment. The chain service remembers {@code idempotencyKey}: the same key with the same body returns
     * the first payment instead of sending a second one, which makes a retry after a timeout safe.
     */
    SentPayment sendPayment(Network network, String to, long amountCents, String reference, String idempotencyKey);

    /** What the chain service knows about an earlier send with this key: pending, confirmed or failed; empty if never seen. */
    Optional<String> paymentStatus(String idempotencyKey);

    List<FoundTransfer> findTransfers(Network network, String to, String reference, long fromBlock);

    Optional<TxInfo> transaction(Network network, String txHash);

    ChainHealth health();

    record SentPayment(String txHash, long blockNumber, long confirmMs, String memoHex, String fromAddress) {}

    /** {@code blockNumber} is the block on Tempo and the slot on Solana; {@code logIndex} the event or instruction index. */
    record FoundTransfer(
            String txHash,
            int logIndex,
            long blockNumber,
            String fromAddress,
            String toAddress,
            BigInteger amountUnits,
            String memoHex) {}

    record TxInfo(String status, long blockNumber, String timestamp) {}

    record ChainHealth(boolean configured, String partnerAddress, long latestBlock, boolean solanaConfigured) {}
}
