package com.seamoney.rules.domain;

import com.fasterxml.jackson.annotation.JsonValue;

public enum OrderStatus {
    QUOTED("quoted"),
    SENDING("sending"),
    SENT("sent"),
    RECONCILED("reconciled");

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
