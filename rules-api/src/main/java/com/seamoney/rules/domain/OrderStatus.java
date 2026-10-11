package com.seamoney.rules.domain;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * pending_approval -> approved -> sending -> sent -> reconciled. Below the approval threshold an order is approved by
 * the policy at creation. Before anything is sent an order can end as rejected (by an approver) or cancelled.
 */
public enum OrderStatus {
    PENDING_APPROVAL("pending_approval"),
    APPROVED("approved"),
    SENDING("sending"),
    SENT("sent"),
    RECONCILED("reconciled"),
    REJECTED("rejected"),
    CANCELLED("cancelled");

    private final String value;

    OrderStatus(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }

    public static OrderStatus fromValue(String value) {
        for (OrderStatus s : values()) {
            if (s.value.equals(value)) return s;
        }
        throw new IllegalArgumentException("Unknown order status: " + value);
    }
}
