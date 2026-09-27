package com.facebookclone.repository;

import com.facebookclone.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface GroupInviteRepository extends JpaRepository<GroupInvite, Long> {

    Optional<GroupInvite> findByGroupIdAndInviteeId(Long groupId, Long inviteeId);

    @Query("""
           SELECT i FROM GroupInvite i JOIN FETCH i.group JOIN FETCH i.inviter
           WHERE i.invitee.id = :userId ORDER BY i.createdAt DESC
           """)
    List<GroupInvite> findForInvitee(@Param("userId") Long userId);

    @Query("SELECT i.invitee.id FROM GroupInvite i WHERE i.group.id = :groupId")
    List<Long> findInviteeIds(@Param("groupId") Long groupId);

    @Modifying
    @Query("DELETE FROM GroupInvite i WHERE i.group.id = :groupId")
    void deleteByGroupId(@Param("groupId") Long groupId);
}
