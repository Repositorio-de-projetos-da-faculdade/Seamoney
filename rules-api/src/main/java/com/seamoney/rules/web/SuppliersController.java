package com.seamoney.rules.web;

import com.seamoney.rules.domain.Actor;
import com.seamoney.rules.domain.SupplierView;
import com.seamoney.rules.security.JwtPrincipal;
import com.seamoney.rules.service.AuditService;
import com.seamoney.rules.service.SupplierService;
import com.seamoney.rules.service.SupplierService.NewSupplier;
import com.seamoney.rules.service.SupplierService.NewWallet;
import com.seamoney.rules.service.SupplierService.SeedSupplier;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
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
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/suppliers")
public class SuppliersController {

    public record WalletRequest(@Pattern(regexp = "^(tempo|solana)$") String network, @NotBlank @Size(max = 64) String address) {}

    public record SupplierRequest(
            @NotBlank @Size(max = 120) String name,
            @Size(max = 2) String country,
            @Size(max = 80) String city,
            @Size(max = 8) String port,
            @Size(max = 160) String email,
            @NotNull @Valid WalletRequest wallet) {}

    private final SupplierService suppliers;
    private final AuditService audit;

    public SuppliersController(SupplierService suppliers, AuditService audit) {
        this.suppliers = suppliers;
        this.audit = audit;
    }

    @GetMapping
    public Map<String, List<SupplierView>> list(@AuthenticationPrincipal JwtPrincipal principal) {
        return Map.of("suppliers", suppliers.list(principal.orgId()));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('OWNER', 'APPROVER', 'OPERATOR')")
    public ResponseEntity<Map<String, SupplierView>> add(@AuthenticationPrincipal JwtPrincipal principal, @Valid @RequestBody SupplierRequest body) {
        SupplierView s = suppliers.add(principal.orgId(), actor(principal), new NewSupplier(
                body.name(), body.country(), body.city(), body.port(), body.email(), new NewWallet(body.wallet().network(), body.wallet().address())));
        audit.logWrite(principal.orgId(), principal.userId(), "SUPPLIER_ADDED", "SUPPLIER", s.id(), null, body.wallet().network());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("supplier", s));
    }

    @PostMapping("/{id}/wallets")
    @PreAuthorize("hasAnyRole('OWNER', 'APPROVER', 'OPERATOR')")
    public Map<String, SupplierView> propose(@AuthenticationPrincipal JwtPrincipal principal, @PathVariable String id, @Valid @RequestBody WalletRequest body) {
        SupplierView s = suppliers.propose(principal.orgId(), actor(principal), id, new NewWallet(body.network(), body.address()));
        audit.logWrite(principal.orgId(), principal.userId(), "WALLET_PROPOSED", "SUPPLIER", id, null, body.network());
        return Map.of("supplier", s);
    }

    @PostMapping("/{id}/wallets/{walletId}/approve")
    @PreAuthorize("hasAnyRole('OWNER', 'APPROVER')")
    public Map<String, SupplierView> approve(@AuthenticationPrincipal JwtPrincipal principal, @PathVariable String id, @PathVariable String walletId) {
        SupplierView s = suppliers.approve(principal.orgId(), actor(principal), id, walletId);
        audit.logWrite(principal.orgId(), principal.userId(), "WALLET_APPROVED", "WALLET", walletId, "proposed", "approved");
        return Map.of("supplier", s);
    }

    @PostMapping("/{id}/wallets/{walletId}/reject")
    @PreAuthorize("hasAnyRole('OWNER', 'APPROVER', 'OPERATOR')")
    public Map<String, SupplierView> reject(@AuthenticationPrincipal JwtPrincipal principal, @PathVariable String id, @PathVariable String walletId) {
        SupplierView s = suppliers.reject(principal.orgId(), actor(principal), id, walletId);
        audit.logWrite(principal.orgId(), principal.userId(), "WALLET_REJECTED", "WALLET", walletId, "proposed", "revoked");
        return Map.of("supplier", s);
    }

    /** The demo workspace's fictitious suppliers, once, into an empty registry (demo seed only). */
    @PostMapping("/import-demo")
    @PreAuthorize("hasAnyRole('OWNER', 'APPROVER', 'OPERATOR')")
    public Map<String, List<SupplierView>> importDemo(@AuthenticationPrincipal JwtPrincipal principal, @RequestBody List<SeedSupplier> body) {
        List<SupplierView> list = suppliers.importDemo(principal.orgId(), actor(principal), body);
        audit.logWrite(principal.orgId(), principal.userId(), "SUPPLIERS_IMPORTED", "SUPPLIER", null, null, String.valueOf(list.size()));
        return Map.of("suppliers", list);
    }

    private static Actor actor(JwtPrincipal principal) {
        return new Actor(principal.userId(), principal.role());
    }
}
