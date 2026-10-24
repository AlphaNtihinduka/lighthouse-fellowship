package com.lighthousefellowship.backend.repository;

import com.lighthousefellowship.backend.model.SermonNote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SermonNoteRepository extends JpaRepository<SermonNote, UUID> {

    // ---- Admin reads (drafts and scheduled notes included) ----

    List<SermonNoteSummaryView> findAllByOrderBySermonDateDesc();

    List<SermonNoteSummaryView> findBySermonDateBetweenOrderBySermonDateDesc(LocalDate from, LocalDate to);

    boolean existsBySermonDate(LocalDate sermonDate);

    boolean existsBySermonDateAndIdNot(LocalDate sermonDate, UUID id);

    // ---- Public reads ----
    // Visibility is part of every query (publish_at <= now, which also excludes a
    // NULL publish_at), never a check after loading: a draft or scheduled note
    // cannot come back from these methods at all.

    List<SermonNoteSummaryView> findByPublishAtLessThanEqualOrderBySermonDateDesc(Instant now);

    List<SermonNoteSummaryView> findBySermonDateBetweenAndPublishAtLessThanEqualOrderBySermonDateDesc(
            LocalDate from, LocalDate to, Instant now);

    Optional<SermonNote> findFirstByPublishAtLessThanEqualOrderBySermonDateDesc(Instant now);

    Optional<SermonNote> findByIdAndPublishAtLessThanEqual(UUID id, Instant now);
}
