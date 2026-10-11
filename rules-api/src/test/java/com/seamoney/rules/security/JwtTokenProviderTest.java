package com.seamoney.rules.security;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class JwtTokenProviderTest {

    @Test
    void refusesAMissingShortOrExampleSecret() {
        assertThrows(IllegalStateException.class, () -> new JwtTokenProvider(""));
        assertThrows(IllegalStateException.class, () -> new JwtTokenProvider("short_secret"));
        assertThrows(IllegalStateException.class, () -> new JwtTokenProvider("changeme_in_production_so_it_is_secure"));
        assertThrows(IllegalStateException.class, () -> new JwtTokenProvider("your_secure_jwt_secret_that_should_be_long_enough"));
    }

    @Test
    void acceptsALongRandomSecret() {
        assertDoesNotThrow(() -> new JwtTokenProvider("k3Jf9sQ2mZr7Vx1pLw8eTn4bYc6hUa0dGi5oRs2qWe"));
    }
}
