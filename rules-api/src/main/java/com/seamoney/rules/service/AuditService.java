package com.seamoney.rules.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.util.List;

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

    /** One line of the company's audit trail as the web app reads it; the IP address stays in the database. */
    public record Entry(long id, String at, String actorEmail, String actorRole, String action, String entityType, String entityId, String before, String after) {}

    /** The company's latest entries, newest first, with who did it (email and role in the company). */
    public List<Entry> recent(String orgId, int limit) {
        return jdbc.query(
                """
                SELECT a.*, COALESCE(a.actor_email, u.email) AS email, m.role AS member_role
                FROM audit_log a
                LEFT JOIN users u ON u.id = a.actor_id
                LEFT JOIN memberships m ON m.user_id = a.actor_id AND m.organization_id = a.organization_id
                WHERE a.organization_id = ?
                   -- a failed sign-in has no company yet: show it to the companies of that email
                   OR (a.organization_id IS NULL AND a.action = 'LOGIN_FAILED' AND a.actor_email IN (
                        SELECT uu.email FROM users uu JOIN memberships mm ON mm.user_id = uu.id WHERE mm.organization_id = ?))
                ORDER BY a.id DESC LIMIT ?
                """,
                (rs, i) -> new Entry(rs.getLong("id"), rs.getString("created_at"), rs.getString("email"), rs.getString("member_role"), rs.getString("action"),
                        rs.getString("entity_type"), rs.getString("entity_id"), rs.getString("before_state"), rs.getString("after_state")),
                orgId, orgId, Math.min(Math.max(limit, 1), 500));
    }

    private void insert(String orgId, String actorId, String actorEmail, String action, String entityType, String entityId, String beforeState, String afterState, String ip) {
        jdbc.update("INSERT INTO audit_log (organization_id, actor_id, actor_email, action, entity_type, entity_id, before_state, after_state, ip_address, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
                orgId, actorId, actorEmail, action, entityType, entityId, beforeState, afterState, ip, clock.instant().toString());
    }
}
