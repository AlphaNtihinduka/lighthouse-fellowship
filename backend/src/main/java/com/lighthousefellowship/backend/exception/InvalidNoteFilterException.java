package com.lighthousefellowship.backend.exception;

// A bad year/month filter on a note list.
public class InvalidNoteFilterException extends RuntimeException {

    public InvalidNoteFilterException(String message) {
        super(message);
    }
}
