package com.seamoney.rules.service;

import com.seamoney.rules.AppProperties;
import com.seamoney.rules.domain.Actor;
import com.seamoney.rules.domain.Names;
import com.seamoney.rules.domain.Network;
import com.seamoney.rules.domain.SupplierView;
import com.seamoney.rules.service.OrderException.Code;
import com.seamoney.rules.store.SupplierRepository;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.HexFormat;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Suppliers and where they get paid. A new or changed address is a proposal until someone other than the proposer,
 * with the right to approve wallets (owner or approver), puts it into use; payments go only to the approved version.
 */
@Service
public class SupplierService {

    public record NewWallet(String network, String address) {}

    public record NewSupplier(String name, String country, String city, String port, String email, NewWallet wallet) {}

    /** One supplier of the demo workspace, imported with its wallet history as is. */
    public record SeedSupplier(String name, String country, String city, String port, String email, List<SeedWallet> wallets) {}

    public record SeedWallet(String network, String address, int version, String status) {}

    private static final SecureRandom RANDOM = new SecureRandom();

    private final SupplierRepository repo;
    private final AppProperties props;
    private final Clock clock;

    public SupplierService(SupplierRepository repo, AppProperties props, Clock clock) {
        this.repo = repo;
        this.props = props;
        this.clock = clock;
    }

    public List<SupplierView> list(String orgId) {
        return repo.list(orgId);
    }

    /** A supplier arrives with its first wallet as a proposal: nobody can pay it until a second person approves. */
    @Transactional
    public SupplierView add(String orgId, Actor actor, NewSupplier in) {
        String name = Names.normalize(in.name());
        if (name.isEmpty()) throw invalid("Supplier name is required.");
        if (in.wallet() == null) throw invalid("A first wallet is required.");
        Network network = network(in.wallet().network());
        String address = address(network, in.wallet().address());
        String now = now();
        String id = repo.idByName(orgId, name).orElse(null);
        if (id != null && repo.hasWallets(orgId, id)) throw new OrderException("This supplier already exists.", Code.BAD_STATE);
        if (id == null) {
            id = "sup_" + randomHex(4);
            repo.insertSupplier(orgId, id, name, blankToNull(in.country()), blankToNull(in.city()), blankToNull(in.port()), blankToNull(in.email()), address, network, now);
        } else {
            repo.updateProfile(orgId, id, blankToNull(in.country()), blankToNull(in.city()), blankToNull(in.port()), blankToNull(in.email()));
        }
        repo.propose(orgId, id, "wal_" + randomHex(4), network, address, repo.nextVersion(orgId, id, network), actor, now);
        return get(orgId, id);
    }

    /** A new address, or a first one on another network. An earlier open proposal on that network is dropped. */
    @Transactional
    public SupplierView propose(String orgId, Actor actor, String supplierId, NewWallet in) {
        SupplierView supplier = get(orgId, supplierId);
        Network network = network(in.network());
        String address = address(network, in.address());
        repo.approvedAddress(orgId, supplierId, network).ifPresent(current -> {
            if (network.sameAddress(current, address)) throw new OrderException("This address is already the one in use.", Code.BAD_STATE);
        });
        repo.propose(orgId, supplier.id(), "wal_" + randomHex(4), network, address, repo.nextVersion(orgId, supplierId, network), actor, now());
        return get(orgId, supplierId);
    }

    @Transactional
    public SupplierView approve(String orgId, Actor actor, String supplierId, String walletId) {
        SupplierView.Wallet wallet = wallet(orgId, supplierId, walletId);
        if (!actor.canApprove()) throw new OrderException("Only owners and approvers approve wallets.", Code.FORBIDDEN);
        if (actor.userId() != null && actor.userId().equals(wallet.proposedBy())) {
            throw new OrderException("Whoever proposed a wallet cannot approve it.", Code.FORBIDDEN);
        }
        if (!repo.approve(orgId, supplierId, walletId, wallet.network(), actor, now())) throw new OrderException("This wallet is no longer a proposal.", Code.BAD_STATE);
        return get(orgId, supplierId);
    }

