package com.lighthousefellowship.backend.service.support;

import com.lighthousefellowship.backend.exception.SermonNoteContentValidationException;
import com.lighthousefellowship.backend.model.NoteBlock;
import com.lighthousefellowship.backend.model.NoteSegment;
import com.lighthousefellowship.backend.model.enums.BlockType;
import com.lighthousefellowship.backend.model.enums.TextAlign;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * The only schema the JSONB {@code sermon_note.content} column has (ADR 0002). Runs on
 * every write, before saving, because a malformed note would break the reader on
 * every phone that downloads it, and installed apps cannot be force-updated.
 *
 * Unknown JSON fields never get this far: they are rejected while the request body is
 * parsed ({@code spring.jackson.deserialization.fail-on-unknown-properties}). This class
 * checks what Jackson cannot: which fields each block type requires or forbids, ID
 * uniqueness, the 1–3 word blank rule and size limits.
 *
 * Returns a normalized copy: blank answers trimmed with inner whitespace collapsed,
 * {@code numbered} defaulting to false and {@code align} to LEFT. Text segments are
 * kept exactly as written, because the spaces around a blank are part of the line.
 */
@Component
public class NoteContentValidator {

    static final int MAX_BLOCKS = 200;
    static final int MAX_TOTAL_CHARACTERS = 50_000;
    static final int MAX_SEGMENTS_PER_LINE = 100;
    static final int MAX_LIST_ITEMS = 50;
    static final int MAX_SEGMENT_TEXT_LENGTH = 2_000;
    static final int MAX_SCRIPTURE_TEXT_LENGTH = 5_000;
    static final int MAX_REFERENCE_LENGTH = 200;
    static final int MAX_PROMPT_LENGTH = 1_000;
    static final int MAX_ANSWER_LENGTH = 60;
    static final int MAX_ANSWER_WORDS = 3;

    // Short and URL/JSON-safe; the dashboard generates these and keeps them stable
    // across edits, because attempts and personal notes point at them.
    private static final Pattern ID_PATTERN = Pattern.compile("^[A-Za-z0-9_-]{1,40}$");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    public List<NoteBlock> validate(List<NoteBlock> blocks) {
        if (blocks == null) {
            throw new SermonNoteContentValidationException("blocks is required");
        }
        if (blocks.size() > MAX_BLOCKS) {
            throw new SermonNoteContentValidationException(
                    "A note can have at most " + MAX_BLOCKS + " blocks (got " + blocks.size() + ")");
        }

        Context context = new Context();
        List<NoteBlock> normalized = new ArrayList<>(blocks.size());
        for (int index = 0; index < blocks.size(); index++) {
            normalized.add(validateBlock(blocks.get(index), index + 1, context));
        }

        if (context.totalCharacters > MAX_TOTAL_CHARACTERS) {
            throw new SermonNoteContentValidationException(
                    "The note is too long: at most " + MAX_TOTAL_CHARACTERS + " characters of text in total");
        }
        return normalized;
    }

    private NoteBlock validateBlock(NoteBlock block, int position, Context context) {
        if (block == null) {
            throw new SermonNoteContentValidationException("Block " + position + " is empty");
        }

        String label = "Block " + position;
        if (block.id() == null || !ID_PATTERN.matcher(block.id()).matches()) {
            throw new SermonNoteContentValidationException(
                    label + ": id is required and may only contain letters, digits, '-' and '_' (max 40)");
        }
        label = label + " (" + block.id() + ")";
        if (!context.blockIds.add(block.id())) {
            throw new SermonNoteContentValidationException(label + ": duplicate block id");
        }
        if (block.type() == null) {
            throw new SermonNoteContentValidationException(label + ": type is required");
        }
        label = label + " " + block.type();

        return switch (block.type()) {
            case HEADING -> validateHeading(block, label, context);
            case SCRIPTURE -> validateScripture(block, label, context);
            case PARAGRAPH -> validateParagraph(block, label, context);
            case LIST -> validateList(block, label, context);
            case REFLECTION -> validateReflection(block, label, context);
        };
    }

