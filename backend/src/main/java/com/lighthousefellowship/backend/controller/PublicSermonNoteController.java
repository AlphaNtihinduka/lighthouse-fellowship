package com.lighthousefellowship.backend.controller;

import com.lighthousefellowship.backend.dto.response.PublicSermonNoteResponseDTO;
import com.lighthousefellowship.backend.dto.response.PublicSermonNoteSummaryResponseDTO;
import com.lighthousefellowship.backend.service.PublicSermonNoteService;
import lombok.AllArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

// No token needed: the app reads every published note anonymously. Unpublished and
// missing notes both return 404.
@RestController
@RequestMapping("/api/notes")
@AllArgsConstructor
public class PublicSermonNoteController {

    private final PublicSermonNoteService publicSermonNoteService;

    @GetMapping
    public ResponseEntity<List<PublicSermonNoteSummaryResponseDTO>> listNotes(
            @RequestParam(required = false) Integer year
    ) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .body(publicSermonNoteService.listPublishedNotes(year));
    }

    @GetMapping("/latest")
    public ResponseEntity<PublicSermonNoteResponseDTO> getLatestNote() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .body(publicSermonNoteService.getLatestNote());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PublicSermonNoteResponseDTO> getNote(@PathVariable UUID id) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .body(publicSermonNoteService.getPublishedNote(id));
    }
}
