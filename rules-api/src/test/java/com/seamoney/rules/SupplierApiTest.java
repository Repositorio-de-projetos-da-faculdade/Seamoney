package com.seamoney.rules;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
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

/** Wallets are proposals until a second person approves them, and orders go only to the approved one. */
@SpringBootTest(properties = {"seamoney.seed-demo=true", "seamoney.approval-threshold-cents=1000000000"})
@AutoConfigureMockMvc
@Import(SupplierApiTest.TestChain.class)
class SupplierApiTest {

    @org.springframework.test.context.DynamicPropertySource
    static void configureProperties(org.springframework.test.context.DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:h2:mem:suppliers;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH");
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

    private static final String V1 = "0x75c0281a3261449901b6a60b0C31c1fdfA8D7ff0";
    private static final String V2 = "0x1111111111111111111111111111111111111111";
    private String operator;
    private String operator2;
    private String approver;

    @BeforeEach
    void tokens() {
        jdbc.execute("INSERT INTO organizations (id, name, created_at) VALUES ('org_s', 'Org S', '2026-10-11') ON CONFLICT DO NOTHING");
        jdbc.execute("INSERT INTO organizations (id, name, created_at) VALUES ('org_seed', 'Org Seed', '2026-10-11') ON CONFLICT DO NOTHING");
        operator = jwt.createToken("u_op", "org_s", "OPERATOR");
        operator2 = jwt.createToken("u_op2", "org_s", "OPERATOR");
        approver = jwt.createToken("u_ap", "org_s", "APPROVER");
    }

    private ResultActions send(String token, String path, String body) throws Exception {
        var req = post(path).header("Authorization", "Bearer " + token);
        if (body != null) req = req.contentType(MediaType.APPLICATION_JSON).content(body);
        return mvc.perform(req);
    }

    private JsonNode addSupplier(String name) throws Exception {
        String res = send(operator, "/api/suppliers", """
                {"name":"%s","country":"CN","city":"Shenzhen","port":"CNSZX","wallet":{"network":"tempo","address":"%s"}}
                """.formatted(name, V1))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(res).path("supplier");
    }

    private ResultActions order(String name, String wallet) throws Exception {
        return send(operator, "/api/orders", """
                {"supplierName":"%s","supplierWallet":"%s","invoiceNumber":"INV-%d","amountCents":100000,"extractionSource":"manual"}
                """.formatted(name, wallet, System.nanoTime()));
    }

    @Test
    void aNewWalletPaysNothingUntilASecondPersonApprovesIt() throws Exception {
        JsonNode s = addSupplier("Guangzhou Textiles");
        String id = s.path("id").asText();
        String wallet = s.path("wallets").get(0).path("id").asText();
        org.junit.jupiter.api.Assertions.assertEquals("proposed", s.path("wallets").get(0).path("status").asText());

        order("Guangzhou Textiles", V1).andExpect(status().isBadRequest());
        send(operator, "/api/suppliers/" + id + "/wallets/" + wallet + "/approve", null).andExpect(status().isForbidden());
        send(approver, "/api/suppliers/" + id + "/wallets/" + wallet + "/approve", null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.supplier.wallets[0].status").value("approved"))
                .andExpect(jsonPath("$.supplier.wallets[0].approvedRole").value("APPROVER"));

        order("Guangzhou Textiles", V1).andExpect(status().isCreated());
        order("Guangzhou Textiles", V2).andExpect(status().isBadRequest()); // not the approved address
    }

    @Test
    void aNewVersionReplacesTheOldOneOnlyWhenApproved() throws Exception {
        JsonNode s = addSupplier("Ningbo Home Goods");
        String id = s.path("id").asText();
        send(approver, "/api/suppliers/" + id + "/wallets/" + s.path("wallets").get(0).path("id").asText() + "/approve", null).andExpect(status().isOk());

        String res = send(operator, "/api/suppliers/" + id + "/wallets", "{\"network\":\"tempo\",\"address\":\"" + V2 + "\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.supplier.wallets[1].version").value(2))
                .andExpect(jsonPath("$.supplier.wallets[1].status").value("proposed"))
                .andReturn().getResponse().getContentAsString();
        String v2 = json.readTree(res).path("supplier").path("wallets").get(1).path("id").asText();
        order("Ningbo Home Goods", V1).andExpect(status().isCreated()); // v1 still in use

        send(approver, "/api/suppliers/" + id + "/wallets/" + v2 + "/approve", null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.supplier.wallets[0].status").value("revoked"))
                .andExpect(jsonPath("$.supplier.wallets[1].status").value("approved"));
        order("Ningbo Home Goods", V1).andExpect(status().isBadRequest());
        order("Ningbo Home Goods", V2).andExpect(status().isCreated());
    }

    @Test
    void aProposerMayWithdrawTheirProposalButNotSomeoneElses() throws Exception {
        JsonNode s = addSupplier("Mumbai Components");
        String path = "/api/suppliers/" + s.path("id").asText() + "/wallets/" + s.path("wallets").get(0).path("id").asText() + "/reject";
        send(operator2, path, null).andExpect(status().isForbidden());
        send(operator, path, null).andExpect(status().isOk()).andExpect(jsonPath("$.supplier.wallets[0].status").value("revoked"));
    }

    @Test
    void theDemoRegistryIsImportedOnceIntoAnEmptyCompany() throws Exception {
        String owner = jwt.createToken("u_own", "org_seed", "OWNER");
        String seed = """
                [{"name":"Hong Kong Electronics","country":"HK","city":"Hong Kong","port":"HKHKG","email":"ar@hk.example",
                  "wallets":[{"network":"tempo","address":"%s","version":1,"status":"revoked"},
                             {"network":"tempo","address":"%s","version":2,"status":"approved"}]}]
                """.formatted(V1, V2);
        send(owner, "/api/suppliers/import-demo", seed).andExpect(status().isOk()).andExpect(jsonPath("$.suppliers[0].wallets.length()").value(2));
        send(owner, "/api/suppliers/import-demo", seed).andExpect(status().isOk()).andExpect(jsonPath("$.suppliers[0].wallets.length()").value(2));
        mvc.perform(get("/api/suppliers").header("Authorization", "Bearer " + owner))
                .andExpect(jsonPath("$.suppliers.length()").value(1))
                .andExpect(jsonPath("$.suppliers[0].wallets[1].status").value("approved"));
        // another company sees none of it
        mvc.perform(get("/api/suppliers").header("Authorization", "Bearer " + approver)).andExpect(jsonPath("$.suppliers[?(@.name == 'Hong Kong Electronics')]").isEmpty());
    }
}
