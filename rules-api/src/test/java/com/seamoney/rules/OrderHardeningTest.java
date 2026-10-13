package com.seamoney.rules;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.seamoney.rules.domain.Order;
import com.seamoney.rules.domain.OrderStatus;
import com.seamoney.rules.security.JwtTokenProvider;
import com.seamoney.rules.service.OrderException;
import com.seamoney.rules.service.OrderService;
import com.seamoney.rules.store.OrderRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Recovery of orders stuck in `sending`, and the spreadsheet export. Each test makes its own order, and the
 * background job is off in tests, so nothing here depends on timing.
 */
@SpringBootTest(properties = {"seamoney.seed-demo=false", "seamoney.approval-threshold-cents=1000000000"})
@AutoConfigureMockMvc
@Import(OrderHardeningTest.TestChain.class)
class OrderHardeningTest {

    @org.springframework.test.context.DynamicPropertySource
    static void configureProperties(org.springframework.test.context.DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:h2:mem:hardening;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH");
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

    private static final String ORG = "org_hard";
    private static final String WALLET = "0x75c0281a3261449901b6a60b0C31c1fdfA8D7ff0";
    private static final String LONG_AGO = "2026-10-01T00:00:00Z";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired FakeChain chain;
    @Autowired OrderService service;
    @Autowired OrderRepository repo;
    @Autowired JwtTokenProvider jwt;
    @Autowired JdbcTemplate jdbc;
    private String owner;
    private String operator;

    @BeforeEach
    void setup() {
        jdbc.execute("INSERT INTO organizations (id, name, created_at) VALUES ('" + ORG + "', 'Hardening Org', '2026-10-12') ON CONFLICT DO NOTHING");
        owner = jwt.createToken("u_owner", ORG, "OWNER");
        operator = jwt.createToken("u_operator", ORG, "OPERATOR");
        chain.transfers.clear();
        chain.failNextPayment = null;
        chain.tamperNextAmount = null;
        chain.timeoutAfterSending = false;
    }

    private String body(String supplier, String invoice) {
        return """
               {"supplierName":"%s","supplierCountry":"CN","supplierWallet":"%s",
                "invoiceNumber":"%s","amountCents":50000,"dueDate":"2026-10-25","extractionSource":"demo"}
               """.formatted(supplier, WALLET, invoice);
    }

    private JsonNode create(String supplier, String invoice) throws Exception {
        String res = mvc.perform(post("/api/orders").header("Authorization", "Bearer " + owner).contentType(MediaType.APPLICATION_JSON).content(body(supplier, invoice)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(res).get("order");
    }

    /** An order whose send began at `since` and was never finished. */
    private Order stuck(String invoice, String since) throws Exception {
        String id = create("Hardening Supplier", invoice).get("id").asText();
        repo.claimForSending(ORG, id, since);
        jdbc.update("UPDATE orders SET updated_at = ? WHERE id = ?", since, id);
        return repo.find(ORG, id).orElseThrow();
    }

    private void reachTheChain(Order o, String key) {
        repo.setIdempotencyKey(ORG, o.id(), key);
        chain.sendPayment(o.network(), o.supplierWallet(), o.amountCents(), o.reference(), key);
    }

    @Test
    void aPaymentThatReachedTheChainButWasNeverRecordedIsRecoveredAndNotSentAgain() throws Exception {
        Order o = stuck("INV-R1", LONG_AGO);
        reachTheChain(o, o.id() + "-1"); // on the chain; the service stopped before it wrote that down

        Order recovered = service.recover(ORG, o.id(), Duration.ZERO);

        assertEquals(OrderStatus.SENT, recovered.status());
        assertEquals(chain.transfers.get(0).txHash(), recovered.txHash());
        assertNull(recovered.confirmMs(), "a payment found afterwards has no confirmation time, and must not skew the average");
        assertEquals(1, chain.transfers.size());
        assertTrue(repo.events(ORG, o.id()).stream().anyMatch(e -> e.type().equals("payment_recovered")));
        // and it reconciles like any other sent payment
        mvc.perform(post("/api/orders/{id}/reconcile", o.id()).header("Authorization", "Bearer " + owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(true));
    }

    @Test
    void aSendThatNeverReachedTheChainGoesBackToApprovedAndPaysOnce() throws Exception {
        Order o = stuck("INV-R2", LONG_AGO); // died before even choosing an idempotency key

        assertEquals(OrderStatus.APPROVED, service.recover(ORG, o.id(), Duration.ZERO).status());
        assertTrue(chain.transfers.isEmpty());

        mvc.perform(post("/api/orders/{id}/pay", o.id()).header("Authorization", "Bearer " + owner)).andExpect(status().isOk());
        assertEquals(1, chain.transfers.size());
    }

    @Test
    void anAttemptThatFailedGoesBackToApproved() throws Exception {
        Order o = stuck("INV-R3", LONG_AGO);
        repo.setIdempotencyKey(ORG, o.id(), o.id() + "-1");
        chain.rememberFailed(o.id() + "-1");

        assertEquals(OrderStatus.APPROVED, service.recover(ORG, o.id(), Duration.ZERO).status());
    }

    @Test
    void anAttemptThatMayStillLandKeepsWaitingAndIsRecoveredWhenItShows() throws Exception {
        Order o = stuck("INV-R4", LONG_AGO);
        repo.setIdempotencyKey(ORG, o.id(), o.id() + "-1");
        chain.rememberPending(o.id() + "-1"); // the chain service has it as pending, and nothing is on the chain yet

        assertEquals(OrderStatus.SENDING, service.recover(ORG, o.id(), Duration.ZERO).status());
        assertTrue(repo.events(ORG, o.id()).stream().anyMatch(e -> e.type().equals("recovery_waiting")));
        assertTrue(chain.transfers.isEmpty(), "waiting never sends");

        chain.sendPayment(o.network(), o.supplierWallet(), o.amountCents(), o.reference(), "someone-else"); // it lands
        assertEquals(OrderStatus.SENT, service.recover(ORG, o.id(), Duration.ZERO).status());
    }

    @Test
    void recoveryLeavesAliveSendsAndOrdersInOtherStatesAlone() throws Exception {
        String approved = create("Hardening Supplier", "INV-R5").get("id").asText();
        assertBadState(() -> service.recover(ORG, approved, Duration.ZERO)); // not in sending

        Order young = stuck("INV-R6", Instant.now().toString());
        assertBadState(() -> service.recover(ORG, young.id(), Duration.ofMinutes(5))); // still being sent
        assertEquals(OrderStatus.SENDING, repo.find(ORG, young.id()).orElseThrow().status());
    }

    @Test
    void theBackgroundPassSettlesOnlyOrdersThatAreStale() throws Exception {
        Order stale = stuck("INV-R7", LONG_AGO);
        Order young = stuck("INV-R8", Instant.now().toString());

        assertTrue(service.recoverStuck(Duration.ofSeconds(90)) >= 1);

        assertEquals(OrderStatus.APPROVED, repo.find(ORG, stale.id()).orElseThrow().status());
        assertEquals(OrderStatus.SENDING, repo.find(ORG, young.id()).orElseThrow().status());
    }

    @Test
    void theRecoverEndpointIsForOwnersAndApproversOnly() throws Exception {
        Order o = stuck("INV-R9", LONG_AGO);
        mvc.perform(post("/api/orders/{id}/recover", o.id()).header("Authorization", "Bearer " + operator)).andExpect(status().isForbidden());
        mvc.perform(post("/api/orders/{id}/recover", o.id()).header("Authorization", "Bearer " + owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.order.status").value("approved"));
        mvc.perform(post("/api/orders/{id}/recover", o.id()).header("Authorization", "Bearer " + owner)).andExpect(status().isConflict()); // not stuck any more
    }

    @Test
    void aReleaseOrASentMarkNeverOverwritesAnOrderThatMovedOn() throws Exception {
        String id = create("Hardening Supplier", "INV-R10").get("id").asText();
        mvc.perform(post("/api/orders/{id}/pay", id).header("Authorization", "Bearer " + owner)).andExpect(status().isOk());

        repo.releaseClaim(ORG, id, "late release", Instant.now().toString()); // the order is sent: this must do nothing
        assertEquals(OrderStatus.SENT, repo.find(ORG, id).orElseThrow().status());
        repo.markSent(ORG, id, "0xother", 1, "0x00", null, Instant.now().toString()); // and so must this
        assertFalse("0xother".equals(repo.find(ORG, id).orElseThrow().txHash()));
    }

    @Test
    void theCsvDefusesCellsThatAFormulaCouldRunFrom() throws Exception {
        create("=HYPERLINK(\\\"http://evil.example\\\",\\\"x\\\")", "INV-F1");
        create("Normal Supplier", "-2+3");
        create("Another Supplier", "@SUM(A1)");
        create("Plain Supplier", "+cmd");

        String csv = mvc.perform(get("/api/reports/orders").header("Authorization", "Bearer " + owner))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        assertTrue(csv.contains("\"'=HYPERLINK(\"\"http://evil.example\"\""), csv);
        assertTrue(csv.contains(",'-2+3,"), csv);
        assertTrue(csv.contains(",'@SUM(A1),"), csv);
        assertTrue(csv.contains(",'+cmd,"), csv);
        assertFalse(csv.contains(",=HYPERLINK"), csv);
        for (String line : List.of(csv.split("\n"))) {
            for (String cell : line.split(",")) assertFalse(cell.startsWith("=") || cell.startsWith("@"), "formula cell: " + cell);
        }
    }

    @Test
    void everyOrderGetsItsOwnIdAndALinkOnlyThePayingCompanyKnows() throws Exception {
        JsonNode a = create("Hardening Supplier", "INV-U1");
        JsonNode b = create("Hardening Supplier", "INV-U2");
        assertFalse(a.get("id").asText().equals(b.get("id").asText()));
        assertFalse(a.get("proofId").asText().equals(b.get("proofId").asText()));
        assertTrue(a.get("id").asText().matches("^ORD-[0-9A-F]{6}$"));
    }

    private interface Action {
        void run() throws Exception;
    }

    private static void assertBadState(Action action) {
        OrderException e = org.junit.jupiter.api.Assertions.assertThrows(OrderException.class, action::run);
        assertEquals(OrderException.Code.BAD_STATE, e.code());
    }
}
