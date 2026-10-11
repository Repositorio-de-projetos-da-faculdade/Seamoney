package com.seamoney.rules.service;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.seamoney.rules.AppProperties;
import com.seamoney.rules.chain.ChainClient;
import com.seamoney.rules.chain.ChainClient.FoundTransfer;
import com.seamoney.rules.chain.ChainClient.SentPayment;
import com.seamoney.rules.chain.ChainClient.TxInfo;
import com.seamoney.rules.chain.ChainException;
import com.seamoney.rules.domain.Actor;
import com.seamoney.rules.domain.Decision;
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
import com.seamoney.rules.store.SupplierRepository;
import com.seamoney.rules.store.OrderRepository.NewOrder;
import com.seamoney.rules.store.OrderRepository.Supplier;
import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.dao.DuplicateKeyException;
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
            String network,
            String reference) {

        public NewOrderInput(
                String supplierName,
                String supplierCountry,
                String supplierWallet,
                String invoiceNumber,
                long amountCents,
                String dueDate,
                String extractionSource,
                String invoiceFilename,
                String network) {
            this(supplierName, supplierCountry, supplierWallet, invoiceNumber, amountCents, dueDate, extractionSource, invoiceFilename, network, null);
        }

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
            this(supplierName, supplierCountry, supplierWallet, invoiceNumber, amountCents, dueDate, extractionSource, invoiceFilename, null, null);
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

    /** Crockford base32 without the letters that read like digits (I, L, O, U); the same alphabet as the web demo. */
    private static final String REFERENCE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    private static final Pattern REFERENCE = Pattern.compile("^SM-[" + REFERENCE_ALPHABET + "]{8}$");

    private final OrderRepository repo;
    private final SupplierRepository suppliers;
    private final SettingsService settings;
    private final ChainClient chain;
    private final AppProperties props;
    private final Clock clock;

    public OrderService(OrderRepository repo, SupplierRepository suppliers, SettingsService settings, ChainClient chain, AppProperties props, Clock clock) {
        this.repo = repo;
        this.suppliers = suppliers;
        this.settings = settings;
        this.chain = chain;
        this.props = props;
        this.clock = clock;
    }

    // ---------- reads ----------

    public List<Order> list(String orgId, int limit) {
        return repo.list(orgId, Math.min(Math.max(limit, 1), 5000));
    }

    public Order get(String orgId, String id) {
        return repo.find(orgId, id).orElseThrow(() -> new OrderException("Order not found.", Code.NOT_FOUND));
    }

    public List<OrderEvent> events(String orgId, String id) {
        return repo.events(orgId, id);
    }

    public StatsResponse stats(String orgId) {
        return new StatsResponse(repo.stats(orgId), repo.monthly(orgId, 7));
    }

    /** The supplier proof page: a trimmed order plus a live check of the transaction on-chain. */
    public record Proof(ProofOrder order, TxInfo tx) {}

    public Proof proof(String id) {
        Order o = repo.findForProof(id).orElseThrow(() -> new OrderException("Order not found.", Code.NOT_FOUND));
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

    /** Created by the system (tests, tools): the creator is nobody, so any approver may approve it. */
    public Order create(String orgId, NewOrderInput in) {
        return create(orgId, Actor.SYSTEM, in);
    }

    /**
     * Creates and quotes an order. From the approval threshold up it waits for a second person; below it the policy
     * approves it at once, bound to the same data hash a person's approval would be.
     */
    public Order create(String orgId, Actor actor, NewOrderInput in) {
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

        String reference = reference(in.reference());
        String now = now();

        Optional<Supplier> existing = repo.findSupplierByName(orgId, supplierName);
        String country = blankToNull(in.supplierCountry());
        String wallet;
        String supplierId;
        if (existing.isPresent() && suppliers.hasWallets(orgId, existing.get().id())) {
            // a supplier in the wallet registry is paid only at the address a second person approved on this network
            supplierId = existing.get().id();
            wallet = suppliers.approvedAddress(orgId, supplierId, network)
                    .orElseThrow(() -> invalid("This supplier has no approved wallet on " + network.label() + "."));
            if (hasWallet && !network.sameAddress(in.supplierWallet(), wallet)) {
                throw invalid("Payments to this supplier go only to its approved wallet on " + network.label() + ".");
            }
        } else {
            // Supplier outside the registry: reuse by name. Without a wallet we create a throwaway demo address (public
            // part only); a wallet saved for another network is of no use here.
            wallet = hasWallet
                    ? in.supplierWallet()
                    : existing.filter(s -> s.network() == network).map(Supplier::walletAddress).orElseGet(network::randomAddress);
            if (existing.isPresent()) {
                supplierId = existing.get().id();
                repo.updateSupplier(orgId, supplierId, wallet, network, country);
            } else {
                supplierId = "sup_" + randomHex(4);
                repo.insertSupplier(orgId, supplierId, supplierName, country, wallet, network, now);
            }
        }

        int feeBps = props.feeBps();
        long fee = Pricing.feeCents(in.amountCents(), feeBps);
        long total = in.amountCents() + fee;
        String id = "ORD-" + randomHex(3).toUpperCase();
        long threshold = settings.approvalThreshold(orgId);
        boolean needsApproval = in.amountCents() >= threshold;
        Decision policy = needsApproval
                ? null
                : new Decision(null, null, now, approvalHash(in.amountCents(), network, wallet, reference), null, true);

        repo.insert(new NewOrder(
                id, orgId, reference, supplierId, supplierName, country, wallet, network, invoice, in.amountCents(), blankToNull(in.dueDate()),
                feeBps, fee, total, props.bankFeePct(), props.usdBrl(), Pricing.usdToBrlCents(total, props.usdBrl()),
                needsApproval ? OrderStatus.PENDING_APPROVAL : OrderStatus.APPROVED, in.extractionSource(), blankToNull(in.invoiceFilename()),
                false, null, null, null, now, actor.userId(), actor.role(), policy));
        event(orgId, id, "created", "Invoice " + invoice + ", extraction: " + in.extractionSource() + ", network: " + network.label());
        event(orgId, id, "quoted", "Route fee " + feeBps / 100.0 + "%, simulated USD/BRL " + props.usdBrl());
        event(orgId, id, needsApproval ? "approval_requested" : "auto_approved",
                needsApproval ? "Needs a second person from US$ " + threshold / 100 : "Below the approval threshold: approved by the policy");
        return get(orgId, id);
    }

    // ---------- approve, reject, cancel ----------

    /** A second person approves: not the creator, and bound to a hash of the amount, network, wallet and memo. */
    public Order approve(String orgId, Actor actor, String id) {
        Order order = get(orgId, id);
        if (!actor.canApprove()) throw new OrderException("Only owners and approvers approve payments.", Code.FORBIDDEN);
        if (order.status() != OrderStatus.PENDING_APPROVAL) throw new OrderException("Order is " + order.status().value() + "; it is not waiting for approval.", Code.BAD_STATE);
        if (actor.userId() != null && actor.userId().equals(order.createdBy())) {
            throw new OrderException("The person who created a payment cannot approve it.", Code.FORBIDDEN);
        }
        if (!repo.approve(orgId, id, actor, approvalHash(order), now())) throw new OrderException("Order is no longer waiting for approval.", Code.BAD_STATE);
        event(orgId, id, "approved", "Approved by " + actor.role());
        return get(orgId, id);
    }

    public Order reject(String orgId, Actor actor, String id, String reason) {
        Order order = get(orgId, id);
        if (!actor.canApprove()) throw new OrderException("Only owners and approvers reject payments.", Code.FORBIDDEN);
        if (reason == null || reason.isBlank()) throw invalid("Say why the payment is rejected.");
        if (actor.userId() != null && actor.userId().equals(order.createdBy())) {
            throw new OrderException("The person who created a payment cannot reject it; cancel it instead.", Code.FORBIDDEN);
        }
        if (!repo.close(orgId, id, OrderStatus.REJECTED, actor, reason.trim(), now(), List.of(OrderStatus.PENDING_APPROVAL))) {
            throw new OrderException("Order is " + order.status().value() + "; it is not waiting for approval.", Code.BAD_STATE);
        }
        event(orgId, id, "rejected", reason.trim());
        return get(orgId, id);
    }

    /** Before any money moves: owners and approvers cancel any order, an operator only the ones they created. */
    public Order cancel(String orgId, Actor actor, String id, String reason) {
        Order order = get(orgId, id);
        boolean own = actor.userId() != null && actor.userId().equals(order.createdBy());
        if (!actor.canApprove() && !(own && "OPERATOR".equals(actor.role()))) {
            throw new OrderException("Only owners, approvers or the operator who created it can cancel this payment.", Code.FORBIDDEN);
        }
        String why = reason == null ? "" : reason.trim();
        if (!repo.close(orgId, id, OrderStatus.CANCELLED, actor, why, now(), List.of(OrderStatus.PENDING_APPROVAL, OrderStatus.APPROVED))) {
            throw new OrderException("Order is " + order.status().value() + "; only orders not sent yet can be cancelled.", Code.BAD_STATE);
        }
        event(orgId, id, "cancelled", why.isEmpty() ? "Cancelled" : why);
        return get(orgId, id);
    }

    // ---------- pay ----------

    public Order pay(String orgId, String id) {
        Order order = get(orgId, id);
        if (!repo.claimForSending(orgId, id, now())) {
            throw new OrderException("Order is " + order.status().value() + "; it cannot be paid now.", Code.BAD_STATE);
        }
        // the data must still be what was approved (orders approved before approvals were hashed carry no hash)
        Decision approval = order.approval();
        if (approval == null || (approval.dataHash() != null && !approval.dataHash().equals(approvalHash(order)))) {
            repo.releaseClaim(orgId, id, "The payment data no longer matches what was approved.", now());
            throw new OrderException("The payment data no longer matches what was approved.", Code.BAD_STATE);
        }
        event(orgId, id, "fiat_received", "Simulated: authorized partner received the BRL payment and bought USD stablecoin");
        event(orgId, id, "payment_started", "Sending " + order.amountCents() / 100.0 + " USD (" + order.network().token() + ") on " + order.network().label() + " to " + order.supplierWallet());
        try {
            String key = sendAttemptKey(orgId, id);
            SentPayment sent = chain.sendPayment(order.network(), order.supplierWallet(), order.amountCents(), order.reference(), key);
            repo.markSent(orgId, id, sent.txHash(), sent.blockNumber(), sent.memoHex(), sent.confirmMs(), now());
            event(orgId, id, "payment_confirmed", "Tx " + sent.txHash() + " in block " + sent.blockNumber() + ", " + sent.confirmMs() + " ms");
        } catch (ChainException e) {
            repo.releaseClaim(orgId, id, e.getMessage(), now());
            event(orgId, id, "payment_failed", e.getMessage());
            throw new OrderException(e.getMessage(), Code.CHAIN);
        }
        return get(orgId, id);
    }

    /**
     * The Idempotency-Key of this send. The first send is "<id>-1". After a failed send the chain service is asked
     * about the previous key: a payment it marked failed gets a new key; one that may still have reached the chain
     * (a timeout) keeps its key, so the chain service answers with that payment instead of sending a second one.
     */
    private String sendAttemptKey(String orgId, String id) {
        String previous = repo.idempotencyKey(orgId, id);
        String key;
        if (previous == null) {
            key = id + "-1";
        } else if (chain.paymentStatus(previous).filter("failed"::equals).isPresent()) {
            key = id + "-" + (Integer.parseInt(previous.substring(previous.lastIndexOf('-') + 1)) + 1);
        } else {
            return previous;
        }
        repo.setIdempotencyKey(orgId, id, key);
        return key;
    }

    // ---------- reconcile ----------

    /**
     * Independent check against the chain, not against what we stored when sending: find the
     * transfer for this supplier and memo on the order's network, then verify token, recipient, amount, memo and
     * receipt before closing the invoice. A transfer (tx hash + log index) can credit only one order.
     */
    public ReconcileResult reconcile(String orgId, String id) {
        Order order = get(orgId, id);
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

        // The chain service already filtered by recipient and memo; prefer the transfer we sent. Any other one still
        // has to pass every check below, so a wrong amount is reported as a mismatch, never picked around.
        BigInteger expected = Pricing.centsToUnits(order.amountCents());
        FoundTransfer match = found.stream()
                .filter(t -> order.network().sameHash(t.txHash(), order.txHash()))
                .findFirst()
                .or(() -> found.stream().findFirst())
                .orElse(null);
        if (match == null) {
            event(orgId, id, "reconcile_pending", "No matching transfer found on " + order.network().label() + " for this reference yet");
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
            event(orgId, id, "reconcile_mismatch", checks.toString());
            return ReconcileResult.failed("mismatch", checks);
        }
        if (repo.alreadyCredited(match.txHash(), match.logIndex(), id)) {
            event(orgId, id, "reconcile_duplicate", "Transfer already credited to another order");
            return ReconcileResult.failed("duplicate", null);
        }

        Recon recon = new Recon(
                match.txHash(), match.logIndex(), match.blockNumber(), now(), order.amountCents(),
                Pricing.unitsToCents(match.amountUnits()), checks);
        try {
            // false: a concurrent reconciliation closed it first, and that result stands
            if (!repo.markReconciled(orgId, id, match.txHash(), match.logIndex(), recon)) return ReconcileResult.matched(get(orgId, id));
        } catch (DuplicateKeyException e) {
            event(orgId, id, "reconcile_duplicate", "Transfer already credited to another order");
            return ReconcileResult.failed("duplicate", null);
        }
        event(orgId, id, "reconciled", "Matched tx " + match.txHash() + " log " + match.logIndex());
        return ReconcileResult.matched(get(orgId, id));
    }

    // ---------- reports and leads ----------

    public String ordersCsv(String orgId) {
        List<Order> orders = repo.list(orgId, 5000).reversed();
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

    public void saveLead(String orgId, String email, Long monthlyUsd, Double bankFeePct, String country, boolean consent) {
        // An email is only stored with explicit consent.
        if (email != null && !email.isBlank() && !consent) throw invalid("Consent is required to store an email.");
        repo.saveLead(orgId, blankToNull(email), monthlyUsd, bankFeePct, blankToNull(country), consent, now());
    }

    // ---------- helpers ----------

    /**
     * The payment reference written into the public 32-byte memo: an opaque code such as "SM-7K3QX9PA" that says
     * nothing about the invoice, supplier or amount. The invoice number stays in this database only. A client may
     * bring its own code in the same format (the web demo does, so its screens show the memo that went on-chain).
     */
    private String reference(String requested) {
        if (requested != null && !requested.isBlank()) {
            if (!REFERENCE.matcher(requested).matches()) throw invalid("The payment reference must look like SM-7K3QX9PA.");
            if (repo.referenceExists(requested)) throw new OrderException("This payment reference is already used.", Code.BAD_STATE);
            return requested;
        }
        for (int n = 0; n < 10; n++) {
            String candidate = newReference();
            if (!repo.referenceExists(candidate)) return candidate;
        }
        throw new IllegalStateException("Could not draw a free payment reference.");
    }

    /** A fresh opaque reference; 32^8 codes, so a collision is checked for but practically never happens. */
    public static String newReference() {
        StringBuilder sb = new StringBuilder("SM-");
        for (int i = 0; i < 8; i++) sb.append(REFERENCE_ALPHABET.charAt(RANDOM.nextInt(REFERENCE_ALPHABET.length())));
        return sb.toString();
    }

    private static String approvalHash(Order o) {
        return approvalHash(o.amountCents(), o.network(), o.supplierWallet(), o.reference());
    }

    /** SHA-256 of what an approval covers: amount, network, the supplier's wallet and the memo it will carry. */
    static String approvalHash(long amountCents, Network network, String wallet, String reference) {
        try {
            byte[] digest = java.security.MessageDigest.getInstance("SHA-256")
                    .digest((amountCents + "|" + network.value() + "|" + wallet + "|" + reference).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    static String decodeReference(String memoHex) {
        byte[] bytes = HexFormat.of().parseHex(memoHex.startsWith("0x") ? memoHex.substring(2) : memoHex);
        int end = bytes.length;
        while (end > 0 && bytes[end - 1] == 0) end--;
        return new String(bytes, 0, end, StandardCharsets.UTF_8);
    }

    private void event(String orgId, String orderId, String type, String detail) {
        repo.addEvent(orgId, orderId, type, detail, now());
    }

    private String now() {
        return clock.instant().toString();
    }

    private static OrderException invalid(String message) {
        return new OrderException(message, Code.INVALID);
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
