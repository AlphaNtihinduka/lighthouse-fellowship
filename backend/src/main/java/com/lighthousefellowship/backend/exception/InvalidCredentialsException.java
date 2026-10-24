package com.lighthousefellowship.backend.exception;

// Same message for an unknown email and a wrong password, so login does not reveal
// which admin emails exist.
public class InvalidCredentialsException extends RuntimeException {

    public InvalidCredentialsException() {
        super("Invalid email or password");
    }
}
