package com.lighthousefellowship.backend.exception;

import java.time.LocalDate;

public class DuplicateSermonDateException extends RuntimeException {

    public DuplicateSermonDateException(LocalDate sermonDate) {
        super("A sermon note already exists for " + sermonDate);
    }
}
