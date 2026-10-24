package com.lighthousefellowship.backend.controller;

import com.lighthousefellowship.backend.dto.request.PublishSermonNoteRequestDTO;
import com.lighthousefellowship.backend.dto.request.SermonNoteRequestDTO;
import com.lighthousefellowship.backend.dto.response.AdminSermonNoteResponseDTO;
import com.lighthousefellowship.backend.dto.response.AdminSermonNoteSummaryResponseDTO;
import com.lighthousefellowship.backend.service.SermonNoteService;
import com.lighthousefellowship.backend.service.support.AdminPrincipal;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/notes")
@AllArgsConstructor
public class AdminSermonNoteController {

    private final SermonNoteService sermonNoteService;

    @GetMapping
    public ResponseEntity<List<AdminSermonNoteSummaryResponseDTO>> listNotes(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month
    ) {
        return ResponseEntity.ok(sermonNoteService.listNotes(year, month));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AdminSermonNoteResponseDTO> getNote(@PathVariable UUID id) {
        return ResponseEntity.ok(sermonNoteService.getNote(id));
    }

    @PostMapping
    public ResponseEntity<AdminSermonNoteResponseDTO> createNote(
            @AuthenticationPrincipal AdminPrincipal principal,
            @Valid @RequestBody SermonNoteRequestDTO request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sermonNoteService.createNote(request, principal));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AdminSermonNoteResponseDTO> updateNote(
            @PathVariable UUID id,
            @Valid @RequestBody SermonNoteRequestDTO request
    ) {
        return ResponseEntity.ok(sermonNoteService.updateNote(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNote(@PathVariable UUID id) {
        sermonNoteService.deleteNote(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/{id}/cover-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AdminSermonNoteResponseDTO> uploadCoverImage(
            @PathVariable UUID id,
            @RequestPart("file") MultipartFile file
    ) {
        return ResponseEntity.ok(sermonNoteService.uploadCoverImage(id, file));
    }

    // Body is optional: no body or no publishAt means publish now.
    @PatchMapping("/{id}/publish")
    public ResponseEntity<AdminSermonNoteResponseDTO> publishNote(
            @PathVariable UUID id,
            @RequestBody(required = false) PublishSermonNoteRequestDTO request
    ) {
        return ResponseEntity.ok(sermonNoteService.publishNote(id, request));
    }

    @PatchMapping("/{id}/unpublish")
    public ResponseEntity<AdminSermonNoteResponseDTO> unpublishNote(@PathVariable UUID id) {
        return ResponseEntity.ok(sermonNoteService.unpublishNote(id));
    }
}
