package com.seamoney.rules;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AppConfig {

    /** Injected so tests can control time. */
    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }
}
