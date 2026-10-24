package com.lighthousefellowship.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

// One injectable Clock, so publish visibility (publish_at <= now) and token expiry
// are testable with a fixed or movable clock.
@Configuration
public class ClockConfig {

    @Bean
    public Clock clock() {
        return Clock.systemUTC();
    }
}
