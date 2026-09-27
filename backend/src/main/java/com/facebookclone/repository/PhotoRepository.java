package com.facebookclone.repository;

import com.facebookclone.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PhotoRepository extends JpaRepository<Photo, Long> {

    @Query("SELECT p FROM Photo p WHERE p.album.id = :albumId ORDER BY p.createdAt ASC, p.id ASC")
    List<Photo> findForAlbum(@Param("albumId") Long albumId);

    @Query("SELECT p FROM Photo p WHERE p.album.id IN :albumIds ORDER BY p.createdAt ASC, p.id ASC")
    List<Photo> findForAlbums(@Param("albumIds") Collection<Long> albumIds);

    @Modifying
    @Query("DELETE FROM Photo p WHERE p.album.id = :albumId")
    void deleteByAlbumId(@Param("albumId") Long albumId);
}
