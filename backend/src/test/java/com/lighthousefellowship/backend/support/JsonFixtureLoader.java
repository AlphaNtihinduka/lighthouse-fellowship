package com.lighthousefellowship.backend.support;

import org.springframework.core.io.ClassPathResource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

public final class JsonFixtureLoader {

    private JsonFixtureLoader() {
    }

    public static String load(String classpathLocation) {
        try {
            return new ClassPathResource(classpathLocation).getContentAsString(StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw new IllegalStateException("Could not load JSON fixture: " + classpathLocation, exception);
        }
    }
}
