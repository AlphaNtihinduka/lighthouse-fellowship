package com.lighthousefellowship.backend.service;

import com.lighthousefellowship.backend.dto.response.PublicSermonNoteResponseDTO;
import com.lighthousefellowship.backend.dto.response.PublicSermonNoteSummaryResponseDTO;

import java.util.List;
import java.util.UUID;

// Public side of sermon notes: only notes whose publish_at has passed, ever.
public interface PublicSermonNoteService {

    List<PublicSermonNoteSummaryResponseDTO> listPublishedNotes(Integer year);

    PublicSermonNoteResponseDTO getLatestNote();

    PublicSermonNoteResponseDTO getPublishedNote(UUID id);
}
