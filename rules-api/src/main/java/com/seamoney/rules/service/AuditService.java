package com.seamoney.rules.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Clock;

@Service
public class AuditService {

    private final JdbcTemplate jdbc;
    private final Clock clock;

    public AuditService(JdbcTemplate jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    public void logFailedLogin(String email, String ip) {
        insert(null, null, email, "LOGIN_FAILED", "USER", null, null, null, ip);
    }

    public void logLogin(String userId, String email, String orgId, String ip) {
        insert(orgId, userId, email, "LOGIN", "USER", userId, null, null, ip);
    }

    public void logSwitchOrganization(String userId, String oldOrgId, String newOrgId, String ip) {
        insert(newOrgId, userId, null, "SWITCH_ORG", "ORGANIZATION", newOrgId, oldOrgId, newOrgId, ip);
    }

    public void logWrite(String orgId, String userId, String action, String entityType, String entityId, String beforeState, String afterState) {
        insert(orgId, userId, null, action, entityType, entityId, beforeState, afterState, null);
    }

    private void insert(String orgId, String actorId, String actorEmail, String action, String entityType, String entityId, String beforeState, String afterState, String ip) {
        jdbc.update("INSERT INTO audit_log (organization_id, actor_id, actor_email, action, entity_type, entity_id, before_state, after_state, ip_address, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                orgId, actorId, actorEmail, action, entityType, entityId, beforeState, afterState, ip, clock.instant().toString());
    }
}
