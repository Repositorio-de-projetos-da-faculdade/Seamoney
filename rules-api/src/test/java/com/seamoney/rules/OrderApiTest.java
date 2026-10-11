package com.seamoney.rules;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.hamcrest.Matchers.matchesPattern;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.seamoney.rules.chain.ChainClient;
import com.seamoney.rules.chain.ChainClient.FoundTransfer;
import com.seamoney.rules.chain.ChainException;
import com.seamoney.rules.domain.Order;
import com.seamoney.rules.service.OrderService;
import com.seamoney.rules.store.OrderRepository;
import java.math.BigInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import com.seamoney.rules.security.JwtTokenProvider;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest(properties = {"seamoney.seed-demo=false"})
@AutoConfigureMockMvc
@Import(OrderApiTest.TestChain.class)
class OrderApiTest {

    @org.springframework.test.context.DynamicPropertySource
    static void configureProperties(org.springframework.test.context.DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:h2:mem:test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH");
        registry.add("spring.datasource.driver-class-name", () -> "org.h2.Driver");
        registry.add("spring.datasource.username", () -> "sa");
        registry.add("spring.datasource.password", () -> "");
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("seamoney.jwt-secret", () -> "test_jwt_secret_that_needs_to_be_long_enough_for_hs256_alg");
    }

    @TestConfiguration
    static class TestChain {
        @Bean
        @Primary
        FakeChain fakeChain() {
            return new FakeChain();
        }
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired FakeChain chain;
    @Autowired OrderService service;
    @Autowired OrderRepository repo;
    @Autowired JwtTokenProvider jwt;
    @Autowired JdbcTemplate jdbc;
    private String token;

    private static final String OPAQUE_REFERENCE = "^SM-[0-9A-HJKMNP-TV-Z]{8}$";
    private static final String WALLET = "0x75c0281a3261449901b6a60b0C31c1fdfA8D7ff0";

    @BeforeEach
    void reset() {
        jdbc.execute("INSERT INTO organizations (id, name, created_at) VALUES ('org_test', 'Test Org', '2026-10-10') ON CONFLICT DO NOTHING");
        token = jwt.createToken("user1", "org_test", "OWNER");

        chain.transfers.clear();
        chain.failNextPayment = null;
        chain.tamperNextAmount = null;
        chain.timeoutAfterSending = false;
    }

    private String orderBody(String invoice, long cents) {
        return """
               {"supplierName":"Shenzhen Tech Co.","supplierCountry":"CN","supplierWallet":"%s",
                "invoiceNumber":"%s","amountCents":%d,"dueDate":"2026-10-25","extractionSource":"demo"}
               """.formatted(WALLET, invoice, cents);
    }

