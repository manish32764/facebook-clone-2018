package com.facebookclone.repository;

import com.facebookclone.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    @Query("""
           SELECT n FROM Notification n LEFT JOIN FETCH n.actor
           WHERE n.recipient.id = :userId
           ORDER BY n.createdAt DESC, n.id DESC
           """)
    Page<Notification> findForUser(@Param("userId") Long userId, Pageable pageable);

    long countByRecipientIdAndReadFalse(Long userId);

    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.recipient.id = :userId AND n.read = false")
    int markAllRead(@Param("userId") Long userId);
}
