package com.lighthousefellowship.backend.exception;

import java.time.LocalDate;

public class InvalidSermonDateException extends RuntimeException {

    public InvalidSermonDateException(LocalDate sermonDate) {
        super("sermonDate must be a Sunday: " + sermonDate + " is a " + sermonDate.getDayOfWeek());
    }
}
