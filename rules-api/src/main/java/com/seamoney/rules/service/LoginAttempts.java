package com.seamoney.rules.service;

import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Failed sign-ins, counted three ways so that guessing a password is slow without letting a stranger lock a person out
 * with a handful of wrong tries:
 * <ul>
 *   <li>per email and address: a few wrong tries lock that source out of that account;</li>
 *   <li>per email, from anywhere: a much higher bar, which still stops a guess spread over many addresses;</li>
 *   <li>per address, whatever the email: stops one source going through many accounts.</li>
 * </ul>
 * Counters live in memory (they reset on restart and are per instance) and expired ones are dropped as it goes.
 */
final class LoginAttempts {

    static final int PER_EMAIL_AND_ADDRESS = 5;
    static final int PER_EMAIL = 20;
    static final int PER_ADDRESS = 30;
    static final long WINDOW_MS = 15 * 60 * 1000L;
    private static final int PURGE_ABOVE = 5_000;

    private static final class Counter {
        int failures;
        long windowStart;
        long lockedUntil;
    }

    private final Map<String, Counter> counters = new ConcurrentHashMap<>();

    boolean locked(String email, String address, long now) {
        return lockedKey(email + "|" + address, now) || lockedKey("e:" + email, now) || lockedKey("a:" + address, now);
    }

    void failed(String email, String address, long now) {
        purge(now);
        count(email + "|" + address, PER_EMAIL_AND_ADDRESS, now);
        count("e:" + email, PER_EMAIL, now);
        count("a:" + address, PER_ADDRESS, now);
    }

    /** A good password clears what was held against this email and source; the per-address count stays. */
    void succeeded(String email, String address) {
        counters.remove(email + "|" + address);
        counters.remove("e:" + email);
    }

    int size() {
        return counters.size();
    }

    private boolean lockedKey(String key, long now) {
        Counter c = counters.get(key);
        return c != null && c.lockedUntil > now;
    }

    private void count(String key, int limit, long now) {
        counters.compute(key, (k, c) -> {
            if (c == null || now - c.windowStart > WINDOW_MS) {
                c = new Counter();
                c.windowStart = now;
            }
            c.failures++;
            if (c.failures >= limit) c.lockedUntil = now + WINDOW_MS;
            return c;
        });
    }

    private void purge(long now) {
        if (counters.size() < PURGE_ABOVE) return;
        Iterator<Map.Entry<String, Counter>> it = counters.entrySet().iterator();
        while (it.hasNext()) {
            Counter c = it.next().getValue();
            if (now - c.windowStart > WINDOW_MS && c.lockedUntil <= now) it.remove();
        }
    }
}
