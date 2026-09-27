package com.facebookclone.repository;

import com.facebookclone.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    @Query("""
           SELECT u FROM User u
           WHERE u.id <> :selfId
             AND (LOWER(u.firstName) LIKE LOWER(CONCAT(:wild, :q, :wild))
               OR LOWER(u.lastName)  LIKE LOWER(CONCAT(:wild, :q, :wild))
               OR LOWER(CONCAT(u.firstName, :space, u.lastName)) LIKE LOWER(CONCAT(:wild, :q, :wild)))
           ORDER BY u.firstName
           """)
    List<User> searchWild(@Param("q") String q, @Param("selfId") Long selfId,
                          @Param("wild") String wild, @Param("space") String space);

    default List<User> search(String q, Long selfId) {
        return searchWild(q, selfId, "%", " ");
    }

    /** Presence: anyone whose heartbeat landed inside the cutoff is online. */
    @Query("SELECT u.id FROM User u WHERE u.id IN :ids AND u.lastSeenAt IS NOT NULL AND u.lastSeenAt > :cutoff")
    List<Long> findOnlineIds(@Param("ids") Collection<Long> ids, @Param("cutoff") Instant cutoff);

    /** Friends whose birthday falls on a given day-of-year, for the reminder card. */
    @Query("""
           SELECT u FROM User u
           WHERE u.id IN :ids AND u.birthDate IS NOT NULL
             AND MONTH(u.birthDate) = :month AND DAY(u.birthDate) = :day
           """)
    List<User> findBirthdays(@Param("ids") Collection<Long> ids,
                             @Param("month") int month, @Param("day") int day);
}
