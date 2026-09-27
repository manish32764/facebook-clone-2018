package com.facebookclone.repository;

import com.facebookclone.entity.GroupMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface GroupMemberRepository extends JpaRepository<GroupMember, Long> {

    Optional<GroupMember> findByGroupIdAndUserId(Long groupId, Long userId);

    boolean existsByGroupIdAndUserId(Long groupId, Long userId);

    @Query("SELECT m FROM GroupMember m JOIN FETCH m.user WHERE m.group.id = :groupId ORDER BY m.role, m.joinedAt")
    List<GroupMember> findMembers(@Param("groupId") Long groupId);

    @Query("SELECT m.group.id, COUNT(m) FROM GroupMember m WHERE m.group.id IN :groupIds GROUP BY m.group.id")
    List<Object[]> countByGroupIds(@Param("groupIds") Collection<Long> groupIds);

    @Query("SELECT m.group.id FROM GroupMember m WHERE m.user.id = :userId")
    List<Long> findGroupIds(@Param("userId") Long userId);

    /** groupId, role for the groups in the list the user belongs to. */
    @Query("SELECT m.group.id, m.role FROM GroupMember m WHERE m.user.id = :userId AND m.group.id IN :groupIds")
    List<Object[]> findRoles(@Param("userId") Long userId, @Param("groupIds") Collection<Long> groupIds);

    @Query("SELECT m.user.id FROM GroupMember m WHERE m.group.id = :groupId")
    List<Long> findMemberIds(@Param("groupId") Long groupId);

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM GroupMember m WHERE m.group.id = :groupId")
    void deleteByGroupId(@Param("groupId") Long groupId);
}
