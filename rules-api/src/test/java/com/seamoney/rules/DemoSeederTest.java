package com.seamoney.rules;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.seamoney.rules.domain.Order;
import com.seamoney.rules.domain.OrderStatus;
import com.seamoney.rules.domain.Views.StatsResponse;
import com.seamoney.rules.service.OrderService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;

@SpringBootTest
@ActiveProfiles("demo")
@Import(DemoSeederTest.TestChain.class)
class DemoSeederTest {

    @org.springframework.test.context.DynamicPropertySource
    static void configureProperties(org.springframework.test.context.DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:h2:mem:test_demo;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH");
        registry.add("spring.datasource.driver-class-name", () -> "org.h2.Driver");
        registry.add("spring.datasource.username", () -> "sa");
        registry.add("spring.datasource.password", () -> "");
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("seamoney.jwt-secret", () -> "test_jwt_secret_that_needs_to_be_long_enough_for_hs256_alg");
    }

    @TestConfiguration
    static class TestChain {
        @Bean
        @Primary
        FakeChain fakeChain() {
            return new FakeChain();
        }
    }

    @Autowired OrderService service;

    @Test
    void seedsSevenFlaggedDemoOrdersAndOneIsPending() {
        List<Order> orders = service.list("org_1", 100);
        assertEquals(7, orders.size());
        assertTrue(orders.stream().allMatch(Order::demo), "every seeded row is flagged as demo data");
        assertEquals(1, orders.stream().filter(o -> o.status() == OrderStatus.QUOTED).count());
        assertTrue(orders.stream().noneMatch(o -> o.txHash() != null), "demo rows have no on-chain transaction");
    }

    @Test
    void dashboardStatsAreComputedFromTheOrders() {
        StatsResponse r = service.stats("org_1");
        assertEquals(6, r.stats().reconciled());
        assertEquals(1, r.stats().inProgress());
        assertTrue(r.stats().hasDemo());
        assertTrue(r.stats().savingsCents() > 0);
        assertEquals(7, r.series().size());
    }
}
