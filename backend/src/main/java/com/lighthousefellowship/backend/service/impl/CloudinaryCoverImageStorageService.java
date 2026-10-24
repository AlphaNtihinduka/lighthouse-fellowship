package com.lighthousefellowship.backend.service.impl;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.lighthousefellowship.backend.exception.CoverImageUploadException;
import com.lighthousefellowship.backend.service.CoverImageStorageService;
import com.lighthousefellowship.backend.service.support.StoredImage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

// Cover images go dashboard → backend → Cloudinary; the Cloudinary credentials never
// leave the server (secrets-and-config-management). The app only reads the HTTPS URL.
@Service
@Slf4j
public class CloudinaryCoverImageStorageService implements CoverImageStorageService {

    private final Cloudinary cloudinary;
    private final String folder;

    public CloudinaryCoverImageStorageService(
            Cloudinary cloudinary,
            @Value("${app.cloudinary.cover-folder}") String folder
    ) {
        this.cloudinary = cloudinary;
        this.folder = folder;
    }

    @Override
    public StoredImage upload(byte[] image, UUID noteId) {
        try {
            // A new public id per upload, so a replaced cover never shows up stale
            // from a CDN or phone cache under the old URL.
            Map<?, ?> result = cloudinary.uploader().upload(image, ObjectUtils.asMap(
                    "folder", folder,
                    "public_id", noteId + "-" + UUID.randomUUID().toString().substring(0, 8),
                    "resource_type", "image",
                    "overwrite", false
            ));
            String url = (String) result.get("secure_url");
            String publicId = (String) result.get("public_id");
            if (url == null || publicId == null) {
                throw new CoverImageUploadException("The image service returned an incomplete response", null);
            }
            return new StoredImage(url, publicId);
        } catch (CoverImageUploadException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new CoverImageUploadException("The cover image could not be uploaded. Try again later.", exception);
        }
    }

    @Override
    public void delete(String publicId) {
        if (publicId == null) {
            return;
        }
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.asMap("invalidate", true));
        } catch (Exception exception) {
            log.warn("Could not delete cover image publicId={} from Cloudinary: {}", publicId, exception.getMessage());
        }
    }
}