    private NoteBlock validateHeading(NoteBlock block, String label, Context context) {
        forbid(label, "text", block.text());
        forbid(label, "reference", block.reference());
        forbid(label, "align", block.align());
        forbid(label, "items", block.items());
        forbid(label, "prompt", block.prompt());
        List<NoteSegment> segments = validateLine(block.segments(), label + ": segments", context);
        boolean numbered = Boolean.TRUE.equals(block.numbered());
        return new NoteBlock(block.id(), BlockType.HEADING, segments, numbered, null, null, null, null, null);
    }

    private NoteBlock validateScripture(NoteBlock block, String label, Context context) {
        forbid(label, "segments", block.segments());
        forbid(label, "numbered", block.numbered());
        forbid(label, "align", block.align());
        forbid(label, "items", block.items());
        forbid(label, "prompt", block.prompt());
        String text = requireText(label, "text", block.text(), MAX_SCRIPTURE_TEXT_LENGTH, context);
        String reference = requireText(label, "reference", block.reference(), MAX_REFERENCE_LENGTH, context);
        return new NoteBlock(block.id(), BlockType.SCRIPTURE, null, null, text, reference, null, null, null);
    }

    private NoteBlock validateParagraph(NoteBlock block, String label, Context context) {
        forbid(label, "numbered", block.numbered());
        forbid(label, "text", block.text());
        forbid(label, "reference", block.reference());
        forbid(label, "items", block.items());
        forbid(label, "prompt", block.prompt());
        List<NoteSegment> segments = validateLine(block.segments(), label + ": segments", context);
        TextAlign align = block.align() == null ? TextAlign.LEFT : block.align();
        return new NoteBlock(block.id(), BlockType.PARAGRAPH, segments, null, null, null, align, null, null);
    }

    private NoteBlock validateList(NoteBlock block, String label, Context context) {
        forbid(label, "segments", block.segments());
        forbid(label, "numbered", block.numbered());
        forbid(label, "text", block.text());
        forbid(label, "reference", block.reference());
        forbid(label, "align", block.align());
        forbid(label, "prompt", block.prompt());
        List<List<NoteSegment>> items = block.items();
        if (items == null || items.isEmpty()) {
            throw new SermonNoteContentValidationException(label + ": items needs at least one item");
        }
        if (items.size() > MAX_LIST_ITEMS) {
            throw new SermonNoteContentValidationException(
                    label + ": at most " + MAX_LIST_ITEMS + " items (got " + items.size() + ")");
        }
        List<List<NoteSegment>> normalizedItems = new ArrayList<>(items.size());
        for (int index = 0; index < items.size(); index++) {
            normalizedItems.add(validateLine(items.get(index), label + ": item " + (index + 1), context));
        }
        return new NoteBlock(block.id(), BlockType.LIST, null, null, null, null, null, normalizedItems, null);
    }

    private NoteBlock validateReflection(NoteBlock block, String label, Context context) {
        forbid(label, "segments", block.segments());
        forbid(label, "numbered", block.numbered());
        forbid(label, "text", block.text());
        forbid(label, "reference", block.reference());
        forbid(label, "align", block.align());
        forbid(label, "items", block.items());
        String prompt = requireText(label, "prompt", block.prompt(), MAX_PROMPT_LENGTH, context);
        return new NoteBlock(block.id(), BlockType.REFLECTION, null, null, null, null, null, null, prompt);
    }

