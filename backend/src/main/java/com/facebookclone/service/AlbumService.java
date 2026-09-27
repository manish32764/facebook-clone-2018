package com.facebookclone.service;

import com.facebookclone.dto.ExtrasDtos.*;
import com.facebookclone.dto.UserDto;
import com.facebookclone.entity.Album;
import com.facebookclone.entity.Photo;
import com.facebookclone.entity.User;
import com.facebookclone.exception.ApiException;
import com.facebookclone.repository.AlbumRepository;
import com.facebookclone.repository.PhotoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Photo albums on a profile. */
@Service
@RequiredArgsConstructor
public class AlbumService {

    private final AlbumRepository albumRepository;
    private final PhotoRepository photoRepository;
    private final UserService userService;
    private final ViewerScopeService scopeService;

    @Transactional(readOnly = true)
    public List<AlbumDto> albumsOf(Long ownerId, Long viewerId) {
        if (scopeService.blockedEitherWay(ownerId, viewerId)) return List.of();
        List<Album> albums = albumRepository.findForOwner(ownerId);
        if (albums.isEmpty()) return List.of();

        Map<Long, List<Photo>> photos = photoRepository.findForAlbums(albums.stream().map(Album::getId).toList())
                .stream().collect(Collectors.groupingBy(p -> p.getAlbum().getId()));
        return albums.stream().map(a -> toDto(a, photos.getOrDefault(a.getId(), List.of()), false)).toList();
    }

    @Transactional(readOnly = true)
    public AlbumDto one(Long albumId, Long viewerId) {
        Album album = require(albumId);
        scopeService.requireNotBlocked(viewerId, album.getOwner().getId());
        return toDto(album, photoRepository.findForAlbum(albumId), true);
    }

    @Transactional
    public AlbumDto create(Long ownerId, AlbumRequest req) {
        User owner = userService.require(ownerId);
        Album album = albumRepository.save(Album.builder()
                .owner(owner)
                .title(req.title() == null || req.title().isBlank() ? "Untitled Album" : req.title().trim())
                .description(blankToNull(req.description()))
                .build());
        addPhotos(album, owner, req.photoUrls(), null);
        return toDto(album, photoRepository.findForAlbum(album.getId()), true);
    }

    @Transactional
    public AlbumDto update(Long albumId, Long userId, AlbumRequest req) {
        Album album = requireOwn(albumId, userId);
        if (req.title() != null && !req.title().isBlank()) album.setTitle(req.title().trim());
        if (req.description() != null) album.setDescription(blankToNull(req.description()));
        albumRepository.save(album);
        return toDto(album, photoRepository.findForAlbum(albumId), true);
    }

    @Transactional
    public AlbumDto addPhotos(Long albumId, Long userId, AddPhotosRequest req) {
        Album album = requireOwn(albumId, userId);
        addPhotos(album, album.getOwner(), req.photoUrls(), req.caption());
        return toDto(album, photoRepository.findForAlbum(albumId), true);
    }

    @Transactional
    public void deletePhoto(Long photoId, Long userId) {
        Photo photo = photoRepository.findById(photoId).orElseThrow(() -> ApiException.notFound("Photo"));
        if (!photo.getOwner().getId().equals(userId)) throw ApiException.forbidden("That photo is not yours");
        photoRepository.delete(photo);
    }

    @Transactional
    public void delete(Long albumId, Long userId) {
        Album album = requireOwn(albumId, userId);
        photoRepository.deleteByAlbumId(albumId);
        albumRepository.delete(album);
    }

    private void addPhotos(Album album, User owner, List<String> urls, String caption) {
        if (urls == null) return;
        for (String url : urls) {
            if (url == null || url.isBlank()) continue;
            photoRepository.save(Photo.builder()
                    .album(album).owner(owner).url(url.trim()).caption(blankToNull(caption)).build());
        }
    }

    private Album require(Long albumId) {
        return albumRepository.findById(albumId).orElseThrow(() -> ApiException.notFound("Album"));
    }

    private Album requireOwn(Long albumId, Long userId) {
        Album album = require(albumId);
        if (!album.getOwner().getId().equals(userId)) throw ApiException.forbidden("That album is not yours");
        return album;
    }

    private static AlbumDto toDto(Album a, List<Photo> photos, boolean withPhotos) {
        return new AlbumDto(
                a.getId(),
                UserDto.summary(a.getOwner()),
                a.getTitle(),
                a.getDescription(),
                photos.isEmpty() ? null : photos.get(0).getUrl(),
                photos.size(),
                a.getCreatedAt(),
                withPhotos
                        ? photos.stream().map(p -> new PhotoDto(p.getId(), a.getId(), p.getUrl(), p.getCaption(),
                                p.getCreatedAt())).toList()
                        : List.of());
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
