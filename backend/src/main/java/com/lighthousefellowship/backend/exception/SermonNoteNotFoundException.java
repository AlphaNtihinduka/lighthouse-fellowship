package com.lighthousefellowship.backend.exception;

import java.util.UUID;

public class SermonNoteNotFoundException extends RuntimeException {

    public SermonNoteNotFoundException(UUID id) {
        super("Sermon note not found: " + id);
    }

    public SermonNoteNotFoundException() {
        super("No sermon note has been published yet");
    }
}
