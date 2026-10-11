package com.seamoney.rules.store;

import com.seamoney.rules.domain.Membership;
import com.seamoney.rules.domain.Role;
import com.seamoney.rules.domain.User;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class UserRepository {
    private final JdbcTemplate jdbc;

    public UserRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<User> findByEmail(String email) {
        return jdbc.query("SELECT * FROM users WHERE email = ?",
                (rs, rowNum) -> new User(rs.getString("id"), rs.getString("email"), rs.getString("password_hash"), rs.getString("created_at")),
                email).stream().findFirst();
    }

    public Optional<String> findEmail(String userId) {
        return jdbc.query("SELECT email FROM users WHERE id = ?", (rs, i) -> rs.getString(1), userId).stream().findFirst();
    }

    /** The companies a user belongs to, with names, for the company switcher. */
    public record Company(String id, String name, String role) {}

    public List<Company> findCompanies(String userId) {
        return jdbc.query(
                "SELECT o.id, o.name, m.role FROM memberships m JOIN organizations o ON o.id = m.organization_id WHERE m.user_id = ? ORDER BY o.name",
                (rs, i) -> new Company(rs.getString("id"), rs.getString("name"), rs.getString("role")),
                userId);
    }

    public List<Membership> findMemberships(String userId) {
        return jdbc.query("SELECT * FROM memberships WHERE user_id = ?",
                (rs, rowNum) -> new Membership(rs.getString("user_id"), rs.getString("organization_id"), Role.valueOf(rs.getString("role").toUpperCase()), rs.getString("status")),
                userId);
    }

    public Optional<Membership> findMembership(String userId, String organizationId) {
        return jdbc.query("SELECT * FROM memberships WHERE user_id = ? AND organization_id = ?",
                (rs, rowNum) -> new Membership(rs.getString("user_id"), rs.getString("organization_id"), Role.valueOf(rs.getString("role").toUpperCase()), rs.getString("status")),
                userId, organizationId).stream().findFirst();
    }
}
