package com.seamoney.rules.security;

public record JwtPrincipal(String userId, String orgId, String role) {}
