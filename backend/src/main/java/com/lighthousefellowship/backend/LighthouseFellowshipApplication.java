package com.lighthousefellowship.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;

// The default in-memory user (with a generated password in the log) is excluded:
// admins authenticate only through POST /api/auth/login and a JWT.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class LighthouseFellowshipApplication {

    public static void main(String[] args) {
        SpringApplication.run(LighthouseFellowshipApplication.class, args);
    }
}
