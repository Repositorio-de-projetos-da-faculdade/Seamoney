package com.seamoney.rules.service;

/** A sign-in that is refused. Only these carry a message meant for the person; anything else is an unexpected error. */
public class AuthException extends RuntimeException {

    private final boolean locked;

    private AuthException(String message, boolean locked) {
        super(message);
        this.locked = locked;
    }

    public static AuthException invalid(String message) {
        return new AuthException(message, false);
    }

    /** Too many failed attempts: wait and try again. The web app recognises "locked" in the message. */
    public static AuthException locked() {
        return new AuthException("Account is temporarily locked due to too many failed attempts", true);
    }

    public boolean isLocked() {
        return locked;
    }
}
