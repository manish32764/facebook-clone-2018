package com.facebookclone.repository;

import com.facebookclone.entity.EventAttendee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface EventAttendeeRepository extends JpaRepository<EventAttendee, Long> {

    Optional<EventAttendee> findByEventIdAndUserId(Long eventId, Long userId);

    @Query("SELECT a FROM EventAttendee a JOIN FETCH a.user WHERE a.event.id = :eventId ORDER BY a.status, a.respondedAt")
    List<EventAttendee> findAttendees(@Param("eventId") Long eventId);

    @Query("""
           SELECT a.event.id, a.status, COUNT(a) FROM EventAttendee a
           WHERE a.event.id IN :eventIds GROUP BY a.event.id, a.status
           """)
    List<Object[]> countByEventIdsGrouped(@Param("eventIds") Collection<Long> eventIds);
}