    private JsonNode createOrder(String invoice, long cents) throws Exception {
        String res = mvc.perform(post("/api/orders").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(orderBody(invoice, cents)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(res).get("order");
    }

    @Test
    void creatingAnOrderQuotesTheRouteAndTheSavings() throws Exception {
        mvc.perform(post("/api/orders").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(orderBody("INV-1", 8_000_000)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.order.status").value("quoted"))
                .andExpect(jsonPath("$.order.reference").value(matchesPattern(OPAQUE_REFERENCE)))
                .andExpect(jsonPath("$.order.feeCents").value(80_000))
                .andExpect(jsonPath("$.order.totalCents").value(8_080_000))
                .andExpect(jsonPath("$.order.bankCostCents").value(240_000))
                .andExpect(jsonPath("$.order.savingsCents").value(160_000))
                .andExpect(jsonPath("$.order.totalBrlCents").value(43_632_000))
                .andExpect(jsonPath("$.order.isDemo").value(false));
    }

    @Test
    void theMemoIsAnOpaqueReferenceNeverTheInvoiceNumber() throws Exception {
        JsonNode first = createOrder("INV-DUP", 100_00);
        JsonNode second = createOrder("INV-DUP", 100_00);
        String a = first.get("reference").asText();
        String b = second.get("reference").asText();
        assertTrue(a.matches(OPAQUE_REFERENCE) && b.matches(OPAQUE_REFERENCE));
        assertNotEquals(a, b, "every order gets its own memo");
        assertEquals("INV-DUP", second.get("invoiceNumber").asText(), "the invoice number stays off-chain, on the order");
    }

    @Test
    void aClientMayBringItsOwnReferenceOnce() throws Exception {
        String body = orderBody("INV-REF", 100_00).replace("\"extractionSource\"", "\"reference\":\"SM-7K3QX9PA\",\"extractionSource\"");
        mvc.perform(post("/api/orders").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.order.reference").value("SM-7K3QX9PA"));
        mvc.perform(post("/api/orders").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/orders").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                        .content(body.replace("SM-7K3QX9PA", "INV-2026-0845")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void payThenReconcileClosesTheInvoice() throws Exception {
        String id = createOrder("INV-2", 8_000_000).get("id").asText();

        mvc.perform(post("/api/orders/{id}/pay", id).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.order.status").value("sent"))
                .andExpect(jsonPath("$.order.txHash").exists())
                .andExpect(jsonPath("$.order.confirmMs").value(1200));

        mvc.perform(post("/api/orders/{id}/reconcile", id).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(true))
                .andExpect(jsonPath("$.order.status").value("reconciled"))
                .andExpect(jsonPath("$.order.recon.checks.token").value(true))
                .andExpect(jsonPath("$.order.recon.checks.recipient").value(true))
                .andExpect(jsonPath("$.order.recon.checks.amount").value(true))
                .andExpect(jsonPath("$.order.recon.checks.memo").value(true))
                .andExpect(jsonPath("$.order.recon.checks.receipt").value(true));

        // reconciling again is harmless
        mvc.perform(post("/api/orders/{id}/reconcile", id).header("Authorization", "Bearer " + token)).andExpect(jsonPath("$.ok").value(true));
    }

    @Test
    void anOrderCannotBePaidTwice() throws Exception {
        String id = createOrder("INV-3", 50_000).get("id").asText();
        mvc.perform(post("/api/orders/{id}/pay", id).header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        mvc.perform(post("/api/orders/{id}/pay", id).header("Authorization", "Bearer " + token))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("bad_state"));
        assertEquals(1, chain.transfers.size(), "only one transfer may reach the chain");
    }

    @Test
    void aFailedPaymentReturnsTheOrderToQuotedAndCanBeRetried() throws Exception {
        String id = createOrder("INV-4", 50_000).get("id").asText();
        chain.failNextPayment = new ChainException("The chain service is unavailable", 502);

        mvc.perform(post("/api/orders/{id}/pay", id).header("Authorization", "Bearer " + token))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("chain"));
        mvc.perform(get("/api/orders/{id}", id).header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.order.status").value("quoted"))
                .andExpect(jsonPath("$.order.error").value("The chain service is unavailable"));

        mvc.perform(post("/api/orders/{id}/pay", id).header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        assertEquals(1, chain.transfers.size());
    }

    @Test
    void aRetryAfterATimeoutDoesNotPayTwice() throws Exception {
        String id = createOrder("INV-TIMEOUT", 50_000).get("id").asText();
        chain.timeoutAfterSending = true; // the transfer lands on-chain, but the answer never arrives

        mvc.perform(post("/api/orders/{id}/pay", id).header("Authorization", "Bearer " + token)).andExpect(status().isBadGateway());
        mvc.perform(post("/api/orders/{id}/pay", id).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.order.txHash").value(chain.transfers.get(0).txHash()));
        assertEquals(1, chain.transfers.size(), "the retry reuses the idempotency key, so nothing is sent twice");
    }

    @Test
    void reconciliationRefusesATransferWithTheWrongAmount() throws Exception {
        String id = createOrder("INV-5", 8_000_000).get("id").asText();
        chain.tamperNextAmount = new BigInteger("79000000000"); // US$ 79,000 on-chain instead of 80,000
        mvc.perform(post("/api/orders/{id}/pay", id).header("Authorization", "Bearer " + token)).andExpect(status().isOk());

        mvc.perform(post("/api/orders/{id}/reconcile", id).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(false))
                .andExpect(jsonPath("$.reason").value("mismatch"))
                .andExpect(jsonPath("$.checks.amount").value(false))
                .andExpect(jsonPath("$.checks.memo").value(true));
        // the invoice stays open: it must not be closed on a payment that does not match
        mvc.perform(get("/api/orders/{id}", id).header("Authorization", "Bearer " + token)).andExpect(jsonPath("$.order.status").value("sent"));
    }

    @Test
    void reconciliationWaitsWhenNoMatchingTransferExistsYet() throws Exception {
        String id = createOrder("INV-6", 8_000_000).get("id").asText();
        mvc.perform(post("/api/orders/{id}/pay", id).header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        chain.transfers.clear(); // the chain does not (yet) show the transfer

        mvc.perform(post("/api/orders/{id}/reconcile", id).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(false))
                .andExpect(jsonPath("$.reason").value("no_matching_transfer"));
    }

    @Test
    void anUnpaidOrderCannotBeReconciled() throws Exception {
        String id = createOrder("INV-7", 8_000_000).get("id").asText();
        mvc.perform(post("/api/orders/{id}/reconcile", id).header("Authorization", "Bearer " + token)).andExpect(status().isConflict());
    }

    @Test
    void aTransferCanCreditOnlyOneOrder() {
        Order a = service.create("org_test", new OrderService.NewOrderInput("Shenzhen Tech Co.", "CN", WALLET, "INV-A", 100_000, null, "manual", null));
        service.pay("org_test", a.id());
        assertTrue(service.reconcile("org_test", a.id()).ok());
        Order paidA = service.get("org_test", a.id());

        Order b = service.create("org_test", new OrderService.NewOrderInput("Shenzhen Tech Co.", "CN", WALLET, "INV-B", 100_000, null, "manual", null));
        // pretend B was paid by the very same on-chain transfer
        repo.claimForSending("org_test", b.id(), "2026-10-10T00:00:00Z");
        repo.markSent("org_test", b.id(), paidA.txHash(), paidA.blockNumber(), FakeChain.memoHex(b.reference()), 1200, "2026-10-10T00:00:00Z");
        chain.transfers.add(new FoundTransfer(
                paidA.txHash(), paidA.recon().logIndex(), paidA.blockNumber(), FakeChain.PARTNER, WALLET,
                new BigInteger("1000000000"), FakeChain.memoHex(b.reference())));

        var result = service.reconcile("org_test", b.id());
        assertFalse(result.ok());
        assertEquals("duplicate", result.reason());
    }

    @Test
    void invalidInputIsRejected() throws Exception {
        mvc.perform(post("/api/orders").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(orderBody("INV-X", -5)))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/orders").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(orderBody("INV-" + "9".repeat(70), 100)))
                .andExpect(status().isBadRequest()); // invoice numbers are capped at 64 characters
        mvc.perform(post("/api/orders").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                        .content(orderBody("INV-Y", 100).replace(WALLET, "0x123")))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/orders").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(orderBody("INV-Z", 200_000_000)))
                .andExpect(status().isBadRequest()); // above the US$ 1,000,000 demo cap
    }

    @Test
    void unknownOrderIs404() throws Exception {
        mvc.perform(get("/api/orders/NOPE").header("Authorization", "Bearer " + token)).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("not_found"));
    }

    @Test
    void calculatorUsesTheSameRulesAsOrders() throws Exception {
        mvc.perform(post("/api/compare").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content("{\"monthlyUsd\":80000,\"bankFeePct\":3}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bankCents").value(240_000))
                .andExpect(jsonPath("$.routeCents").value(80_000))
                .andExpect(jsonPath("$.savingsCents").value(160_000));
    }

    @Test
    void proofPageDataIsVerifiedAgainstTheChain() throws Exception {
        String id = createOrder("INV-P", 100_000).get("id").asText();
        mvc.perform(get("/api/proof/{id}", id).header("Authorization", "Bearer " + token)).andExpect(status().isNotFound()); // not paid yet
        mvc.perform(post("/api/orders/{id}/pay", id).header("Authorization", "Bearer " + token)).andExpect(status().isOk());
        mvc.perform(get("/api/proof/{id}", id).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.order.invoiceNumber").value("INV-P"))
                .andExpect(jsonPath("$.tx.status").value("success"));
    }

    @Test
    void csvExportEscapesAndLabelsEverything() throws Exception {
        mvc.perform(post("/api/orders").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                .content(orderBody("INV-C", 100_000).replace("Shenzhen Tech Co.", "Acme, \\\"Co\\\" Ltd")))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/reports/orders").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/csv"))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"Acme, \"\"Co\"\" Ltd\"")));
    }

    @Test
    void anEmailIsOnlyStoredWithConsent() throws Exception {
        mvc.perform(post("/api/leads").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@b.com\",\"consent\":false}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/leads").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@b.com\",\"monthlyUsd\":80000,\"bankFeePct\":3,\"consent\":true}"))
                .andExpect(status().isCreated());
    }

    @Test
    void healthReportsTheDatabaseAndThePartnerWallet() throws Exception {
        mvc.perform(get("/api/health").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.checks.database").value("ok"))
                .andExpect(jsonPath("$.checks.partnerWallet").value("configured"));
    }

    @Test
    void anOrderOnSolanaIsPaidAndReconciled() throws Exception {
        String solanaWallet = "A8KzP4sZzX8eBqW2qK5cM7dY3nN6yR1tE4xU7iV9oF2p";
        String payload = """
               {"supplierName":"Shenzhen Tech Co.","supplierCountry":"CN","supplierWallet":"%s",
                "invoiceNumber":"INV-SOL", "network":"solana", "amountCents":100000,"dueDate":"2026-10-25","extractionSource":"demo"}
               """.formatted(solanaWallet);

        String res = mvc.perform(post("/api/orders").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String id = json.readTree(res).get("order").get("id").asText();

        mvc.perform(post("/api/orders/{id}/pay", id).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.order.status").value("sent"))
                .andExpect(jsonPath("$.order.txHash").exists())
                .andExpect(jsonPath("$.order.network").value("solana"));

        mvc.perform(post("/api/orders/{id}/reconcile", id).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(true));
    }
}

