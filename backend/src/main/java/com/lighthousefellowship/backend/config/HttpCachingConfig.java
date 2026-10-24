package com.lighthousefellowship.backend.config;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.filter.ShallowEtagHeaderFilter;

// ETags on the public note reads, so the app can revalidate its offline copy with
// If-None-Match and get a 304 instead of the whole note. The controllers send
// Cache-Control: no-cache, so a client always revalidates and an unpublished note
// disappears on the next request.
@Configuration
public class HttpCachingConfig {

    @Bean
    public FilterRegistrationBean<ShallowEtagHeaderFilter> publicNotesEtagFilter() {
        FilterRegistrationBean<ShallowEtagHeaderFilter> registration =
                new FilterRegistrationBean<>(new ShallowEtagHeaderFilter());
        registration.addUrlPatterns("/api/notes", "/api/notes/*");
        return registration;
    }
}
