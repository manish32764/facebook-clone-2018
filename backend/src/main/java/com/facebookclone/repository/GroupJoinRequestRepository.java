package com.facebookclone.repository;

import com.facebookclone.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface GroupJoinRequestRepository extends JpaRepository<GroupJoinRequest, Long> {

    Optional<GroupJoinRequest> findByGroupIdAndUserId(Long groupId, Long userId);

    boolean existsByGroupIdAndUserId(Long groupId, Long userId);

    long countByGroupId(Long groupId);

    @Query("SELECT r FROM GroupJoinRequest r JOIN FETCH r.user WHERE r.group.id = :groupId ORDER BY r.createdAt ASC")
    List<GroupJoinRequest> findForGroup(@Param("groupId") Long groupId);

    @Modifying
    @Query("DELETE FROM GroupJoinRequest r WHERE r.group.id = :groupId")
    void deleteByGroupId(@Param("groupId") Long groupId);
}
