package com.lighthousefellowship.backend.dto.request;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@AllArgsConstructor
@NoArgsConstructor
@Data
public class PublishSermonNoteRequestDTO {

    // Missing means "publish now". A future instant schedules the note.
    private Instant publishAt;
}
