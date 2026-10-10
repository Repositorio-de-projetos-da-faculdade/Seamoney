package com.seamoney.rules.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.seamoney.rules.domain.Pricing.Comparison;
import java.math.BigInteger;
import org.junit.jupiter.api.Test;

class PricingTest {

    @Test
    void oneAndAHalfPercentOf80kIs800() {
        assertEquals(80_000, Pricing.feeCents(8_000_000, 100));
    }

    @Test
    void feeRoundsHalfUp() {
        assertEquals(1, Pricing.feeCents(50, 100)); // 0.5 cent -> 1
        assertEquals(0, Pricing.feeCents(49, 100));
        assertEquals(0, Pricing.feeCents(1, 100));
    }

    @Test
    void bankCostIsThreePercentOf80kWhenAssumed() {
        assertEquals(240_000, Pricing.bankCostCents(8_000_000, 3.0));
    }

    @Test
    void comparisonMatchesTheWorkedExample() {
        Comparison c = Pricing.compare(8_000_000, 3.0, 100);
        assertEquals(240_000, c.bankCents());
        assertEquals(80_000, c.routeCents());
        assertEquals(160_000, c.savingsCents());
        assertEquals(2.0 / 3.0, c.savingsShare(), 1e-9);
    }

    @Test
    void savingsCanBeNegative() {
        assertTrue(Pricing.compare(1_000_000, 0.5, 100).savingsCents() < 0);
    }

    @Test
    void zeroAmountGivesZeroEverything() {
        assertEquals(new Comparison(0, 0, 0, 0.0), Pricing.compare(0, 3.0, 100));
    }

    @Test
    void centsToSixDecimalUnitsAndBack() {
        assertEquals(new BigInteger("80000000000"), Pricing.centsToUnits(8_000_000));
        assertEquals(8_000_000, Pricing.unitsToCents(new BigInteger("80000000000")));
        assertEquals(12_345, Pricing.unitsToCents(Pricing.centsToUnits(12_345)));
    }

    @Test
    void negativeCentsAreRejected() {
        assertThrows(IllegalArgumentException.class, () -> Pricing.centsToUnits(-1));
    }

    @Test
    void simulatedBrlConversion() {
        assertEquals(43_632_000, Pricing.usdToBrlCents(8_080_000, 5.4));
    }
}
