package com.seamoney.rules.domain;

/** Who does something to an order: the signed-in user and the role they hold in the company. */
public record Actor(String userId, String role) {

    /** Work done by the system itself (seed data, background jobs). */
    public static final Actor SYSTEM = new Actor(null, null);

    public boolean canApprove() {
        return "OWNER".equals(role) || "APPROVER".equals(role);
    }
}
