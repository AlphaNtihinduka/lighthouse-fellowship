package com.lighthousefellowship.backend.service.impl;

import com.lighthousefellowship.backend.dto.request.PublishSermonNoteRequestDTO;
import com.lighthousefellowship.backend.dto.request.SermonNoteRequestDTO;
import com.lighthousefellowship.backend.dto.response.AdminSermonNoteResponseDTO;
import com.lighthousefellowship.backend.dto.response.AdminSermonNoteSummaryResponseDTO;
import com.lighthousefellowship.backend.exception.CoverImageValidationException;
import com.lighthousefellowship.backend.exception.DuplicateSermonDateException;
import com.lighthousefellowship.backend.exception.InvalidNoteFilterException;
import com.lighthousefellowship.backend.exception.InvalidSermonDateException;
import com.lighthousefellowship.backend.exception.SermonNoteNotFoundException;
import com.lighthousefellowship.backend.exception.SermonNoteNotPublishableException;
import com.lighthousefellowship.backend.mapper.SermonNoteMapper;
import com.lighthousefellowship.backend.model.NoteBlock;
import com.lighthousefellowship.backend.model.SermonNote;
import com.lighthousefellowship.backend.repository.SermonNoteRepository;
import com.lighthousefellowship.backend.repository.SermonNoteSummaryView;
import com.lighthousefellowship.backend.service.CoverImageStorageService;
import com.lighthousefellowship.backend.service.SermonNoteService;
import com.lighthousefellowship.backend.service.support.AdminPrincipal;
import com.lighthousefellowship.backend.service.support.NoteContentValidator;
import com.lighthousefellowship.backend.service.support.StoredImage;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

@Service
@AllArgsConstructor
@Slf4j
public class SermonNoteServiceImpl implements SermonNoteService {

    public static final String DEFAULT_PREACHER = "Pastor Joe Benecasa";

    private static final int MIN_YEAR = 2000;
    private static final int MAX_YEAR = 2100;

