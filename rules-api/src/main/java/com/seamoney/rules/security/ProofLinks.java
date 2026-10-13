package com.seamoney.rules.security;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Optional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * The public proof page is reached by a link, so the link must not be guessable. An order id alone is short (and not
 * secret: it is shown in the app), so the link is "{order id}.{signature}", the signature being an HMAC of the id
 * under a server secret. Nothing is stored: an order's link can always be computed again, and a link for an id that
 * was never issued cannot be forged without the secret.
 */
@Component
public class ProofLinks {

    private static final int SIGNATURE_BYTES = 16; // 128 bits
    private final byte[] key;

    public ProofLinks(@Value("${seamoney.proof-secret:}") String proofSecret, @Value("${seamoney.jwt-secret:}") String jwtSecret) {
        String secret = proofSecret == null || proofSecret.isBlank() ? JwtTokenProvider.checkedSecret(jwtSecret) : JwtTokenProvider.checkedSecret(proofSecret);
        this.key = hmac(secret.getBytes(StandardCharsets.UTF_8), "seamoney-proof-link-v1");
    }

    /** The link id of an order: what goes after /proof/. */
    public String forOrder(String orderId) {
        return orderId + "." + signature(orderId);
    }

    /** The order id behind a link id, or empty when the signature does not match. */
    public Optional<String> orderIdOf(String proofId) {
        if (proofId == null) return Optional.empty();
        int dot = proofId.lastIndexOf('.');
        if (dot <= 0 || dot == proofId.length() - 1) return Optional.empty();
        String orderId = proofId.substring(0, dot);
        byte[] given = proofId.substring(dot + 1).getBytes(StandardCharsets.UTF_8);
        byte[] expected = signature(orderId).getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(given, expected) ? Optional.of(orderId) : Optional.empty();
    }

    private String signature(String orderId) {
        byte[] mac = hmac(key, orderId);
        byte[] cut = new byte[SIGNATURE_BYTES];
        System.arraycopy(mac, 0, cut, 0, SIGNATURE_BYTES);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(cut);
    }

    private static byte[] hmac(byte[] key, String message) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal(message.getBytes(StandardCharsets.UTF_8));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }
}
