package com.lighthousefellowship.backend.dto.response;

import com.lighthousefellowship.backend.model.NoteBlock;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

// Full published note for the app. Blank answers are included on purpose (ADR 0003).
// Deliberately has no createdBy, coverImagePublicId, publishAt or timestamps.
@AllArgsConstructor
@NoArgsConstructor
@Data
public class PublicSermonNoteResponseDTO {

    private UUID id;
    private String title;
    private String preacherName;
    private LocalDate sermonDate;
    private String coverImageUrl;
    private int contentVersion;
    private List<NoteBlock> blocks;
}