    /** An approver turns a proposal down, or its proposer withdraws it. */
    @Transactional
    public SupplierView reject(String orgId, Actor actor, String supplierId, String walletId) {
        SupplierView.Wallet wallet = wallet(orgId, supplierId, walletId);
        boolean own = actor.userId() != null && actor.userId().equals(wallet.proposedBy());
        if (!own && !actor.canApprove()) throw new OrderException("Only owners, approvers or whoever proposed it can turn a wallet down.", Code.FORBIDDEN);
        if (!repo.revokeProposal(orgId, supplierId, walletId)) throw new OrderException("This wallet is no longer a proposal.", Code.BAD_STATE);
        return get(orgId, supplierId);
    }

    /**
     * The demo workspace brings its fictitious suppliers once, with their wallet history as is, so every browser of
     * the company starts from the same registry. Only with the demo seed on and only into an empty registry.
     */
    @Transactional
    public List<SupplierView> importDemo(String orgId, Actor actor, List<SeedSupplier> seed) {
        if (!props.seedDemo()) throw new OrderException("Importing suppliers is only for the demo.", Code.FORBIDDEN);
        if (repo.hasRegistry(orgId)) return list(orgId);
        String now = now();
        Actor seedActor = new Actor("seed", "SEED");
        for (SeedSupplier s : seed) {
            if (s.wallets() == null || s.wallets().isEmpty()) continue;
            SeedWallet first = s.wallets().get(0);
            Network firstNetwork = network(first.network());
            String id = repo.idByName(orgId, Names.normalize(s.name())).orElse(null);
            if (id == null) {
                id = "sup_" + randomHex(4);
                repo.insertSupplier(orgId, id, Names.normalize(s.name()), blankToNull(s.country()), blankToNull(s.city()), blankToNull(s.port()), blankToNull(s.email()),
                        address(firstNetwork, first.address()), firstNetwork, now);
            } else {
                repo.updateProfile(orgId, id, blankToNull(s.country()), blankToNull(s.city()), blankToNull(s.port()), blankToNull(s.email()));
            }
            for (SeedWallet w : s.wallets()) {
                Network network = network(w.network());
                String status = switch (w.status()) {
                    case "approved", "proposed", "revoked" -> w.status();
                    default -> throw invalid("Unknown wallet status.");
                };
                repo.insertWallet(orgId, id, "wal_" + randomHex(4), network, address(network, w.address()), w.version(), status, seedActor, now,
                        "approved".equals(status) ? seedActor : null, "approved".equals(status) ? now : null);
            }
        }
        return list(orgId);
    }

    private SupplierView get(String orgId, String id) {
        return repo.find(orgId, id).orElseThrow(() -> new OrderException("Supplier not found.", Code.NOT_FOUND));
    }

    private SupplierView.Wallet wallet(String orgId, String supplierId, String walletId) {
        return get(orgId, supplierId).wallets().stream()
                .filter(w -> w.id().equals(walletId))
                .findFirst()
                .orElseThrow(() -> new OrderException("Wallet not found.", Code.NOT_FOUND));
    }

    private static Network network(String value) {
        try {
            return Network.orDefault(value);
        } catch (IllegalArgumentException e) {
            throw invalid("Unknown network. Use tempo or solana.");
        }
    }

    private static String address(Network network, String address) {
        String clean = address == null ? "" : address.trim();
        if (!network.isValidAddress(clean)) throw invalid("This is not a valid " + network.label() + " address.");
        return clean;
    }

    private String now() {
        return clock.instant().toString();
    }

    private static OrderException invalid(String message) {
        return new OrderException(message, Code.INVALID);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static String randomHex(int bytes) {
        byte[] b = new byte[bytes];
        RANDOM.nextBytes(b);
        return HexFormat.of().formatHex(b);
    }
}
