package com.lighthousefellowship.backend.unit;

import com.lighthousefellowship.backend.exception.SermonNoteContentValidationException;
import com.lighthousefellowship.backend.model.NoteBlock;
import com.lighthousefellowship.backend.model.NoteSegment;
import com.lighthousefellowship.backend.model.enums.BlockType;
import com.lighthousefellowship.backend.model.enums.TextAlign;
import com.lighthousefellowship.backend.service.support.NoteContentValidator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class NoteContentValidatorTest {

    private final NoteContentValidator validator = new NoteContentValidator();

    private static NoteSegment text(String text) {
        return new NoteSegment(text, null, null);
    }

    private static NoteSegment blank(String blankId, String answer) {
        return new NoteSegment(null, blankId, answer);
    }

    private static NoteBlock paragraph(String id, NoteSegment... segments) {
        return new NoteBlock(id, BlockType.PARAGRAPH, List.of(segments), null, null, null, null, null, null);
    }

    private static NoteBlock heading(String id, Boolean numbered, NoteSegment... segments) {
        return new NoteBlock(id, BlockType.HEADING, List.of(segments), numbered, null, null, null, null, null);
    }

    private static NoteBlock scripture(String id, String text, String reference) {
        return new NoteBlock(id, BlockType.SCRIPTURE, null, null, text, reference, null, null, null);
    }

    private static NoteBlock list(String id, List<List<NoteSegment>> items) {
        return new NoteBlock(id, BlockType.LIST, null, null, null, null, null, items, null);
    }

    private static NoteBlock reflection(String id, String prompt) {
        return new NoteBlock(id, BlockType.REFLECTION, null, null, null, null, null, null, prompt);
    }

    private void assertRejected(List<NoteBlock> blocks, String messageFragment) {
        assertThatThrownBy(() -> validator.validate(blocks))
                .isInstanceOf(SermonNoteContentValidationException.class)
                .hasMessageContaining(messageFragment);
    }

    @Test
    void acceptsEveryBlockTypeAndAppliesDefaults() {
        List<NoteBlock> result = validator.validate(List.of(
                heading("h1", null, text("David and Jesus remained under God's "), blank("k1", "authority"), text(".")),
                scripture("s1", "  Man looks at the outward appearance.  ", " 1st Samuel 16:7 "),
                paragraph("p1", text("God is trying to "), blank("k2", "communicate"), text(" to us.")),
                list("l1", List.of(List.of(text("Jesus is "), blank("k3", "God"), text(".")))),
                reflection("r1", "What is God showing me?")
        ));

        assertThat(result).hasSize(5);
        assertThat(result.get(0).numbered()).isFalse();
        assertThat(result.get(1).text()).isEqualTo("Man looks at the outward appearance.");
        assertThat(result.get(1).reference()).isEqualTo("1st Samuel 16:7");
        assertThat(result.get(2).align()).isEqualTo(TextAlign.LEFT);
    }

    @Test
    void acceptsAnEmptyNoteAsADraft() {
        assertThat(validator.validate(List.of())).isEmpty();
    }

    @ParameterizedTest
    @ValueSource(strings = {"authority", "defeat them", "overcame these attacks"})
    void acceptsOneTwoAndThreeWordAnswers(String answer) {
        List<NoteBlock> result = validator.validate(List.of(paragraph("p1", text("x "), blank("k1", answer))));
        assertThat(result.getFirst().segments().get(1).answer()).isEqualTo(answer);
    }

    @Test
    void normalizesAnswerWhitespaceButKeepsTextSpacing() {
        List<NoteBlock> result = validator.validate(List.of(
                paragraph("p1", text(" we are going to "), blank("k1", "  defeat \t  them "))));

        assertThat(result.getFirst().segments().get(0).text()).isEqualTo(" we are going to ");
        assertThat(result.getFirst().segments().get(1).answer()).isEqualTo("defeat them");
    }

    @Test
    void acceptsSideBySideBlanks() {
        List<NoteBlock> result = validator.validate(List.of(
                paragraph("p1", text("David and Jesus were both "), blank("k1", "unexpected"), text(" "),
                        blank("k2", "kings"), text("."))));
        assertThat(result.getFirst().segments()).hasSize(5);
    }

    @Test
    void acceptsTheSameAnswerInTwoBlanks() {
        validator.validate(List.of(
                paragraph("p1", text("the man they "), blank("k1", "wanted")),
                paragraph("p2", text("the man He "), blank("k2", "wanted"))));
    }

    @Test
    void rejectsAFourWordAnswer() {
        assertRejected(List.of(paragraph("p1", blank("k1", "one two three four"))), "must be 1 to 3 words (got 4)");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "\t\n"})
    void rejectsAnEmptyOrWhitespaceAnswer(String answer) {
        assertRejected(List.of(paragraph("p1", text("x "), blank("k1", answer))), "needs an answer");
    }

    @Test
    void rejectsABlankWithoutAnAnswer() {
        assertRejected(List.of(paragraph("p1", blank("k1", null))), "needs an answer");
    }

    @Test
    void rejectsAnOverlongAnswer() {
        assertRejected(List.of(paragraph("p1", blank("k1", "a".repeat(61)))), "longer than 60");
    }

    @Test
    void rejectsADuplicateBlockId() {
        assertRejected(List.of(reflection("b1", "One?"), reflection("b1", "Two?")), "duplicate block id");
    }

    @Test
    void rejectsADuplicateBlankIdAcrossBlocks() {
        assertRejected(List.of(
                paragraph("p1", blank("k1", "one")),
                heading("h1", true, blank("k1", "two"))), "duplicate blankId k1");
    }

    @Test
    void rejectsASegmentWithBothTextAndBlank() {
        assertRejected(List.of(paragraph("p1", new NoteSegment("text", "k1", "answer"))),
                "must be either {text} or {blankId, answer}");
    }

    @Test
    void rejectsASegmentWithNeitherTextNorBlank() {
        assertRejected(List.of(paragraph("p1", new NoteSegment(null, null, null))),
                "must be either {text} or {blankId, answer}");
    }

    @Test
    void rejectsAnswerWithoutBlankId() {
        assertRejected(List.of(paragraph("p1", new NoteSegment(null, null, "answer"))), "blankId is required");
    }

    @Test
    void rejectsAnEmptyTextSegment() {
        assertRejected(List.of(paragraph("p1", text(""))), "text must not be empty");
    }

    @Test
    void rejectsALineWithOnlyWhitespace() {
        assertRejected(List.of(paragraph("p1", text("   "))), "has no text and no blanks");
    }

    @Test
    void rejectsAMissingType() {
        assertRejected(List.of(new NoteBlock("b1", null, null, null, null, null, null, null, null)), "type is required");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "has space", "with/slash", "this-id-is-much-longer-than-forty-characters-long"})
    void rejectsAnInvalidBlockId(String id) {
        assertRejected(List.of(reflection(id, "Prompt?")), "id is required");
    }

    @Test
    void rejectsScriptureWithoutReference() {
        assertRejected(List.of(scripture("s1", "Text", " ")), "reference is required");
    }

    @Test
    void rejectsScriptureWithoutText() {
        assertRejected(List.of(scripture("s1", null, "John 3:16")), "text is required");
    }

    @Test
    void rejectsAListWithoutItems() {
        assertRejected(List.of(list("l1", List.of())), "items needs at least one item");
    }

    @Test
    void rejectsAListWithAnEmptyItem() {
        assertRejected(List.of(list("l1", List.of(List.of()))), "item 1 needs at least one segment");
    }

    @Test
    void rejectsAReflectionWithoutPrompt() {
        assertRejected(List.of(reflection("r1", null)), "prompt is required");
    }

    @Test
    void rejectsAHeadingWithoutSegments() {
        assertRejected(List.of(new NoteBlock("h1", BlockType.HEADING, null, true, null, null, null, null, null)),
                "segments needs at least one segment");
    }

    @Test
    void rejectsAFieldThatDoesNotBelongToTheBlockType() {
        assertRejected(List.of(new NoteBlock("s1", BlockType.SCRIPTURE, List.of(text("x")), null, "Text", "Ref",
                null, null, null)), "segments is not allowed");
        assertRejected(List.of(new NoteBlock("h1", BlockType.HEADING, List.of(text("x")), true, null, null,
                TextAlign.CENTER, null, null)), "align is not allowed");
    }

    @Test
    void rejectsANullBlock() {
        List<NoteBlock> blocks = new ArrayList<>();
        blocks.add(null);
        assertRejected(blocks, "Block 1 is empty");
    }

    @Test
    void rejectsTooManyBlocks() {
        List<NoteBlock> blocks = new ArrayList<>();
        for (int i = 0; i < 201; i++) {
            blocks.add(reflection("r" + i, "Prompt?"));
        }
        assertRejected(blocks, "at most 200 blocks");
    }

    @Test
    void rejectsANoteThatIsTooLongInTotal() {
        List<NoteBlock> blocks = new ArrayList<>();
        for (int i = 0; i < 11; i++) {
            blocks.add(scripture("s" + i, "a".repeat(5_000), "Ref"));
        }
        assertRejected(blocks, "too long");
    }

    @Test
    void namesTheBlockInTheMessage() {
        assertRejected(List.of(reflection("r1", "Fine?"), scripture("verse", "Text", null)),
                "Block 2 (verse) SCRIPTURE: reference is required");
    }

    @Test
    void rejectsNullBlocks() {
        assertRejected(null, "blocks is required");
    }

    @Test
    void doesNotChangeAnAlreadyNormalizedNote() {
        List<NoteBlock> blocks = List.of(
                heading("h1", true, text("Heading "), blank("k1", "two words")),
                new NoteBlock("p1", BlockType.PARAGRAPH, List.of(text("x")), null, null, null, TextAlign.CENTER, null, null),
                list("l1", List.of(List.of(text("item")))));

        assertThat(validator.validate(blocks)).isEqualTo(blocks);
    }
}
