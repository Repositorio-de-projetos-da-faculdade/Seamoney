package com.seamoney.rules.service;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.seamoney.rules.AppProperties;
import com.seamoney.rules.chain.ChainClient;
import com.seamoney.rules.chain.ChainClient.FoundTransfer;
import com.seamoney.rules.chain.ChainClient.SentPayment;
import com.seamoney.rules.chain.ChainClient.TxInfo;
import com.seamoney.rules.chain.ChainException;
import com.seamoney.rules.domain.Network;
import com.seamoney.rules.domain.Order;
import com.seamoney.rules.domain.OrderStatus;
import com.seamoney.rules.domain.Pricing;
import com.seamoney.rules.domain.Recon;
import com.seamoney.rules.domain.Views.OrderEvent;
import com.seamoney.rules.domain.Views.ProofOrder;
import com.seamoney.rules.domain.Views.StatsResponse;
import com.seamoney.rules.service.OrderException.Code;
import com.seamoney.rules.store.OrderRepository;
import com.seamoney.rules.store.OrderRepository.NewOrder;
import com.seamoney.rules.store.OrderRepository.Supplier;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;

/** The order lifecycle: create and quote, pay, reconcile, report. This is where the business rules live. */
@Service
public class OrderService {

    public record NewOrderInput(
            String supplierName,
            String supplierCountry,
            String supplierWallet,
            String invoiceNumber,
            long amountCents,
            String dueDate,
            String extractionSource,
            String invoiceFilename,
            String network) {

        /** Without a network the order settles on Tempo, the original network. */
        public NewOrderInput(
                String supplierName,
                String supplierCountry,
                String supplierWallet,
                String invoiceNumber,
                long amountCents,
                String dueDate,
                String extractionSource,
                String invoiceFilename) {
            this(supplierName, supplierCountry, supplierWallet, invoiceNumber, amountCents, dueDate, extractionSource, invoiceFilename, null);
        }
    }

    /** Outcome of a reconciliation attempt. A mismatch is an expected business result, not an error. */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ReconcileResult(boolean ok, Order order, String reason, Recon.Checks checks) {
        static ReconcileResult matched(Order order) {
            return new ReconcileResult(true, order, null, null);
        }

        static ReconcileResult failed(String reason, Recon.Checks checks) {
            return new ReconcileResult(false, null, reason, checks);
        }
    }

    private static final SecureRandom RANDOM = new SecureRandom();

    private final OrderRepository repo;
    private final ChainClient chain;
    private final AppProperties props;
    private final Clock clock;

    public OrderService(OrderRepository repo, ChainClient chain, AppProperties props, Clock clock) {
        this.repo = repo;
        this.chain = chain;
        this.props = props;
        this.clock = clock;
    }

    // ---------- reads ----------

    public List<Order> list(int limit) {
        return repo.list(Math.min(Math.max(limit, 1), 5000));
    }

    public Order get(String id) {
        return repo.find(id).orElseThrow(() -> new OrderException("Order not found.", Code.NOT_FOUND));
    }

    public List<OrderEvent> events(String id) {
        return repo.events(id);
    }

    public StatsResponse stats() {
        return new StatsResponse(repo.stats(), repo.monthly(7));
    }

    /** The supplier proof page: a trimmed order plus a live check of the transaction on-chain. */
    public record Proof(ProofOrder order, TxInfo tx) {}

    public Proof proof(String id) {
        Order o = get(id);
        if (o.txHash() == null) throw new OrderException("This order has no on-chain payment yet.", Code.NOT_FOUND);
        TxInfo tx;
        try {
            tx = chain.transaction(o.network(), o.txHash()).orElse(null);
        } catch (ChainException e) {
            tx = null; // unverified, and the page says so
        }
        return new Proof(
                new ProofOrder(o.id(), o.invoiceNumber(), o.amountCents(), o.supplierName(), o.reference(), o.network(), o.txHash(), o.paidAt()), tx);
    }

    // ---------- create + quote ----------

