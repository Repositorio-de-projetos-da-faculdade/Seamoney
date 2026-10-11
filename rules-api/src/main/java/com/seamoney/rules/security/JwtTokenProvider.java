package com.seamoney.rules.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;

@Component
public class JwtTokenProvider {

    private final SecretKey key;
    private final long validityInMilliseconds = 3600000; // 1h

    /** Below this many characters, or with a placeholder from the docs, anyone could forge a token: refuse to start. */
    static final int MIN_SECRET_LENGTH = 32;

    public JwtTokenProvider(@Value("${seamoney.jwt-secret:}") String secret) {
        this.key = Keys.hmacShaKeyFor(checkedSecret(secret).getBytes(StandardCharsets.UTF_8));
    }

    static String checkedSecret(String secret) {
        if (secret == null || secret.length() < MIN_SECRET_LENGTH) {
            throw new IllegalStateException("JWT_SECRET must be set to a random string of at least " + MIN_SECRET_LENGTH + " characters.");
        }
        String lower = secret.toLowerCase();
        if (lower.contains("changeme") || lower.startsWith("your_secure")) {
            throw new IllegalStateException("JWT_SECRET still holds the example value; set a random one.");
        }
        return secret;
    }

    public String createToken(String userId, String orgId, String role) {
        Date now = new Date();
        Date validity = new Date(now.getTime() + validityInMilliseconds);

        return Jwts.builder()
                .subject(userId)
                .claim("orgId", orgId)
                .claim("role", role)
                .issuedAt(now)
                .expiration(validity)
                .signWith(key)
                .compact();
    }

    public Authentication getAuthentication(String token) {
        Claims claims = getClaims(token);
        String role = claims.get("role", String.class);
        String orgId = claims.get("orgId", String.class);
        String userId = claims.getSubject();

        // Using role as authority
        List<SimpleGrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
        JwtPrincipal principal = new JwtPrincipal(userId, orgId, role);

        return new UsernamePasswordAuthenticationToken(principal, token, authorities);
    }

    public boolean validateToken(String token) {
        try {
            getClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private Claims getClaims(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
