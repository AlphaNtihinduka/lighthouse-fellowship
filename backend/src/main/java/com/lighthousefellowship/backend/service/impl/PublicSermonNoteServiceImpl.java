package com.lighthousefellowship.backend.service.impl;

import com.lighthousefellowship.backend.dto.response.PublicSermonNoteResponseDTO;
import com.lighthousefellowship.backend.dto.response.PublicSermonNoteSummaryResponseDTO;
import com.lighthousefellowship.backend.exception.InvalidNoteFilterException;
import com.lighthousefellowship.backend.exception.SermonNoteNotFoundException;
import com.lighthousefellowship.backend.mapper.SermonNoteMapper;
import com.lighthousefellowship.backend.repository.SermonNoteRepository;
import com.lighthousefellowship.backend.repository.SermonNoteSummaryView;
import com.lighthousefellowship.backend.service.PublicSermonNoteService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

// Every method passes "now" into a repository query that filters on publish_at, so a
// draft or scheduled note cannot be returned. Missing and unpublished notes both give
// the same 404, so the API does not reveal that an unpublished note exists.
@Service
@AllArgsConstructor
public class PublicSermonNoteServiceImpl implements PublicSermonNoteService {

    private static final int MIN_YEAR = 2000;
    private static final int MAX_YEAR = 2100;

    private final SermonNoteRepository sermonNoteRepository;
    private final SermonNoteMapper sermonNoteMapper;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public List<PublicSermonNoteSummaryResponseDTO> listPublishedNotes(Integer year) {
        Instant now = Instant.now(clock);
        List<SermonNoteSummaryView> notes;
        if (year == null) {
            notes = sermonNoteRepository.findByPublishAtLessThanEqualOrderBySermonDateDesc(now);
        } else {
            if (year < MIN_YEAR || year > MAX_YEAR) {
                throw new InvalidNoteFilterException("year must be between " + MIN_YEAR + " and " + MAX_YEAR);
            }
            notes = sermonNoteRepository.findBySermonDateBetweenAndPublishAtLessThanEqualOrderBySermonDateDesc(
                    LocalDate.of(year, 1, 1), LocalDate.of(year, 12, 31), now);
        }
        return notes.stream().map(sermonNoteMapper::toPublicSummary).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PublicSermonNoteResponseDTO getLatestNote() {
        return sermonNoteRepository.findFirstByPublishAtLessThanEqualOrderBySermonDateDesc(Instant.now(clock))
                .map(sermonNoteMapper::toPublicResponse)
                .orElseThrow(() -> new SermonNoteNotFoundException());
    }

    @Override
    @Transactional(readOnly = true)
    public PublicSermonNoteResponseDTO getPublishedNote(UUID id) {
        return sermonNoteRepository.findByIdAndPublishAtLessThanEqual(id, Instant.now(clock))
                .map(sermonNoteMapper::toPublicResponse)
                .orElseThrow(() -> new SermonNoteNotFoundException(id));
    }
}
