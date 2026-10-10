package com.seamoney.rules.web;

import com.seamoney.rules.domain.Order;
import com.seamoney.rules.service.OrderService;
import com.seamoney.rules.service.OrderService.NewOrderInput;
import com.seamoney.rules.service.OrderService.ReconcileResult;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
public class OrdersController {

    public record NewOrderRequest(
            @NotBlank @Size(max = 120) String supplierName,
            @Size(max = 2) String supplierCountry,
            String supplierWallet,
            @NotBlank @Size(max = 64) String invoiceNumber,
            @Positive long amountCents,
            @Pattern(regexp = "^$|^\\d{4}-\\d{2}-\\d{2}$") String dueDate,
            @NotNull @Pattern(regexp = "ai|demo|manual") String extractionSource,
            @Size(max = 200) String invoiceFilename) {}

    private final OrderService orders;

    public OrdersController(OrderService orders) {
        this.orders = orders;
    }

    @GetMapping
    public Map<String, Object> list(@RequestParam(defaultValue = "200") int limit) {
        return Map.of("orders", orders.list(limit));
    }

    @PostMapping
    public ResponseEntity<Map<String, Order>> create(@Valid @RequestBody NewOrderRequest body) {
        Order order = orders.create(new NewOrderInput(
                body.supplierName(), body.supplierCountry(), body.supplierWallet(), body.invoiceNumber(), body.amountCents(),
                body.dueDate(), body.extractionSource(), body.invoiceFilename()));
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("order", order));
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@PathVariable String id) {
        return Map.of("order", orders.get(id), "events", orders.events(id));
    }

    @PostMapping("/{id}/pay")
    public Map<String, Order> pay(@PathVariable String id) {
        return Map.of("order", orders.pay(id));
    }

    /** A failed match is an expected business outcome (HTTP 200 with ok=false), not a server error. */
    @PostMapping("/{id}/reconcile")
    public ReconcileResult reconcile(@PathVariable String id) {
        return orders.reconcile(id);
    }
}
