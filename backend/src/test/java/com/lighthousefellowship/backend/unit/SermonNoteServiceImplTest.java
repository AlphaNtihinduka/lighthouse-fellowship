package com.lighthousefellowship.backend.unit;

import com.lighthousefellowship.backend.dto.request.PublishSermonNoteRequestDTO;
import com.lighthousefellowship.backend.dto.request.SermonNoteRequestDTO;
import com.lighthousefellowship.backend.dto.response.AdminSermonNoteResponseDTO;
import com.lighthousefellowship.backend.exception.DuplicateSermonDateException;
import com.lighthousefellowship.backend.exception.InvalidNoteFilterException;
import com.lighthousefellowship.backend.exception.InvalidSermonDateException;
import com.lighthousefellowship.backend.exception.SermonNoteNotFoundException;
import com.lighthousefellowship.backend.exception.SermonNoteNotPublishableException;
import com.lighthousefellowship.backend.mapper.SermonNoteMapper;
import com.lighthousefellowship.backend.mapper.SermonNoteMapperImpl;
import com.lighthousefellowship.backend.model.NoteBlock;
import com.lighthousefellowship.backend.model.SermonNote;
import com.lighthousefellowship.backend.model.enums.BlockType;
import com.lighthousefellowship.backend.model.enums.NoteStatus;
import com.lighthousefellowship.backend.repository.SermonNoteRepository;
import com.lighthousefellowship.backend.service.CoverImageStorageService;
import com.lighthousefellowship.backend.service.impl.SermonNoteServiceImpl;
import com.lighthousefellowship.backend.service.support.AdminPrincipal;
import com.lighthousefellowship.backend.service.support.NoteContentValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SermonNoteServiceImplTest {

    private static final Instant NOW = Instant.parse("2026-09-10T10:00:00Z");
    private static final LocalDate SUNDAY = LocalDate.of(2026, 9, 13);
    private static final List<NoteBlock> BLOCKS = List.of(
            new NoteBlock("r1", BlockType.REFLECTION, null, null, null, null, null, null, "What is God showing me?"));

    @Mock
    private SermonNoteRepository sermonNoteRepository;

    @Mock
    private CoverImageStorageService coverImageStorageService;

    private SermonNoteServiceImpl service;
    private final AdminPrincipal principal = new AdminPrincipal(UUID.randomUUID(), "a@example.com", "Admin", List.of());

    @BeforeEach
    void setUp() {
        SermonNoteMapper mapper = new SermonNoteMapperImpl();
        service = new SermonNoteServiceImpl(sermonNoteRepository, new NoteContentValidator(), coverImageStorageService,
                mapper, Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private static SermonNoteRequestDTO request(LocalDate date, String preacher, List<NoteBlock> blocks) {
        return new SermonNoteRequestDTO("Killing Giants", date, preacher, blocks);
    }

    private static SermonNote existingNote(UUID id) {
        SermonNote note = new SermonNote();
        note.setId(id);
        note.setTitle("Killing Giants");
        note.setPreacherName(SermonNoteServiceImpl.DEFAULT_PREACHER);
        note.setSermonDate(SUNDAY);
        note.setBlocks(BLOCKS);
        note.setContentVersion(3);
        note.setCreatedAt(NOW);
        note.setUpdatedAt(NOW);
        return note;
    }

    @Test
    void createDefaultsThePreacherAndStartsAtContentVersionOne() {
        when(sermonNoteRepository.save(any(SermonNote.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AdminSermonNoteResponseDTO response = service.createNote(request(SUNDAY, "  ", BLOCKS), principal);

        assertThat(response.getPreacherName()).isEqualTo("Pastor Joe Benecasa");
        assertThat(response.getContentVersion()).isEqualTo(1);
        assertThat(response.getStatus()).isEqualTo(NoteStatus.DRAFT);
        assertThat(response.getCreatedAt()).isEqualTo(NOW);
    }

    @Test
    void createKeepsAGuestPreacher() {
        when(sermonNoteRepository.save(any(SermonNote.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AdminSermonNoteResponseDTO response = service.createNote(request(SUNDAY, " Rev. Bill Steinmetz ", BLOCKS), principal);

        assertThat(response.getPreacherName()).isEqualTo("Rev. Bill Steinmetz");
    }

    @Test
    void createRejectsANonSunday() {
        assertThatThrownBy(() -> service.createNote(request(LocalDate.of(2026, 9, 14), null, BLOCKS), principal))
                .isInstanceOf(InvalidSermonDateException.class)
                .hasMessageContaining("MONDAY");
        verify(sermonNoteRepository, never()).save(any());
    }

    @Test
    void createRejectsASecondNoteForTheSameSunday() {
        when(sermonNoteRepository.existsBySermonDate(SUNDAY)).thenReturn(true);

        assertThatThrownBy(() -> service.createNote(request(SUNDAY, null, BLOCKS), principal))
                .isInstanceOf(DuplicateSermonDateException.class);
    }

    @Test
    void updateBumpsContentVersionWhenSomethingChanges() {
        UUID id = UUID.randomUUID();
        when(sermonNoteRepository.findById(id)).thenReturn(Optional.of(existingNote(id)));
        when(sermonNoteRepository.save(any(SermonNote.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SermonNoteRequestDTO changed = new SermonNoteRequestDTO("Killing Giants (revised)", SUNDAY, null, BLOCKS);
        assertThat(service.updateNote(id, changed).getContentVersion()).isEqualTo(4);
    }

    @Test
    void updateKeepsContentVersionWhenNothingChanges() {
        UUID id = UUID.randomUUID();
        when(sermonNoteRepository.findById(id)).thenReturn(Optional.of(existingNote(id)));

        assertThat(service.updateNote(id, request(SUNDAY, null, BLOCKS)).getContentVersion()).isEqualTo(3);
        verify(sermonNoteRepository, never()).save(any());
    }

    @Test
    void updateOfAMissingNoteIsNotFound() {
        UUID id = UUID.randomUUID();
        when(sermonNoteRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateNote(id, request(SUNDAY, null, BLOCKS)))
                .isInstanceOf(SermonNoteNotFoundException.class);
    }

    @Test
    void publishWithoutATimePublishesNow() {
        UUID id = UUID.randomUUID();
        when(sermonNoteRepository.findById(id)).thenReturn(Optional.of(existingNote(id)));
        when(sermonNoteRepository.save(any(SermonNote.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AdminSermonNoteResponseDTO response = service.publishNote(id, null);

        assertThat(response.getPublishAt()).isEqualTo(NOW);
        assertThat(response.getStatus()).isEqualTo(NoteStatus.PUBLISHED);
    }

    @Test
    void publishInTheFutureSchedules() {
        UUID id = UUID.randomUUID();
        when(sermonNoteRepository.findById(id)).thenReturn(Optional.of(existingNote(id)));
        when(sermonNoteRepository.save(any(SermonNote.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Instant sundayMorning = Instant.parse("2026-09-13T07:00:00Z");
        AdminSermonNoteResponseDTO response = service.publishNote(id, new PublishSermonNoteRequestDTO(sundayMorning));

        assertThat(response.getPublishAt()).isEqualTo(sundayMorning);
        assertThat(response.getStatus()).isEqualTo(NoteStatus.SCHEDULED);
    }

    @Test
    void publishRefusesAnEmptyNote() {
        UUID id = UUID.randomUUID();
        SermonNote empty = existingNote(id);
        empty.setBlocks(List.of());
        when(sermonNoteRepository.findById(id)).thenReturn(Optional.of(empty));

        assertThatThrownBy(() -> service.publishNote(id, null)).isInstanceOf(SermonNoteNotPublishableException.class);
    }

    @Test
    void unpublishTurnsTheNoteBackIntoADraft() {
        UUID id = UUID.randomUUID();
        SermonNote published = existingNote(id);
        published.setPublishAt(NOW.minusSeconds(60));
        when(sermonNoteRepository.findById(id)).thenReturn(Optional.of(published));
        when(sermonNoteRepository.save(any(SermonNote.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AdminSermonNoteResponseDTO response = service.unpublishNote(id);

        assertThat(response.getPublishAt()).isNull();
        assertThat(response.getStatus()).isEqualTo(NoteStatus.DRAFT);
    }

    @Test
    void listRejectsAMonthWithoutAYear() {
        assertThatThrownBy(() -> service.listNotes(null, 9)).isInstanceOf(InvalidNoteFilterException.class);
    }

    @Test
    void listRejectsAnInvalidMonth() {
        assertThatThrownBy(() -> service.listNotes(2026, 13)).isInstanceOf(InvalidNoteFilterException.class);
    }
}
