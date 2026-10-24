package com.lighthousefellowship.backend.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.lighthousefellowship.backend.model.enums.BlockType;
import com.lighthousefellowship.backend.model.enums.TextAlign;

import java.util.List;

// One block of a sermon note (docs/PLAN.md §4, ADR 0002). A single flat shape for
// every type keeps the JSON simple for the dashboard and the app; which fields a
// type requires or forbids is decided by NoteContentValidator, not by Jackson, so
// the pastor gets a message naming the block instead of a parser error.
@JsonInclude(JsonInclude.Include.NON_NULL)
public record NoteBlock(
        String id,
        BlockType type,
        // HEADING, PARAGRAPH
        List<NoteSegment> segments,
        // HEADING: true = auto-numbered I, II, III; false = plain label
        Boolean numbered,
        // SCRIPTURE
        String text,
        String reference,
        // PARAGRAPH
        TextAlign align,
        // LIST: each item is one numbered line made of segments
        List<List<NoteSegment>> items,
        // REFLECTION
        String prompt
) {
}
