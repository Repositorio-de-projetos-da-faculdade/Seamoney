package com.seamoney.rules.domain;

import java.text.Normalizer;

/** How a name is compared. Two spellings of the same supplier must find the same supplier, not create a second one. */
public final class Names {

    private Names() {}

    /**
     * Compatibility-normalised (full-width letters become plain ones), trimmed, with every run of white space
     * collapsed to one space. Case is not changed here: lookups compare ignoring case.
     */
    public static String normalize(String name) {
        if (name == null) return "";
        return Normalizer.normalize(name, Normalizer.Form.NFKC).replaceAll("[\\s\\p{Z}]+", " ").trim();
    }
}
