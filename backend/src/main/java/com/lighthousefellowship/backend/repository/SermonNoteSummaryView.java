package com.lighthousefellowship.backend.repository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

// Closed projection for list endpoints, so a year of notes is listed without
// loading every note's JSONB content.
public interface SermonNoteSummaryView {

    UUID getId();

    String getTitle();

    String getPreacherName();

    LocalDate getSermonDate();

    String getCoverImageUrl();

    int getContentVersion();

    Instant getPublishAt();
}
