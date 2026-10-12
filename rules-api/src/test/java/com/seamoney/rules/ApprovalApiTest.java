package com.seamoney.rules;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.seamoney.rules.security.JwtTokenProvider;
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
import org.springframework.test.web.servlet.ResultActions;

/** Two people per payment: from the threshold (US$ 10,000 here) up, someone other than the creator approves. */
@SpringBootTest(properties = {"seamoney.seed-demo=false", "seamoney.approval-threshold-cents=1000000"})
@AutoConfigureMockMvc
@Import(ApprovalApiTest.TestChain.class)
class ApprovalApiTest {

    @org.springframework.test.context.DynamicPropertySource
    static void configureProperties(org.springframework.test.context.DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:h2:mem:approvals;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH");
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
    @Autowired JwtTokenProvider jwt;
    @Autowired JdbcTemplate jdbc;

    private static final String WALLET = "0x75c0281a3261449901b6a60b0C31c1fdfA8D7ff0";
    private String operator;
    private String operator2;
    private String approver;
    private String approver2;

    @BeforeEach
    void tokens() {
        jdbc.execute("INSERT INTO organizations (id, name, created_at) VALUES ('org_a', 'Org A', '2026-10-11') ON CONFLICT DO NOTHING");
        operator = jwt.createToken("u_op", "org_a", "OPERATOR");
        operator2 = jwt.createToken("u_op2", "org_a", "OPERATOR");
        approver = jwt.createToken("u_ap", "org_a", "APPROVER");
        approver2 = jwt.createToken("u_ap2", "org_a", "APPROVER");
    }

    private String create(String token, long cents) throws Exception {
        String body = """
               {"supplierName":"Shenzhen Tech Co.","supplierCountry":"CN","supplierWallet":"%s",
                "invoiceNumber":"INV-%d","amountCents":%d,"extractionSource":"manual"}
               """.formatted(WALLET, System.nanoTime(), cents);
        String res = mvc.perform(post("/api/orders").header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(res).path("order").path("id").asText();
    }

    private ResultActions act(String token, String id, String action, String reason) throws Exception {
        var req = post("/api/orders/{id}/" + action, id).header("Authorization", "Bearer " + token);
        if (reason != null) req = req.contentType(MediaType.APPLICATION_JSON).content("{\"reason\":\"" + reason + "\"}");
        return mvc.perform(req);
    }

    @Test
    void fromTheThresholdUpASecondPersonApprovesBeforeAnythingIsSent() throws Exception {
        String id = create(operator, 8_000_000);
        act(approver, id, "pay", null).andExpect(status().isConflict()); // still waiting for approval
        act(operator, id, "approve", null).andExpect(status().isForbidden());
        act(operator, id, "pay", null).andExpect(status().isForbidden());

        act(approver, id, "approve", null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.order.status").value("approved"))
                .andExpect(jsonPath("$.order.createdRole").value("OPERATOR"))
                .andExpect(jsonPath("$.order.approval.by").value("u_ap"))
                .andExpect(jsonPath("$.order.approval.auto").value(false))
                .andExpect(jsonPath("$.order.approval.dataHash").isNotEmpty());
        act(approver, id, "pay", null).andExpect(status().isOk()).andExpect(jsonPath("$.order.status").value("sent"));
    }

    @Test
    void anOwnerSetsTheCompanysThresholdAndNobodyElseCan() throws Exception {
        jdbc.execute("INSERT INTO organizations (id, name, created_at) VALUES ('org_t', 'Org T', '2026-10-11') ON CONFLICT DO NOTHING");
        String owner = jwt.createToken("u_own", "org_t", "OWNER");
        String approverT = jwt.createToken("u_apt", "org_t", "APPROVER");
        String body = "{\"approvalThresholdCents\": 10000000}"; // US$ 100,000
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/settings").header("Authorization", "Bearer " + approverT)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isForbidden());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/settings").header("Authorization", "Bearer " + owner)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.approvalThresholdCents").value(10000000));
        String id = create(owner, 8_000_000); // US$ 80,000 is now below the company's threshold
        act(approverT, id, "pay", null).andExpect(status().isOk());
        create(operator, 8_000_000); // org_a keeps the service default
    }

    @Test
    void belowTheThresholdThePolicyApprovesAtOnce() throws Exception {
        String id = create(operator, 50_000);
        act(approver, id, "approve", null).andExpect(status().isConflict()); // nothing to approve
        act(approver, id, "pay", null).andExpect(status().isOk()).andExpect(jsonPath("$.order.approval.auto").value(true));
    }

    @Test
    void whoCreatedAPaymentCannotApproveOrRejectIt() throws Exception {
        String id = create(approver, 8_000_000);
        act(approver, id, "approve", null).andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("forbidden"));
        act(approver, id, "reject", "no").andExpect(status().isForbidden());
        act(approver2, id, "approve", null).andExpect(status().isOk());
    }

    @Test
    void aRejectionNeedsAReasonAndEndsTheOrder() throws Exception {
        String id = create(operator, 8_000_000);
        act(approver, id, "reject", "").andExpect(status().isBadRequest());
        act(approver, id, "reject", "Wrong supplier")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.order.status").value("rejected"))
                .andExpect(jsonPath("$.order.closure.reason").value("Wrong supplier"));
        act(approver2, id, "approve", null).andExpect(status().isConflict());
    }

    @Test
    void anOperatorCancelsOnlyTheirOwnOrdersAndNothingAfterSending() throws Exception {
        String id = create(operator, 8_000_000);
        act(operator2, id, "cancel", "not mine").andExpect(status().isForbidden());
        act(operator, id, "cancel", "Duplicate").andExpect(status().isOk()).andExpect(jsonPath("$.order.status").value("cancelled"));

        String sent = create(operator, 50_000);
        act(approver, sent, "pay", null).andExpect(status().isOk());
        act(approver, sent, "cancel", null).andExpect(status().isConflict());
    }
}
