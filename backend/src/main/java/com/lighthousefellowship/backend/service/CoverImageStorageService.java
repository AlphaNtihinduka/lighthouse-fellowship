package com.lighthousefellowship.backend.service;

import com.lighthousefellowship.backend.service.support.StoredImage;

import java.util.UUID;

public interface CoverImageStorageService {

    StoredImage upload(byte[] image, UUID noteId);

    // Best effort: a failure is logged, never thrown, so it cannot undo a note change.
    void delete(String publicId);
}
