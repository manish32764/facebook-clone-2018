package com.facebookclone.controller;

import com.facebookclone.exception.ApiException;
import com.facebookclone.security.AppUserPrincipal;
import com.facebookclone.security.CurrentUser;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.MediaTypeFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Photo and video uploads. Files land on local disk (a Docker volume in the
 * compose stack) under a random name, and are served back at
 * /api/media/{name}. Reads are public so a plain img tag can load them.
 */
@RestController
@RequestMapping("/api/media")
@Slf4j
public class MediaController {

    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", ".jpg",
            "image/png", ".png",
            "image/gif", ".gif",
            "image/webp", ".webp",
            "video/mp4", ".mp4",
            "video/webm", ".webm",
            "video/quicktime", ".mov",
            "application/pdf", ".pdf");

    /** Only names this controller generated can be read back. */
    private static final Pattern SAFE_NAME = Pattern.compile("^[a-f0-9]{32}\\.[a-z0-9]{3,4}$");

    private final Path root;

    public MediaController(@Value("${app.media.dir:./uploads}") String dir) throws IOException {
        this.root = Path.of(dir).toAbsolutePath().normalize();
        Files.createDirectories(root);
        log.info("Media uploads stored in {}", root);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> upload(@RequestParam("file") MultipartFile file, @CurrentUser AppUserPrincipal me)
            throws IOException {
        if (file.isEmpty()) throw ApiException.badRequest("That file is empty");

        String type = file.getContentType() == null ? "" : file.getContentType().toLowerCase();
        String extension = EXTENSIONS.get(type);
        if (extension == null) {
            throw ApiException.badRequest("Upload a photo (JPG, PNG, GIF, WebP), a video (MP4, WebM, MOV) or a PDF");
        }

        String name = UUID.randomUUID().toString().replace("-", "") + extension;
        try (InputStream in = file.getInputStream()) {
            Files.copy(in, root.resolve(name), StandardCopyOption.REPLACE_EXISTING);
        }
        return Map.of("url", "/api/media/" + name, "contentType", type);
    }

    @GetMapping("/{name}")
    public ResponseEntity<Resource> serve(@PathVariable String name) {
        if (!SAFE_NAME.matcher(name).matches()) throw ApiException.notFound("File");
        Path file = root.resolve(name).normalize();
        if (!file.startsWith(root) || !Files.isRegularFile(file)) throw ApiException.notFound("File");

        Resource resource = new PathResource(file);
        MediaType type = MediaTypeFactory.getMediaType(resource).orElse(MediaType.APPLICATION_OCTET_STREAM);
        return ResponseEntity.ok()
                .contentType(type)
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                .body(resource);
    }
}
