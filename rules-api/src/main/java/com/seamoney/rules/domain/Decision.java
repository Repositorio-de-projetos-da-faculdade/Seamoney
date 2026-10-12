package com.seamoney.rules.domain;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Who approved, rejected or cancelled an order, and when. An approval made by the policy (below the threshold) has no
 * user. {@code dataHash} is the SHA-256 the approval is bound to; {@code reason} comes with a rejection or cancellation.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record Decision(String by, String role, String at, String dataHash, String reason, boolean auto) {}
