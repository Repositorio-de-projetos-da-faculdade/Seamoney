package com.seamoney.rules.chain;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.seamoney.rules.AppProperties;
import com.seamoney.rules.domain.Network;
import java.math.BigInteger;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/** Talks to the Python chain service. Its JSON uses snake_case. */
public class HttpChainClient implements ChainClient {

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    record SentDto(String txHash, long blockNumber, long confirmMs, String memoHex, String fromAddress) {}

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    record TransferDto(
            String txHash, int logIndex, long blockNumber, String fromAddress, String toAddress, String amountUnits, String memoHex) {}

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    record TxDto(String status, long blockNumber, String timestamp) {}

    /** The per-network health block of the chain service; only the fields used here. */
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    record NetworkHealthDto(Boolean configured) {}

    /** The top-level Tempo fields are kept by the chain service for older callers. */
    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    record HealthDto(boolean configured, String partnerAddress, long latestBlock, Map<String, NetworkHealthDto> networks) {}

    private final RestClient http;
    private final ObjectMapper mapper;

    public HttpChainClient(AppProperties props, ObjectMapper mapper) {
        this.mapper = mapper;
        // HTTP/1.1 only: by default the JDK client offers an h2c upgrade on cleartext connections, which
        // uvicorn rejects ("Unsupported upgrade request") and makes every POST fail with a 400.
        HttpClient jdk = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(5)).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(jdk);
        factory.setReadTimeout(Duration.ofSeconds(60)); // a payment waits for on-chain confirmation

        RestClient.Builder builder = RestClient.builder().baseUrl(props.chainServiceUrl()).requestFactory(factory);
        if (props.chainServiceToken() != null && !props.chainServiceToken().isBlank()) {
            builder.defaultHeader("X-Internal-Token", props.chainServiceToken());
        }
        this.http = builder.build();
    }

    @Override
    public SentPayment sendPayment(Network network, String to, long amountCents, String reference, String idempotencyKey) {
        SentDto dto = call(() -> http.post()
                .uri("/payments")
                .header("Idempotency-Key", idempotencyKey)
                .body(Map.of("to", to, "amount_cents", amountCents, "reference", reference, "network", network.value()))
                .retrieve()
                .onStatus(s -> s.isError(), (req, res) -> {
                    throw error(res.getStatusCode().value(), res.getBody().readAllBytes());
                })
                .body(SentDto.class));
        return new SentPayment(dto.txHash(), dto.blockNumber(), dto.confirmMs(), dto.memoHex(), dto.fromAddress());
    }

    @Override
    public Optional<String> paymentStatus(String idempotencyKey) {
        JsonNode body = call(() -> http.get()
                .uri("/payments/{key}", idempotencyKey)
                .retrieve()
                .onStatus(s -> s.value() == HttpStatus.NOT_FOUND.value(), (req, res) -> {})
                .onStatus(s -> s.isError() && s.value() != HttpStatus.NOT_FOUND.value(), (req, res) -> {
                    throw error(res.getStatusCode().value(), res.getBody().readAllBytes());
                })
                .body(JsonNode.class));
        return Optional.ofNullable(body).map(b -> b.path("status")).filter(JsonNode::isTextual).map(JsonNode::asText);
    }

    @Override
    public List<FoundTransfer> findTransfers(Network network, String to, String reference, long fromBlock) {
        List<TransferDto> dtos = call(() -> http.get()
                .uri(b -> b.path("/transfers")
                        .queryParam("network", network.value())
                        .queryParam("to", to)
                        .queryParam("reference", reference)
                        .queryParam("from_block", Math.max(0, fromBlock))
                        .build())
                .retrieve()
                .onStatus(s -> s.isError(), (req, res) -> {
                    throw error(res.getStatusCode().value(), res.getBody().readAllBytes());
                })
                .body(new ParameterizedTypeReference<List<TransferDto>>() {}));
        return dtos.stream()
                .map(t -> new FoundTransfer(
                        t.txHash(), t.logIndex(), t.blockNumber(), t.fromAddress(), t.toAddress(), new BigInteger(t.amountUnits()), t.memoHex()))
                .toList();
    }

    @Override
    public Optional<TxInfo> transaction(Network network, String txHash) {
        try {
            TxDto dto = http.get()
                    .uri("/transactions/{hash}?network={network}", txHash, network.value())
                    .retrieve()
                    .onStatus(s -> s.value() == HttpStatus.NOT_FOUND.value(), (req, res) -> {})
                    .onStatus(s -> s.isError() && s.value() != HttpStatus.NOT_FOUND.value(), (req, res) -> {
                        throw error(res.getStatusCode().value(), res.getBody().readAllBytes());
                    })
                    .body(TxDto.class);
            return Optional.ofNullable(dto).filter(d -> d.status() != null).map(d -> new TxInfo(d.status(), d.blockNumber(), d.timestamp()));
        } catch (ChainException e) {
            throw e;
        } catch (RestClientException e) {
            throw new ChainException("The chain service is unavailable", e);
        }
    }

    @Override
    public ChainHealth health() {
        HealthDto dto = call(() -> http.get().uri("/health").retrieve().body(HealthDto.class));
        NetworkHealthDto solana = dto.networks() == null ? null : dto.networks().get("solana");
        return new ChainHealth(dto.configured(), dto.partnerAddress(), dto.latestBlock(), solana != null && Boolean.TRUE.equals(solana.configured()));
    }

    private <T> T call(java.util.function.Supplier<T> request) {
        try {
            return request.get();
        } catch (ChainException e) {
            throw e;
        } catch (RestClientException e) {
            throw new ChainException("The chain service is unavailable", e);
        }
    }

    /** FastAPI errors look like {"detail": "message"} (or a list for validation errors). */
    private ChainException error(int status, byte[] body) {
        String message = "The chain service returned HTTP " + status;
        try {
            JsonNode detail = mapper.readTree(body).path("detail");
            if (detail.isTextual()) message = detail.asText();
            else if (detail.isArray() && !detail.isEmpty()) message = detail.get(0).path("msg").asText(message);
        } catch (Exception ignored) {
            // keep the generic message
        }
        return new ChainException(message, status);
    }
}