    public Order create(NewOrderInput in) {
        String invoice = in.invoiceNumber() == null ? "" : in.invoiceNumber().trim();
        String supplierName = in.supplierName() == null ? "" : in.supplierName().trim();
        if (invoice.isEmpty()) throw invalid("Invoice number is required.");
        if (supplierName.isEmpty()) throw invalid("Supplier name is required.");
        if (in.amountCents() <= 0) throw invalid("Amount must be greater than zero.");
        if (in.amountCents() > props.maxAmountCents()) throw invalid("The demo is limited to US$ 1,000,000 per order.");
        Network network;
        try {
            network = Network.orDefault(in.network());
        } catch (IllegalArgumentException e) {
            throw invalid("Unknown network. Use tempo or solana.");
        }
        boolean hasWallet = in.supplierWallet() != null && !in.supplierWallet().isBlank();
        if (hasWallet && !network.isValidAddress(in.supplierWallet())) {
            throw invalid("The supplier wallet is not a valid " + network.label() + " address.");
        }

        String reference = uniqueReference(invoice);
        String now = now();

        // Supplier: reuse by name. Without a wallet we create a throwaway demo address (public part only);
        // a wallet saved for another network is of no use here.
        Optional<Supplier> existing = repo.findSupplierByName(supplierName);
        String wallet = hasWallet
                ? in.supplierWallet()
                : existing.filter(s -> s.network() == network).map(Supplier::walletAddress).orElseGet(network::randomAddress);
        String country = blankToNull(in.supplierCountry());
        String supplierId;
        if (existing.isPresent()) {
            supplierId = existing.get().id();
            repo.updateSupplier(supplierId, wallet, network, country);
        } else {
            supplierId = "sup_" + randomHex(4);
            repo.insertSupplier(supplierId, supplierName, country, wallet, network, now);
        }

        int feeBps = props.feeBps();
        long fee = Pricing.feeCents(in.amountCents(), feeBps);
        long total = in.amountCents() + fee;
        String id = "ORD-" + randomHex(3).toUpperCase();

        repo.insert(new NewOrder(
                id, reference, supplierId, supplierName, country, wallet, network, invoice, in.amountCents(), blankToNull(in.dueDate()),
                feeBps, fee, total, props.bankFeePct(), props.usdBrl(), Pricing.usdToBrlCents(total, props.usdBrl()),
                OrderStatus.QUOTED, in.extractionSource(), blankToNull(in.invoiceFilename()), false, null, null, null, now));
        event(id, "created", "Invoice " + invoice + ", extraction: " + in.extractionSource() + ", network: " + network.label());
        event(id, "quoted", "Route fee " + feeBps / 100.0 + "%, simulated USD/BRL " + props.usdBrl());
        return get(id);
    }

    // ---------- pay ----------

    public Order pay(String id) {
        Order order = get(id);
        if (!repo.claimForSending(id, now())) {
            throw new OrderException("Order is " + order.status().value() + "; it cannot be paid now.", Code.BAD_STATE);
        }
        event(id, "fiat_received", "Simulated: authorized partner received the BRL payment and bought USD stablecoin");
        event(id, "payment_started", "Sending " + order.amountCents() / 100.0 + " USD (" + order.network().token() + ") on " + order.network().label() + " to " + order.supplierWallet());
        try {
            SentPayment sent = chain.sendPayment(order.network(), order.supplierWallet(), order.amountCents(), order.reference());
            repo.markSent(id, sent.txHash(), sent.blockNumber(), sent.memoHex(), sent.confirmMs(), now());
            event(id, "payment_confirmed", "Tx " + sent.txHash() + " in block " + sent.blockNumber() + ", " + sent.confirmMs() + " ms");
        } catch (ChainException e) {
            repo.releaseClaim(id, e.getMessage(), now());
            event(id, "payment_failed", e.getMessage());
            throw new OrderException(e.getMessage(), Code.CHAIN);
        }
        return get(id);
    }

    // ---------- reconcile ----------

    /**
     * Independent check against the chain, not against what we stored when sending: find the
     * transfer for this supplier and memo on the order's network, then verify token, recipient, amount, memo and
     * receipt before closing the invoice. A transfer (tx hash + log index) can credit only one order.
     */
    public ReconcileResult reconcile(String id) {
        Order order = get(id);
        if (order.status() == OrderStatus.RECONCILED) return ReconcileResult.matched(order);
        if (order.status() != OrderStatus.SENT || order.txHash() == null) {
            throw new OrderException("Only paid orders on the chain can be reconciled.", Code.BAD_STATE);
        }

        List<FoundTransfer> found;
        try {
            long fromBlock = (order.blockNumber() == null ? 0 : order.blockNumber()) - 5;
            found = chain.findTransfers(order.network(), order.supplierWallet(), order.reference(), fromBlock);
        } catch (ChainException e) {
            throw new OrderException(e.getMessage(), Code.CHAIN);
        }

        BigInteger expected = Pricing.centsToUnits(order.amountCents());
        FoundTransfer match = found.stream()
                .filter(t -> order.network().sameHash(t.txHash(), order.txHash()))
                .findFirst()
                .or(() -> found.stream().filter(t -> t.amountUnits().equals(expected)).findFirst())
                .orElse(null);
        if (match == null) {
            event(id, "reconcile_pending", "No matching transfer found on " + order.network().label() + " for this reference yet");
            return ReconcileResult.failed("no_matching_transfer", null);
        }

        boolean receiptOk;
        try {
            receiptOk = chain.transaction(order.network(), match.txHash()).map(t -> "success".equals(t.status())).orElse(false);
        } catch (ChainException e) {
            throw new OrderException(e.getMessage(), Code.CHAIN);
        }
        Recon.Checks checks = new Recon.Checks(
                true, // the chain service only returns transfers of this network's own test stablecoin
                order.network().sameAddress(match.toAddress(), order.supplierWallet()),
                match.amountUnits().equals(expected),
                decodeReference(match.memoHex()).equals(order.reference()),
                receiptOk);
        if (!checks.allPassed()) {
            event(id, "reconcile_mismatch", checks.toString());
            return ReconcileResult.failed("mismatch", checks);
        }
        if (repo.alreadyCredited(match.txHash(), match.logIndex(), id)) {
            event(id, "reconcile_duplicate", "Transfer already credited to another order");
            return ReconcileResult.failed("duplicate", null);
        }

        Recon recon = new Recon(
                match.txHash(), match.logIndex(), match.blockNumber(), now(), order.amountCents(),
                Pricing.unitsToCents(match.amountUnits()), checks);
        repo.markReconciled(id, match.logIndex(), recon);
        event(id, "reconciled", "Matched tx " + match.txHash() + " log " + match.logIndex());
        return ReconcileResult.matched(get(id));
    }

