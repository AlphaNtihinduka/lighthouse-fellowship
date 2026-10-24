package com.lighthousefellowship.backend.dto.request;

import com.lighthousefellowship.backend.model.NoteBlock;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

// Used for both create and update: a note is always saved whole (ADR 0002).
// Publishing is separate (PATCH .../publish), so saving never changes visibility.
@AllArgsConstructor
@NoArgsConstructor
@Data
public class SermonNoteRequestDTO {

    @NotBlank
    @Size(max = 200)
    private String title;

    // Must be a Sunday; checked in the service.
    @NotNull
    private LocalDate sermonDate;

    // Blank or missing means the default preacher (SermonNoteServiceImpl.DEFAULT_PREACHER).
    @Size(max = 120)
    private String preacherName;

    // Validated block by block in NoteContentValidator. An empty list is a valid draft.
    @NotNull
    private List<NoteBlock> blocks;
}
