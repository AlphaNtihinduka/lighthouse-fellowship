package com.lighthousefellowship.backend.model.enums;

// Derived from publish_at and the current time, never stored: a scheduled note
// becomes published on its own when the clock passes publish_at.
public enum NoteStatus {
    DRAFT,
    SCHEDULED,
    PUBLISHED
}
