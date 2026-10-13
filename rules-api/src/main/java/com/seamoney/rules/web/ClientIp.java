package com.seamoney.rules.web;

import jakarta.servlet.http.HttpServletRequest;

/**
 * Where a request really came from. This service is reached only by the web app, which sends the visitor's address in
 * X-Forwarded-For; the socket address is then always the web container's. If this service were ever exposed directly,
 * the header would be spoofable, so it stays on a private network (docker-compose publishes only the web app).
 */
final class ClientIp {

    private ClientIp() {}

    static String of(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            String first = forwarded.split(",")[0].trim();
            if (!first.isEmpty() && first.length() <= 64) return first;
        }
        return request.getRemoteAddr();
    }
}
