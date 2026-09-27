package com.facebookclone.repository;

import com.facebookclone.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface AlbumRepository extends JpaRepository<Album, Long> {

    @Query("SELECT a FROM Album a JOIN FETCH a.owner WHERE a.owner.id = :ownerId ORDER BY a.createdAt DESC")
    List<Album> findForOwner(@Param("ownerId") Long ownerId);
}
