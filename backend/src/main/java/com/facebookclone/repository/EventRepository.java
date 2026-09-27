package com.facebookclone.repository;

import com.facebookclone.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {

    @Query("SELECT e FROM Event e JOIN FETCH e.host WHERE e.startsAt >= :from ORDER BY e.startsAt ASC")
    List<Event> findUpcoming(@Param("from") Instant from);

    @Query("SELECT e FROM Event e JOIN FETCH e.host WHERE e.startsAt < :before ORDER BY e.startsAt DESC")
    List<Event> findPast(@Param("before") Instant before);

    @Query("""
           SELECT e FROM Event e JOIN FETCH e.host
           WHERE EXISTS (SELECT 1 FROM EventAttendee a WHERE a.event = e AND a.user.id = :userId
                         AND a.status <> com.facebookclone.entity.EventAttendee.Status.NOT_GOING)
           ORDER BY e.startsAt ASC
           """)
    List<Event> findResponded(@Param("userId") Long userId);

    @Query("SELECT e FROM Event e WHERE LOWER(e.name) LIKE LOWER(CONCAT(:wild, :q, :wild)) ORDER BY e.startsAt")
    List<Event> searchWild(@Param("q") String q, @Param("wild") String wild);

    default List<Event> search(String q) {
        return searchWild(q, "%");
    }
}
