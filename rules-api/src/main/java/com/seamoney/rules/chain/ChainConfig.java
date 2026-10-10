package com.seamoney.rules.chain;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.seamoney.rules.AppProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ChainConfig {

    /** Tests replace this bean with a fake chain. */
    @Bean
    @ConditionalOnMissingBean(ChainClient.class)
    ChainClient chainClient(AppProperties props, ObjectMapper mapper) {
        return new HttpChainClient(props, mapper);
    }
}
