package com.lighthousefellowship.backend.exception;

// Thrown by NoteContentValidator; the message names the offending block.
public class SermonNoteContentValidationException extends RuntimeException {

    public SermonNoteContentValidationException(String message) {
        super(message);
    }
}
