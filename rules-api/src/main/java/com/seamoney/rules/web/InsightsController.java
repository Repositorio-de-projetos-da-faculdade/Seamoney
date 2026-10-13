package com.seamoney.rules.web;

import com.seamoney.rules.AppProperties;
import com.seamoney.rules.domain.Pricing;
import com.seamoney.rules.domain.Pricing.Comparison;
import com.seamoney.rules.domain.Views.StatsResponse;
import com.seamoney.rules.service.OrderService;
import com.seamoney.rules.service.OrderService.Proof;
import com.seamoney.rules.security.JwtPrincipal;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Read models and small endpoints around the orders: dashboard stats, calculator, proof, CSV, leads. */
@RestController
@RequestMapping("/api")
public class InsightsController {

    public record CompareRequest(
            @PositiveOrZero @DecimalMax("1000000000") double monthlyUsd,
            @DecimalMin("0") @DecimalMax("100") double bankFeePct) {}

    public record CompareResponse(long bankCents, long routeCents, long savingsCents, double savingsShare, int feeBps) {}

    public record LeadRequest(
            @Email @Size(max = 200) String email,
            @PositiveOrZero Double monthlyUsd,
            @DecimalMin("0") @DecimalMax("100") Double bankFeePct,
            @Size(max = 60) String country,
            boolean consent) {}

    private final OrderService orders;
    private final AppProperties props;

    public InsightsController(OrderService orders, AppProperties props) {
        this.orders = orders;
        this.props = props;
    }

    @GetMapping("/stats")
    public StatsResponse stats(@AuthenticationPrincipal JwtPrincipal principal) {
        return orders.stats(principal.orgId());
    }

    /** The calculator asks the rules service, so the savings math has a single source of truth. */
    @PostMapping("/compare")
    public CompareResponse compare(@Valid @RequestBody CompareRequest body) {
        long amountCents = Math.round(body.monthlyUsd() * 100);
        Comparison c = Pricing.compare(amountCents, body.bankFeePct(), props.feeBps());
        return new CompareResponse(c.bankCents(), c.routeCents(), c.savingsCents(), c.savingsShare(), props.feeBps());
    }

    /** The public proof page. {proofId} is the signed link id of an order, not the order id. */
    @GetMapping("/proof/{proofId}")
    public Proof proof(@PathVariable String proofId) {
        return orders.proof(proofId);
    }

    @GetMapping("/reports/orders")
    @PreAuthorize("hasAnyRole('OWNER', 'APPROVER', 'ACCOUNTANT')")
    public ResponseEntity<byte[]> csv(@AuthenticationPrincipal JwtPrincipal principal) {
        String filename = "seamoney-orders-" + LocalDate.now(ZoneOffset.UTC) + ".csv";
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(orders.ordersCsv(principal.orgId()).getBytes(StandardCharsets.UTF_8));
    }

    @PostMapping("/leads")
    public ResponseEntity<Map<String, Boolean>> lead(@Valid @RequestBody LeadRequest body) {
        orders.saveLead(
                null, // orgId is null for public leads
                body.email(),
                body.monthlyUsd() == null ? null : Math.round(body.monthlyUsd()),
                body.bankFeePct(),
                body.country(),
                body.consent());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("ok", true));
    }
}
