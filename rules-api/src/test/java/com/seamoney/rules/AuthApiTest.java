package com.seamoney.rules;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;


import com.fasterxml.jackson.databind.ObjectMapper;
import com.seamoney.rules.security.JwtTokenProvider;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {"seamoney.seed-demo=false"})
@AutoConfigureMockMvc
class AuthApiTest {

    @org.springframework.test.context.DynamicPropertySource
    static void configureProperties(org.springframework.test.context.DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:h2:mem:test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH");
        registry.add("spring.datasource.driver-class-name", () -> "org.h2.Driver");
        registry.add("spring.datasource.username", () -> "sa");
        registry.add("spring.datasource.password", () -> "");
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("seamoney.jwt-secret", () -> "test_jwt_secret_that_needs_to_be_long_enough_for_hs256_alg");
    }

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired PasswordEncoder encoder;
    @Autowired JwtTokenProvider jwt;
    @Autowired ObjectMapper json;

    @BeforeEach
    void setup() {
        jdbc.execute("DELETE FROM order_events");
        jdbc.execute("DELETE FROM orders");
        jdbc.execute("DELETE FROM suppliers");
        jdbc.execute("DELETE FROM audit_log");
        jdbc.execute("DELETE FROM memberships");
        jdbc.execute("DELETE FROM users");
        jdbc.execute("DELETE FROM organizations");

        String pass = encoder.encode("password");
        jdbc.update("INSERT INTO organizations (id, name, created_at) VALUES ('org_A', 'Org A', '2026-10-10')");
        jdbc.update("INSERT INTO organizations (id, name, created_at) VALUES ('org_B', 'Org B', '2026-10-10')");
        
        jdbc.update("INSERT INTO users (id, email, password_hash, created_at) VALUES ('usr_1', 'ownerA@test.com', ?, '2026-10-10')", pass);
        jdbc.update("INSERT INTO memberships (user_id, organization_id, role, status) VALUES ('usr_1', 'org_A', 'OWNER', 'ACTIVE')");
        
        jdbc.update("INSERT INTO users (id, email, password_hash, created_at) VALUES ('usr_2', 'ownerB@test.com', ?, '2026-10-10')", pass);
        jdbc.update("INSERT INTO memberships (user_id, organization_id, role, status) VALUES ('usr_2', 'org_B', 'OWNER', 'ACTIVE')");
        
        jdbc.update("INSERT INTO users (id, email, password_hash, created_at) VALUES ('usr_3', 'acctA@test.com', ?, '2026-10-10')", pass);
        jdbc.update("INSERT INTO memberships (user_id, organization_id, role, status) VALUES ('usr_3', 'org_A', 'ACCOUNTANT', 'ACTIVE')");
    }

    @Test
    void loginOk() throws Exception {
        mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"ownerA@test.com\",\"password\":\"password\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists());
                
        int auditCount = jdbc.queryForObject("SELECT COUNT(*) FROM audit_log WHERE action = 'LOGIN'", Integer.class);
        assertTrue(auditCount > 0);
    }

    @Test
    void theAuditTrailShowsTheCompanysSignInsAndFailedAttemptsOnly() throws Exception {
        String ok = "{\"email\":\"ownerA@test.com\",\"password\":\"password\"}";
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(ok)).andExpect(status().isOk());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"ownerA@test.com\",\"password\":\"nope\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"ownerB@test.com\",\"password\":\"password\"}"))
                .andExpect(status().isOk());

        String acct = jwt.createToken("usr_3", "org_A", "ACCOUNTANT");
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/audit").header("Authorization", "Bearer " + acct))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entries[?(@.action == 'LOGIN' && @.actorEmail == 'ownerA@test.com')]").isNotEmpty())
                .andExpect(jsonPath("$.entries[?(@.action == 'LOGIN_FAILED' && @.actorEmail == 'ownerA@test.com')]").isNotEmpty())
                .andExpect(jsonPath("$.entries[?(@.actorEmail == 'ownerB@test.com')]").isEmpty());
    }

    @Test
    void loginFailAndBlock() throws Exception {
        for (int i=0; i<5; i++) {
            mvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"ownerA@test.com\",\"password\":\"wrong\"}"))
                    .andExpect(status().isUnauthorized());
        }
        
        // 6th attempt should return 401 with lockout message
        mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"ownerA@test.com\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Account is temporarily locked due to too many failed attempts"));
    }

    @Test
    void tokenExpiredOrTampered() throws Exception {
        mvc.perform(get("/api/orders").header("Authorization", "Bearer invalid.token.here"))
                .andExpect(status().isUnauthorized()); // no valid session: 401, so the web app sends the person back to sign in
        mvc.perform(get("/api/orders")).andExpect(status().isUnauthorized());
    }

    @Test
    void roleWithoutPermission() throws Exception {
        String tokenAcct = jwt.createToken("usr_3", "org_A", "ACCOUNTANT");
        
        // Accountant cannot create payment
        mvc.perform(post("/api/orders").header("Authorization", "Bearer " + tokenAcct)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"supplierName\":\"Sup\",\"supplierCountry\":\"CN\",\"invoiceNumber\":\"INV\",\"amountCents\":1000,\"extractionSource\":\"demo\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void isolationBetweenCompanies() throws Exception {
        String tokenA = jwt.createToken("usr_1", "org_A", "OWNER");
        String tokenB = jwt.createToken("usr_2", "org_B", "OWNER");

        // A creates order
        String res = mvc.perform(post("/api/orders").header("Authorization", "Bearer " + tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"supplierName\":\"Sup\",\"supplierCountry\":\"CN\",\"invoiceNumber\":\"INV\",\"amountCents\":1000,\"extractionSource\":\"demo\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        
        String orderId = json.readTree(res).get("order").get("id").asText();

        // B tries to read A's order -> NOT FOUND or empty
        mvc.perform(get("/api/orders/" + orderId).header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound()); // Or whatever your error handler returns. If order is not found, get() throws NOT_FOUND

        // B tries to pay A's order -> NOT FOUND
        mvc.perform(post("/api/orders/" + orderId + "/pay").header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());
    }
}
