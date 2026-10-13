package com.seamoney.rules.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Optional;
import org.junit.jupiter.api.Test;

class ProofLinksTest {

    private static final String SECRET = "test_jwt_secret_that_needs_to_be_long_enough_for_hs256_alg";
    private final ProofLinks links = new ProofLinks("", SECRET);

    @Test
    void aLinkOpensTheOrderItWasIssuedFor() {
        String link = links.forOrder("ORD-1A2B3C");
        assertTrue(link.startsWith("ORD-1A2B3C."));
        assertEquals(Optional.of("ORD-1A2B3C"), links.orderIdOf(link));
        assertEquals(link, links.forOrder("ORD-1A2B3C"), "the same order always has the same link: nothing is stored");
    }

    @Test
    void theSignatureIs128BitsAndUrlSafe() {
        String signature = links.forOrder("ORD-1A2B3C").substring("ORD-1A2B3C.".length());
        assertEquals(22, signature.length(), "16 bytes in unpadded base64url");
        assertTrue(signature.matches("^[A-Za-z0-9_-]+$"));
    }

    @Test
    void aBareIdAMadeUpSignatureAnotherOrdersSignatureOrJunkOpenNothing() {
        String mine = links.forOrder("ORD-1A2B3C");
        String theirs = links.forOrder("ORD-4D5E6F");
        assertEquals(Optional.empty(), links.orderIdOf("ORD-1A2B3C"));
        assertEquals(Optional.empty(), links.orderIdOf("ORD-1A2B3C."));
        assertEquals(Optional.empty(), links.orderIdOf(".abc"));
        assertEquals(Optional.empty(), links.orderIdOf("ORD-1A2B3C.AAAAAAAAAAAAAAAAAAAAAA"));
        assertEquals(Optional.empty(), links.orderIdOf("ORD-1A2B3C" + theirs.substring(theirs.indexOf('.'))));
        assertEquals(Optional.empty(), links.orderIdOf(mine + "A"));
        assertEquals(Optional.empty(), links.orderIdOf(null));
    }

    @Test
    void aDifferentSecretIssuesLinksTheOtherCannotOpen() {
        ProofLinks other = new ProofLinks("another_secret_that_is_long_enough_for_the_checks", SECRET);
        assertNotEquals(links.forOrder("ORD-1A2B3C"), other.forOrder("ORD-1A2B3C"));
        assertFalse(other.orderIdOf(links.forOrder("ORD-1A2B3C")).isPresent());
    }

    @Test
    void aWeakOrPlaceholderSecretRefusesToStart() {
        assertThrows(IllegalStateException.class, () -> new ProofLinks("", "short"));
        assertThrows(IllegalStateException.class, () -> new ProofLinks("", ""));
        assertThrows(IllegalStateException.class, () -> new ProofLinks("changeme_changeme_changeme_changeme_00", SECRET));
    }
}
