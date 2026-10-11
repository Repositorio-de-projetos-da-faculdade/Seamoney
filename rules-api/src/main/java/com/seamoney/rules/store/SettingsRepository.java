package com.seamoney.rules.store;

import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Settings a company changes for itself. */
@Repository
public class SettingsRepository {

    private final JdbcTemplate jdbc;

    public SettingsRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<Long> approvalThreshold(String orgId) {
        return jdbc.queryForList("SELECT approval_threshold_cents FROM organizations WHERE id = ?", Long.class, orgId)
                .stream().filter(v -> v != null).findFirst();
    }

    public void setApprovalThreshold(String orgId, long cents) {
        jdbc.update("UPDATE organizations SET approval_threshold_cents = ? WHERE id = ?", cents, orgId);
    }
}
