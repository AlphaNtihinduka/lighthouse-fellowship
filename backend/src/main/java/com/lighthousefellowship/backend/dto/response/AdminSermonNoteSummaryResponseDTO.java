package com.lighthousefellowship.backend.dto.response;

import com.lighthousefellowship.backend.model.enums.NoteStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class AdminSermonNoteSummaryResponseDTO {

    private UUID id;
    private String title;
    private String preacherName;
    private LocalDate sermonDate;
    private String coverImageUrl;
    private int contentVersion;
    private Instant publishAt;
    private NoteStatus status;
}
