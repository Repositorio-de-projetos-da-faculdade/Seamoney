package com.seamoney.rules.domain;

public record Membership(String userId, String organizationId, Role role, String status) {}
