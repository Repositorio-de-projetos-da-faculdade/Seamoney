package com.seamoney.rules.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class LoginAttemptsTest {

    private static final long T0 = 1_000_000L;

    @Test
    void fiveWrongTriesLockThatEmailAndAddressButNotOthers() {
        LoginAttempts a = new LoginAttempts();
        for (int i = 0; i < LoginAttempts.PER_EMAIL_AND_ADDRESS; i++) {
            assertFalse(a.locked("ana@x.com", "1.1.1.1", T0));
            a.failed("ana@x.com", "1.1.1.1", T0);
        }
        assertTrue(a.locked("ana@x.com", "1.1.1.1", T0));
        assertFalse(a.locked("ana@x.com", "2.2.2.2", T0), "another source is not locked out of the same account");
        assertFalse(a.locked("bia@x.com", "1.1.1.1", T0), "nor is the same source locked out of another account");
    }

    @Test
    void theLockEndsAfterTheWindow() {
        LoginAttempts a = new LoginAttempts();
        for (int i = 0; i < LoginAttempts.PER_EMAIL_AND_ADDRESS; i++) a.failed("ana@x.com", "1.1.1.1", T0);
        assertTrue(a.locked("ana@x.com", "1.1.1.1", T0 + LoginAttempts.WINDOW_MS - 1));
        assertFalse(a.locked("ana@x.com", "1.1.1.1", T0 + LoginAttempts.WINDOW_MS + 1));
    }

    @Test
    void failuresSpreadOverAddressesLockTheEmailEverywhere() {
        LoginAttempts a = new LoginAttempts();
        for (int i = 0; i < LoginAttempts.PER_EMAIL; i++) a.failed("ana@x.com", "10.0.0." + i, T0);
        assertTrue(a.locked("ana@x.com", "9.9.9.9", T0));
    }

    @Test
    void oneAddressTryingManyEmailsIsLockedOut() {
        LoginAttempts a = new LoginAttempts();
        for (int i = 0; i < LoginAttempts.PER_ADDRESS; i++) a.failed("user" + i + "@x.com", "1.1.1.1", T0);
        assertTrue(a.locked("anyone@x.com", "1.1.1.1", T0));
        assertFalse(a.locked("anyone@x.com", "2.2.2.2", T0));
    }

    @Test
    void aGoodPasswordClearsTheCountsOfThatEmailAndSource() {
        LoginAttempts a = new LoginAttempts();
        for (int i = 0; i < LoginAttempts.PER_EMAIL_AND_ADDRESS - 1; i++) a.failed("ana@x.com", "1.1.1.1", T0);
        a.succeeded("ana@x.com", "1.1.1.1");
        a.failed("ana@x.com", "1.1.1.1", T0);
        assertFalse(a.locked("ana@x.com", "1.1.1.1", T0), "the count started again");
    }

    @Test
    void expiredCountersAreDroppedSoTheMemoryDoesNotGrowWithoutEnd() {
        LoginAttempts a = new LoginAttempts();
        for (int i = 0; i < 6_000; i++) a.failed("e" + i + "@x.com", "9.9.9." + (i % 250), T0);
        int before = a.size();
        a.failed("late@x.com", "8.8.8.8", T0 + LoginAttempts.WINDOW_MS + 10);
        assertTrue(a.size() < before, "old counters went away: " + a.size() + " < " + before);
    }
}