    private final SermonNoteRepository sermonNoteRepository;
    private final NoteContentValidator noteContentValidator;
    private final CoverImageStorageService coverImageStorageService;
    private final SermonNoteMapper sermonNoteMapper;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public List<AdminSermonNoteSummaryResponseDTO> listNotes(Integer year, Integer month) {
        List<SermonNoteSummaryView> notes;
        if (year == null) {
            if (month != null) {
                throw new InvalidNoteFilterException("month requires year");
            }
            notes = sermonNoteRepository.findAllByOrderBySermonDateDesc();
        } else {
            requireYearInRange(year);
            LocalDate from;
            LocalDate to;
            if (month == null) {
                from = LocalDate.of(year, 1, 1);
                to = LocalDate.of(year, 12, 31);
            } else {
                if (month < 1 || month > 12) {
                    throw new InvalidNoteFilterException("month must be between 1 and 12");
                }
                YearMonth yearMonth = YearMonth.of(year, month);
                from = yearMonth.atDay(1);
                to = yearMonth.atEndOfMonth();
            }
            notes = sermonNoteRepository.findBySermonDateBetweenOrderBySermonDateDesc(from, to);
        }

        Instant now = Instant.now(clock);
        return notes.stream().map(note -> sermonNoteMapper.toAdminSummary(note, now)).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public AdminSermonNoteResponseDTO getNote(UUID id) {
        return toResponse(loadNote(id));
    }

    @Override
    @Transactional
    public AdminSermonNoteResponseDTO createNote(SermonNoteRequestDTO request, AdminPrincipal principal) {
        requireSunday(request.getSermonDate());
        if (sermonNoteRepository.existsBySermonDate(request.getSermonDate())) {
            throw new DuplicateSermonDateException(request.getSermonDate());
        }
        List<NoteBlock> blocks = noteContentValidator.validate(request.getBlocks());

        Instant now = Instant.now(clock);
        SermonNote note = new SermonNote();
        note.setId(UUID.randomUUID());
        note.setTitle(request.getTitle().strip());
        note.setPreacherName(preacherOrDefault(request.getPreacherName()));
        note.setSermonDate(request.getSermonDate());
        note.setBlocks(blocks);
        note.setContentVersion(1);
        note.setCreatedBy(principal.id());
        note.setCreatedAt(now);
        note.setUpdatedAt(now);

        SermonNote saved = sermonNoteRepository.save(note);
        log.info("Sermon note created noteId={} sermonDate={} adminId={}", saved.getId(), saved.getSermonDate(), principal.id());
        return toResponse(saved);
    }

    // Saving never changes visibility; that is publish/unpublish. contentVersion goes
    // up whenever anything the app shows changes, so phones refresh their offline copy.
    @Override
    @Transactional
    public AdminSermonNoteResponseDTO updateNote(UUID id, SermonNoteRequestDTO request) {
        SermonNote note = loadNote(id);

        requireSunday(request.getSermonDate());
        if (sermonNoteRepository.existsBySermonDateAndIdNot(request.getSermonDate(), id)) {
            throw new DuplicateSermonDateException(request.getSermonDate());
        }
        List<NoteBlock> blocks = noteContentValidator.validate(request.getBlocks());
        String title = request.getTitle().strip();
        String preacherName = preacherOrDefault(request.getPreacherName());

        boolean changed = !title.equals(note.getTitle())
                || !preacherName.equals(note.getPreacherName())
                || !request.getSermonDate().equals(note.getSermonDate())
                || !blocks.equals(note.getBlocks());
        if (!changed) {
            return toResponse(note);
        }

        note.setTitle(title);
        note.setPreacherName(preacherName);
        note.setSermonDate(request.getSermonDate());
        note.setBlocks(blocks);
        note.setContentVersion(note.getContentVersion() + 1);
        note.setUpdatedAt(Instant.now(clock));

        SermonNote saved = sermonNoteRepository.save(note);
        log.info("Sermon note updated noteId={} contentVersion={}", saved.getId(), saved.getContentVersion());
        return toResponse(saved);
    }

    @Override
    @Transactional
    public void deleteNote(UUID id) {
        SermonNote note = loadNote(id);
        sermonNoteRepository.delete(note);
        log.info("Sermon note deleted noteId={} sermonDate={}", note.getId(), note.getSermonDate());
        deleteCoverAfterCommit(note.getCoverImagePublicId());
    }

    // Not @Transactional as a whole: the Cloudinary upload is slow and must not hold
    // a database transaction open. The note is checked first so a bad id never uploads.
    @Override
    public AdminSermonNoteResponseDTO uploadCoverImage(UUID id, MultipartFile file) {
        loadNote(id);
        byte[] image = readValidatedImage(file);

        StoredImage stored = coverImageStorageService.upload(image, id);

        SermonNote note = loadNote(id);
        String previousPublicId = note.getCoverImagePublicId();
        note.setCoverImageUrl(stored.url());
        note.setCoverImagePublicId(stored.publicId());
        note.setContentVersion(note.getContentVersion() + 1);
        note.setUpdatedAt(Instant.now(clock));
        SermonNote saved = sermonNoteRepository.save(note);
        log.info("Sermon note cover image set noteId={}", saved.getId());

        if (previousPublicId != null && !previousPublicId.equals(stored.publicId())) {
            coverImageStorageService.delete(previousPublicId);
        }
        return toResponse(saved);
    }

    @Override
    @Transactional
    public AdminSermonNoteResponseDTO publishNote(UUID id, PublishSermonNoteRequestDTO request) {
        SermonNote note = loadNote(id);
        if (note.getBlocks() == null || note.getBlocks().isEmpty()) {
            throw new SermonNoteNotPublishableException("A note needs at least one block before it can be published");
        }

        Instant now = Instant.now(clock);
        Instant publishAt = request == null || request.getPublishAt() == null ? now : request.getPublishAt();
        note.setPublishAt(publishAt);
        note.setUpdatedAt(now);

        SermonNote saved = sermonNoteRepository.save(note);
        log.info("Sermon note {} noteId={} publishAt={}",
                publishAt.isAfter(now) ? "scheduled" : "published", saved.getId(), publishAt);
        return toResponse(saved);
    }

    @Override
    @Transactional
    public AdminSermonNoteResponseDTO unpublishNote(UUID id) {
        SermonNote note = loadNote(id);
        note.setPublishAt(null);
        note.setUpdatedAt(Instant.now(clock));

        SermonNote saved = sermonNoteRepository.save(note);
        log.info("Sermon note unpublished noteId={}", saved.getId());
        return toResponse(saved);
    }

    private SermonNote loadNote(UUID id) {
        return sermonNoteRepository.findById(id).orElseThrow(() -> new SermonNoteNotFoundException(id));
    }

    private AdminSermonNoteResponseDTO toResponse(SermonNote note) {
        return sermonNoteMapper.toAdminResponse(note, Instant.now(clock));
    }

    private static void requireSunday(LocalDate sermonDate) {
        if (sermonDate.getDayOfWeek() != DayOfWeek.SUNDAY) {
            throw new InvalidSermonDateException(sermonDate);
        }
        requireYearInRange(sermonDate.getYear());
    }

    private static void requireYearInRange(int year) {
        if (year < MIN_YEAR || year > MAX_YEAR) {
            throw new InvalidNoteFilterException("year must be between " + MIN_YEAR + " and " + MAX_YEAR);
        }
    }

    private static String preacherOrDefault(String preacherName) {
        return preacherName == null || preacherName.isBlank() ? DEFAULT_PREACHER : preacherName.strip();
    }

    // Only remove the image from Cloudinary once the row is really gone; if the
    // delete rolls back, the note must keep a working cover.
    private void deleteCoverAfterCommit(String publicId) {
        if (publicId == null) {
            return;
        }
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            coverImageStorageService.delete(publicId);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                coverImageStorageService.delete(publicId);
            }
        });
    }

    // Checks the file's first bytes, not just the client-supplied Content-Type.
    private static byte[] readValidatedImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new CoverImageValidationException("Choose an image file to upload");
        }
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException exception) {
            throw new CoverImageValidationException("The uploaded file could not be read");
        }
        if (!isJpeg(bytes) && !isPng(bytes) && !isWebp(bytes)) {
            throw new CoverImageValidationException("The cover image must be a JPEG, PNG or WebP file");
        }
        return bytes;
    }

    private static boolean isJpeg(byte[] bytes) {
        return startsWith(bytes, 0, 0xFF, 0xD8, 0xFF);
    }

    private static boolean isPng(byte[] bytes) {
        return startsWith(bytes, 0, 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A);
    }

    private static boolean isWebp(byte[] bytes) {
        return startsWith(bytes, 0, 'R', 'I', 'F', 'F') && startsWith(bytes, 8, 'W', 'E', 'B', 'P');
    }

    private static boolean startsWith(byte[] bytes, int offset, int... expected) {
        if (bytes.length < offset + expected.length) {
            return false;
        }
        for (int i = 0; i < expected.length; i++) {
            if ((bytes[offset + i] & 0xFF) != expected[i]) {
                return false;
            }
        }
        return true;
    }
}
