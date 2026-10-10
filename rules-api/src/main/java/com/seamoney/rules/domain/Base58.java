package com.seamoney.rules.domain;

import java.math.BigInteger;
import java.util.Arrays;

/** Base58 with the Bitcoin alphabet, which is how Solana writes public keys. */
public final class Base58 {

    private static final String ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    private static final BigInteger BASE = BigInteger.valueOf(58);

    private Base58() {}

    public static String encode(byte[] input) {
        int zeros = 0;
        while (zeros < input.length && input[zeros] == 0) zeros++;
        BigInteger n = new BigInteger(1, input);
        StringBuilder sb = new StringBuilder();
        while (n.signum() > 0) {
            BigInteger[] qr = n.divideAndRemainder(BASE);
            sb.append(ALPHABET.charAt(qr[1].intValue()));
            n = qr[0];
        }
        sb.append("1".repeat(zeros));
        return sb.reverse().toString();
    }

    /** @return the decoded bytes, or {@code null} when the text is not valid Base58 */
    public static byte[] decode(String text) {
        if (text == null || text.isEmpty()) return null;
        BigInteger n = BigInteger.ZERO;
        for (int i = 0; i < text.length(); i++) {
            int digit = ALPHABET.indexOf(text.charAt(i));
            if (digit < 0) return null;
            n = n.multiply(BASE).add(BigInteger.valueOf(digit));
        }
        int zeros = 0;
        while (zeros < text.length() && text.charAt(zeros) == '1') zeros++;
        byte[] raw = n.toByteArray(); // two's complement: a leading 0 byte is only the sign
        byte[] body = n.signum() == 0 ? new byte[0] : Arrays.copyOfRange(raw, raw[0] == 0 ? 1 : 0, raw.length);
        byte[] out = new byte[zeros + body.length];
        System.arraycopy(body, 0, out, zeros, body.length);
        return out;
    }
}