    // ---------- reports and leads ----------

    public String ordersCsv() {
        List<Order> orders = repo.list(5000).reversed();
        StringBuilder sb = new StringBuilder(
                "order_id,payment_reference_memo,supplier,invoice_number,amount_usd,route_fee_usd,total_usd,total_brl_simulated,"
                        + "fx_rate_simulated,status,paid_at_utc,reconciled_at_utc,tx_hash,block,log_index,network,demo_data\n");
        for (Order o : orders) {
            sb.append(String.join(",",
                    csv(o.id()), csv(o.reference()), csv(o.supplierName()), csv(o.invoiceNumber()), money(o.amountCents()),
                    money(o.feeCents()), money(o.totalCents()), o.totalBrlCents() == null ? "" : money(o.totalBrlCents()),
                    o.fxRate() == null ? "" : String.valueOf(o.fxRate()), o.status().value(), csv(o.paidAt()), csv(o.reconciledAt()),
                    csv(o.txHash()), o.blockNumber() == null ? "" : String.valueOf(o.blockNumber()),
                    o.logIndex() == null ? "" : String.valueOf(o.logIndex()),
                    o.txHash() == null ? "" : o.network().label(), o.demo() ? "yes" : "no")).append('\n');
        }
        return sb.toString();
    }

    public void saveLead(String email, Long monthlyUsd, Double bankFeePct, String country, boolean consent) {
        // An email is only stored with explicit consent.
        if (email != null && !email.isBlank() && !consent) throw invalid("Consent is required to store an email.");
        repo.saveLead(blankToNull(email), monthlyUsd, bankFeePct, blankToNull(country), consent, now());
    }

    // ---------- helpers ----------

    /** The reference is the invoice number written into the 32-byte memo; it must be unique per order. */
    private String uniqueReference(String invoice) {
        if (byteLength(invoice) > 32) {
            throw invalid("The invoice number must fit in 32 bytes because it is written into the on-chain memo.");
        }
        for (int n = 1; n < 100; n++) {
            String candidate = n == 1 ? invoice : invoice + "-" + n;
            if (byteLength(candidate) > 32) break;
            if (!repo.referenceExists(candidate)) return candidate;
        }
        throw invalid("Could not derive a unique payment reference for this invoice number.");
    }

    static String decodeReference(String memoHex) {
        byte[] bytes = HexFormat.of().parseHex(memoHex.startsWith("0x") ? memoHex.substring(2) : memoHex);
        int end = bytes.length;
        while (end > 0 && bytes[end - 1] == 0) end--;
        return new String(bytes, 0, end, StandardCharsets.UTF_8);
    }

    private void event(String orderId, String type, String detail) {
        repo.addEvent(orderId, type, detail, now());
    }

    private String now() {
        return clock.instant().toString();
    }

    private static OrderException invalid(String message) {
        return new OrderException(message, Code.INVALID);
    }

    private static int byteLength(String s) {
        return s.getBytes(StandardCharsets.UTF_8).length;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s;
    }

    private static String randomHex(int bytes) {
        byte[] b = new byte[bytes];
        RANDOM.nextBytes(b);
        return HexFormat.of().formatHex(b);
    }

    private static String money(long cents) {
        return "%d.%02d".formatted(cents / 100, Math.abs(cents % 100));
    }

    private static String csv(String v) {
        if (v == null) return "";
        return v.matches(".*[\",\\n\\r].*") ? "\"" + v.replace("\"", "\"\"") + "\"" : v;
    }
}
