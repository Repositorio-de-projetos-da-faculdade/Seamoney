package com.seamoney.rules.chain;

/** The chain service refused, failed, or could not be reached. */
public class ChainException extends RuntimeException {

    private final int status;

    public ChainException(String message, int status) {
        super(message);
        this.status = status;
    }

    public ChainException(String message, Throwable cause) {
        super(message, cause);
        this.status = 0;
    }

    /** HTTP status returned by the chain service, or 0 when it was unreachable. */
    public int status() {
        return status;
    }
}
