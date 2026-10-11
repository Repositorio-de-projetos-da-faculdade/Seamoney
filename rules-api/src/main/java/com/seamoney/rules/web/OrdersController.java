package com.seamoney.rules.web;

import com.seamoney.rules.domain.Actor;
import com.seamoney.rules.domain.Order;
import com.seamoney.rules.security.JwtPrincipal;
import com.seamoney.rules.service.AuditService;
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
            @Size(max = 200) String invoiceFilename,
            @Pattern(regexp = "^(tempo|solana)?$") String network,
            @Pattern(regexp = "^$|^SM-[0-9A-HJKMNP-TV-Z]{8}$") String reference) {}

    /** Why an order is rejected (required) or cancelled (optional). */
    public record ReasonRequest(@Size(max = 500) String reason) {}

    private final OrderService orders;
    private final AuditService audit;

    public OrdersController(OrderService orders, AuditService audit) {
        this.orders = orders;
        this.audit = audit;
    }

    @GetMapping
    public Map<String, Object> list(@AuthenticationPrincipal JwtPrincipal principal, @RequestParam(defaultValue = "200") int limit) {
        return Map.of("orders", orders.list(principal.orgId(), limit));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'APPROVER', 'OPERATOR')")
    public ResponseEntity<Map<String, Order>> create(@AuthenticationPrincipal JwtPrincipal principal, @Valid @RequestBody NewOrderRequest body) {
        Order order = orders.create(principal.orgId(), actor(principal), new NewOrderInput(
                body.supplierName(), body.supplierCountry(), body.supplierWallet(), body.invoiceNumber(), body.amountCents(),
                body.dueDate(), body.extractionSource(), body.invoiceFilename(), body.network(), body.reference()));
        audit.logWrite(principal.orgId(), principal.userId(), "ORDER_CREATED", "ORDER", order.id(), null, order.status().value());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("order", order));
    }

    @GetMapping("/{id}")
    public Map<String, Object> get(@AuthenticationPrincipal JwtPrincipal principal, @PathVariable String id) {
        return Map.of("order", orders.get(principal.orgId(), id), "events", orders.events(principal.orgId(), id));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('OWNER', 'APPROVER')")
    public Map<String, Order> approve(@AuthenticationPrincipal JwtPrincipal principal, @PathVariable String id) {
        Order order = orders.approve(principal.orgId(), actor(principal), id);
        audit.logWrite(principal.orgId(), principal.userId(), "ORDER_APPROVED", "ORDER", id, "pending_approval", order.status().value());
        return Map.of("order", order);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('OWNER', 'APPROVER')")
    public Map<String, Order> reject(@AuthenticationPrincipal JwtPrincipal principal, @PathVariable String id, @Valid @RequestBody ReasonRequest body) {
        Order order = orders.reject(principal.orgId(), actor(principal), id, body.reason());
        audit.logWrite(principal.orgId(), principal.userId(), "ORDER_REJECTED", "ORDER", id, "pending_approval", order.status().value());
        return Map.of("order", order);
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('OWNER', 'APPROVER', 'OPERATOR')")
    public Map<String, Order> cancel(@AuthenticationPrincipal JwtPrincipal principal, @PathVariable String id, @RequestBody(required = false) ReasonRequest body) {
        Order order = orders.cancel(principal.orgId(), actor(principal), id, body == null ? null : body.reason());
        audit.logWrite(principal.orgId(), principal.userId(), "ORDER_CANCELLED", "ORDER", id, null, order.status().value());
        return Map.of("order", order);
    }

    @PostMapping("/{id}/pay")
    @PreAuthorize("hasAnyRole('OWNER', 'APPROVER')")
    public Map<String, Order> pay(@AuthenticationPrincipal JwtPrincipal principal, @PathVariable String id) {
        Order order = orders.pay(principal.orgId(), id);
        audit.logWrite(principal.orgId(), principal.userId(), "ORDER_PAID", "ORDER", id, "approved", order.status().value());
        return Map.of("order", order);
    }

    @PostMapping("/{id}/reconcile")
    @PreAuthorize("hasAnyRole('OWNER', 'APPROVER', 'OPERATOR', 'ACCOUNTANT')")
    public ReconcileResult reconcile(@AuthenticationPrincipal JwtPrincipal principal, @PathVariable String id) {
        ReconcileResult result = orders.reconcile(principal.orgId(), id);
        audit.logWrite(principal.orgId(), principal.userId(), result.ok() ? "ORDER_RECONCILED" : "ORDER_RECONCILE_FAILED", "ORDER", id,
                "sent", result.ok() ? "reconciled" : result.reason());
        return result;
    }

    private static Actor actor(JwtPrincipal principal) {
        return new Actor(principal.userId(), principal.role());
    }
}
