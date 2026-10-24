package com.lighthousefellowship.backend.service;

import com.lighthousefellowship.backend.dto.request.PublishSermonNoteRequestDTO;
import com.lighthousefellowship.backend.dto.request.SermonNoteRequestDTO;
import com.lighthousefellowship.backend.dto.response.AdminSermonNoteResponseDTO;
import com.lighthousefellowship.backend.dto.response.AdminSermonNoteSummaryResponseDTO;
import com.lighthousefellowship.backend.service.support.AdminPrincipal;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

// Admin side of sermon notes: drafts and scheduled notes included.
public interface SermonNoteService {

    List<AdminSermonNoteSummaryResponseDTO> listNotes(Integer year, Integer month);

    AdminSermonNoteResponseDTO getNote(UUID id);

    AdminSermonNoteResponseDTO createNote(SermonNoteRequestDTO request, AdminPrincipal principal);

    AdminSermonNoteResponseDTO updateNote(UUID id, SermonNoteRequestDTO request);

    void deleteNote(UUID id);

    AdminSermonNoteResponseDTO uploadCoverImage(UUID id, MultipartFile file);

    AdminSermonNoteResponseDTO publishNote(UUID id, PublishSermonNoteRequestDTO request);

    AdminSermonNoteResponseDTO unpublishNote(UUID id);
}
