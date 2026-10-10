package com.seamoney.rules.chain;

import java.math.BigInteger;
import java.util.List;
import java.util.Optional;

/**
 * The only thing the business rules know about the blockchain. The real implementation calls the
 * Python chain service over HTTP; tests plug in a fake.
 */
public interface ChainClient {

    SentPayment sendPayment(String to, long amountCents, String reference);

    List<FoundTransfer> findTransfers(String to, String reference, long fromBlock);

    Optional<TxInfo> transaction(String txHash);

    ChainHealth health();

    record SentPayment(String txHash, long blockNumber, long confirmMs, String memoHex, String fromAddress) {}

    record FoundTransfer(
            String txHash,
            int logIndex,
            long blockNumber,
            String fromAddress,
            String toAddress,
            BigInteger amountUnits,
            String memoHex) {}

    record TxInfo(String status, long blockNumber, String timestamp) {}

    record ChainHealth(boolean configured, String partnerAddress, long latestBlock) {}
}
