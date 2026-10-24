package com.lighthousefellowship.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.UUID;

// Archive entry for the app's year → month → Sunday browser. No content, no
// publish/draft fields: only published notes ever reach this DTO.
@AllArgsConstructor
@NoArgsConstructor
@Data
public class PublicSermonNoteSummaryResponseDTO {

    private UUID id;
    private String title;
    private LocalDate sermonDate;
    private String coverImageUrl;
    private int contentVersion;
}
