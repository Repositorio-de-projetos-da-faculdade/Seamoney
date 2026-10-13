package com.seamoney.rules.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class NamesTest {

    @Test
    void trimsAndCollapsesWhiteSpace() {
        assertEquals("Guangzhou Textiles", Names.normalize("  Guangzhou   Textiles\t"));
        assertEquals("Guangzhou Textiles", Names.normalize("Guangzhou Textiles")); // a no-break space
        assertEquals("Guangzhou Textiles", Names.normalize("Guangzhou\nTextiles"));
    }

    @Test
    void foldsFullWidthLettersToPlainOnes() {
        assertEquals("Qingdao Steel", Names.normalize("Ｑingdao Steel"));
    }

    @Test
    void doesNotChangeCaseThatIsLeftToTheLookup() {
        assertEquals("qingdao STEEL", Names.normalize("qingdao STEEL"));
    }

    @Test
    void nothingBecomesEmpty() {
        assertEquals("", Names.normalize(null));
        assertEquals("", Names.normalize("   "));
    }
}