    // A line of segments: used by HEADING, PARAGRAPH and each LIST item, so blanks
    // behave the same way in every block type.
    private List<NoteSegment> validateLine(List<NoteSegment> segments, String label, Context context) {
        if (segments == null || segments.isEmpty()) {
            throw new SermonNoteContentValidationException(label + " needs at least one segment");
        }
        if (segments.size() > MAX_SEGMENTS_PER_LINE) {
            throw new SermonNoteContentValidationException(
                    label + ": at most " + MAX_SEGMENTS_PER_LINE + " segments (got " + segments.size() + ")");
        }

        List<NoteSegment> normalized = new ArrayList<>(segments.size());
        boolean hasVisibleContent = false;
        for (int index = 0; index < segments.size(); index++) {
            NoteSegment segment = segments.get(index);
            String segmentLabel = label + ", segment " + (index + 1);
            if (segment == null) {
                throw new SermonNoteContentValidationException(segmentLabel + " is empty");
            }

            boolean isText = segment.text() != null;
            boolean isBlank = segment.blankId() != null || segment.answer() != null;
            if (isText == isBlank) {
                throw new SermonNoteContentValidationException(
                        segmentLabel + " must be either {text} or {blankId, answer}");
            }

            if (isText) {
                if (segment.text().isEmpty()) {
                    throw new SermonNoteContentValidationException(segmentLabel + ": text must not be empty");
                }
                if (segment.text().length() > MAX_SEGMENT_TEXT_LENGTH) {
                    throw new SermonNoteContentValidationException(
                            segmentLabel + ": text is longer than " + MAX_SEGMENT_TEXT_LENGTH + " characters");
                }
                context.totalCharacters += segment.text().length();
                hasVisibleContent |= !segment.text().isBlank();
                normalized.add(segment);
            } else {
                normalized.add(validateBlank(segment, segmentLabel, context));
                hasVisibleContent = true;
            }
        }

        if (!hasVisibleContent) {
            throw new SermonNoteContentValidationException(label + " has no text and no blanks");
        }
        return normalized;
    }

    private NoteSegment validateBlank(NoteSegment segment, String label, Context context) {
        String blankId = segment.blankId();
        if (blankId == null || !ID_PATTERN.matcher(blankId).matches()) {
            throw new SermonNoteContentValidationException(
                    label + ": blankId is required and may only contain letters, digits, '-' and '_' (max 40)");
        }
        if (!context.blankIds.add(blankId)) {
            throw new SermonNoteContentValidationException(label + ": duplicate blankId " + blankId);
        }

        String answer = segment.answer() == null ? "" : WHITESPACE.matcher(segment.answer().strip()).replaceAll(" ");
        if (answer.isEmpty()) {
            throw new SermonNoteContentValidationException(label + ": blank " + blankId + " needs an answer");
        }
        int words = answer.split(" ").length;
        if (words > MAX_ANSWER_WORDS) {
            throw new SermonNoteContentValidationException(
                    label + ": the answer for blank " + blankId + " must be 1 to 3 words (got " + words + ")");
        }
        if (answer.length() > MAX_ANSWER_LENGTH) {
            throw new SermonNoteContentValidationException(
                    label + ": the answer for blank " + blankId + " is longer than " + MAX_ANSWER_LENGTH + " characters");
        }
        context.totalCharacters += answer.length();
        return new NoteSegment(null, blankId, answer);
    }

    private String requireText(String label, String field, String value, int maxLength, Context context) {
        if (value == null || value.isBlank()) {
            throw new SermonNoteContentValidationException(label + ": " + field + " is required");
        }
        String trimmed = value.strip();
        if (trimmed.length() > maxLength) {
            throw new SermonNoteContentValidationException(
                    label + ": " + field + " is longer than " + maxLength + " characters");
        }
        context.totalCharacters += trimmed.length();
        return trimmed;
    }

    private void forbid(String label, String field, Object value) {
        if (value != null) {
            throw new SermonNoteContentValidationException(label + ": " + field + " is not allowed on this block type");
        }
    }

    private static final class Context {
        private final Set<String> blockIds = new HashSet<>();
        private final Set<String> blankIds = new HashSet<>();
        private int totalCharacters;
    }
}
