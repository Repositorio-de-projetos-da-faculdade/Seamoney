package com.seamoney.rules.service;

public class OrderException extends RuntimeException {

    public enum Code {
        NOT_FOUND("not_found", 404),
        FORBIDDEN("forbidden", 403),
        BAD_STATE("bad_state", 409),
        INVALID("invalid", 400),
        CHAIN("chain", 502);

        private final String value;
        private final int httpStatus;

        Code(String value, int httpStatus) {
            this.value = value;
            this.httpStatus = httpStatus;
        }

        public String value() {
            return value;
        }

        public int httpStatus() {
            return httpStatus;
        }
    }

    private final Code code;

    public OrderException(String message, Code code) {
        super(message);
        this.code = code;
    }

    public Code code() {
        return code;
    }
}
