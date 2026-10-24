package com.lighthousefellowship.backend.mapper;

import com.lighthousefellowship.backend.dto.response.AdminSermonNoteResponseDTO;
import com.lighthousefellowship.backend.dto.response.AdminSermonNoteSummaryResponseDTO;
import com.lighthousefellowship.backend.dto.response.PublicSermonNoteResponseDTO;
import com.lighthousefellowship.backend.dto.response.PublicSermonNoteSummaryResponseDTO;
import com.lighthousefellowship.backend.model.SermonNote;
import com.lighthousefellowship.backend.model.enums.NoteStatus;
import com.lighthousefellowship.backend.repository.SermonNoteSummaryView;
import org.mapstruct.Context;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.time.Instant;

@Mapper(componentModel = "spring")
public interface SermonNoteMapper {

    @Mapping(target = "status", expression = "java(SermonNoteMapper.statusOf(note.getPublishAt(), now))")
    AdminSermonNoteResponseDTO toAdminResponse(SermonNote note, @Context Instant now);

    @Mapping(target = "status", expression = "java(SermonNoteMapper.statusOf(note.getPublishAt(), now))")
    AdminSermonNoteSummaryResponseDTO toAdminSummary(SermonNoteSummaryView note, @Context Instant now);

    PublicSermonNoteResponseDTO toPublicResponse(SermonNote note);

    PublicSermonNoteSummaryResponseDTO toPublicSummary(SermonNoteSummaryView note);

    static NoteStatus statusOf(Instant publishAt, Instant now) {
        if (publishAt == null) {
            return NoteStatus.DRAFT;
        }
        return publishAt.isAfter(now) ? NoteStatus.SCHEDULED : NoteStatus.PUBLISHED;
    }
}
