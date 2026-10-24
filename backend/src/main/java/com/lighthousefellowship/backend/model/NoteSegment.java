package com.lighthousefellowship.backend.model;

import com.fasterxml.jackson.annotation.JsonInclude;

// A piece of a line: either plain text ({"text": ...}) or a blank
// ({"blankId": ..., "answer": ...}). NoteContentValidator enforces that exactly
// one of the two shapes is used.
@JsonInclude(JsonInclude.Include.NON_NULL)
public record NoteSegment(
        String text,
        String blankId,
        String answer
) {
}
