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
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;

@SpringBootTest(properties = {"spring.datasource.url=jdbc:sqlite::memory:", "seamoney.seed-demo=true"})
@Import(DemoSeederTest.TestChain.class)
class DemoSeederTest {

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
        List<Order> orders = service.list(100);
        assertEquals(7, orders.size());
        assertTrue(orders.stream().allMatch(Order::demo), "every seeded row is flagged as demo data");
        assertEquals(1, orders.stream().filter(o -> o.status() == OrderStatus.QUOTED).count());
        assertTrue(orders.stream().noneMatch(o -> o.txHash() != null), "demo rows have no on-chain transaction");
    }

    @Test
    void dashboardStatsAreComputedFromTheOrders() {
        StatsResponse r = service.stats();
        assertEquals(6, r.stats().reconciled());
        assertEquals(1, r.stats().inProgress());
        assertTrue(r.stats().hasDemo());
        assertTrue(r.stats().savingsCents() > 0);
        assertEquals(7, r.series().size());
    }
}
