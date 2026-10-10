package com.seamoney.rules.domain;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.regex.Pattern;

/**
 * The networks a payment can settle on. Both are test networks. The rules treat them alike (same memo, same
 * 6-decimal units, same reconciliation checks); only the address format and the labels differ.
 */
public enum Network {
    TEMPO("tempo", "Tempo Moderato (testnet)", "AlphaUSD"),
    SOLANA("solana", "Solana (devnet)", "Seamoney test USD");

    private static final Pattern EVM_ADDRESS = Pattern.compile("^0x[0-9a-fA-F]{40}$");
    private static final SecureRandom RANDOM = new SecureRandom();

    private final String value;
    private final String label;
    private final String token;

    Network(String value, String label, String token) {
        this.value = value;
        this.label = label;
        this.token = token;
    }

    @JsonValue
    public String value() {
        return value;
    }

    public String label() {
        return label;
    }

    /** The test stablecoin settled on this network. */
    public String token() {
        return token;
    }

    @JsonCreator
    public static Network fromValue(String v) {
        for (Network n : values()) if (n.value.equalsIgnoreCase(v)) return n;
        throw new IllegalArgumentException("Unknown network: " + v);
    }

    /** A missing network means the original one, Tempo. */
    public static Network orDefault(String v) {
        return v == null || v.isBlank() ? TEMPO : fromValue(v.trim());
    }

    public boolean isValidAddress(String address) {
        if (address == null) return false;
        return switch (this) {
            case TEMPO -> EVM_ADDRESS.matcher(address).matches();
            case SOLANA -> {
                byte[] raw = Base58.decode(address);
                yield raw != null && raw.length == 32;
            }
        };
    }

    /** Hex addresses ignore case (checksum casing); Solana's Base58 keys are case sensitive. */
    public boolean sameAddress(String a, String b) {
        if (a == null || b == null) return false;
        return this == TEMPO ? a.equalsIgnoreCase(b) : a.equals(b);
    }

    /** Transaction ids follow the same rule: Tempo hashes are hex, Solana signatures are case-sensitive Base58. */
    public boolean sameHash(String a, String b) {
        return sameAddress(a, b);
    }

    /** A throwaway public address for a supplier that has no wallet yet (demo only: nobody holds its key). */
    public String randomAddress() {
        byte[] bytes = new byte[this == TEMPO ? 20 : 32];
        RANDOM.nextBytes(bytes);
        return this == TEMPO ? "0x" + HexFormat.of().formatHex(bytes) : Base58.encode(bytes);
    }
}
