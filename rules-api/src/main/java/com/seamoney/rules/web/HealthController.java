package com.seamoney.rules.web;

import com.seamoney.rules.chain.ChainClient;
import com.seamoney.rules.chain.ChainClient.ChainHealth;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    private final JdbcTemplate jdbc;
    private final ChainClient chain;

    public HealthController(JdbcTemplate jdbc, ChainClient chain) {
        this.jdbc = jdbc;
        this.chain = chain;
    }

    /** Liveness depends on the database only: a chain outage is reported but must not restart this service. */
    @GetMapping("/api/health")
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, String> checks = new LinkedHashMap<>();
        boolean dbOk;
        try {
            jdbc.queryForObject("SELECT 1", Integer.class);
            dbOk = true;
        } catch (Exception e) {
            dbOk = false;
        }
        checks.put("database", dbOk ? "ok" : "error");
        try {
            ChainHealth h = chain.health();
            checks.put("chainService", "ok");
            checks.put("partnerWallet", h.configured() ? "configured" : "missing");
        } catch (Exception e) {
            checks.put("chainService", "unreachable");
        }
        return ResponseEntity.status(dbOk ? 200 : 503).body(Map.of("ok", dbOk, "checks", checks));
    }
}
