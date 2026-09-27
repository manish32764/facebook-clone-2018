package com.facebookclone.repository;

import com.facebookclone.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface DatingProfileRepository extends JpaRepository<DatingProfile, Long> {

    @Query("SELECT d FROM DatingProfile d JOIN FETCH d.user WHERE d.user.id = :userId")
    Optional<DatingProfile> findByUserId(@Param("userId") Long userId);

    @Query("SELECT d FROM DatingProfile d JOIN FETCH d.user WHERE d.active = true")
    List<DatingProfile> findActive();

    @Query("SELECT d FROM DatingProfile d JOIN FETCH d.user WHERE d.user.id IN :userIds")
    List<DatingProfile> findForUsers(@Param("userIds") Collection<Long> userIds);
}
