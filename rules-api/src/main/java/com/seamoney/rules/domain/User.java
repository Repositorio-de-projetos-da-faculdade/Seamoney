package com.seamoney.rules.domain;

public record User(String id, String email, String passwordHash, String createdAt) {}
