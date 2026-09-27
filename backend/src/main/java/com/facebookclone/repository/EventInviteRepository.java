package com.facebookclone.repository;

import com.facebookclone.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface EventInviteRepository extends JpaRepository<EventInvite, Long> {

    Optional<EventInvite> findByEventIdAndInviteeId(Long eventId, Long inviteeId);

    @Query("SELECT i.invitee.id FROM EventInvite i WHERE i.event.id = :eventId")
    List<Long> findInviteeIds(@Param("eventId") Long eventId);

    @Query("""
           SELECT i FROM EventInvite i JOIN FETCH i.event e JOIN FETCH e.host JOIN FETCH i.inviter
           WHERE i.invitee.id = :userId AND e.startsAt >= :from
             AND NOT EXISTS (SELECT 1 FROM EventAttendee a WHERE a.event = e AND a.user.id = :userId)
           ORDER BY e.startsAt ASC
           """)
    List<EventInvite> findOpenInvites(@Param("userId") Long userId, @Param("from") java.time.Instant from);

    @Modifying
    @Query("DELETE FROM EventInvite i WHERE i.event.id = :eventId")
    void deleteByEventId(@Param("eventId") Long eventId);
}
