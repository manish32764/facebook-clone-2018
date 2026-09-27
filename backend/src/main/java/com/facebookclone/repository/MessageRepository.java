package com.facebookclone.repository;

import com.facebookclone.entity.Message;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query("""
           SELECT m FROM Message m JOIN FETCH m.sender
           WHERE m.conversation.id = :conversationId
           ORDER BY m.createdAt DESC, m.id DESC
           """)
    Page<Message> findThread(@Param("conversationId") Long conversationId, Pageable pageable);

    /** The preview line for every thread in the list, in one query. */
    @Query("""
           SELECT m FROM Message m JOIN FETCH m.sender
           WHERE m.id IN (SELECT MAX(x.id) FROM Message x
                          WHERE x.conversation.id IN :conversationIds
                          GROUP BY x.conversation.id)
           """)
    List<Message> findLatestPerConversation(@Param("conversationIds") Collection<Long> conversationIds);

    @Query("""
           SELECT COUNT(m) FROM Message m
           WHERE m.conversation.id = :conversationId
             AND m.sender.id <> :userId
             AND m.createdAt > :since
           """)
    long countUnread(@Param("conversationId") Long conversationId,
                     @Param("userId") Long userId,
                     @Param("since") Instant since);

    /** Total unread across every thread, for the chrome badge. */
    @Query("""
           SELECT COUNT(m) FROM Message m
           JOIN ConversationParticipant p ON p.conversation = m.conversation AND p.user.id = :userId
           WHERE m.sender.id <> :userId
             AND (p.lastReadAt IS NULL OR m.createdAt > p.lastReadAt)
           """)
    long countUnreadForUser(@Param("userId") Long userId);

    @Query("""
           SELECT m FROM Message m JOIN FETCH m.sender JOIN FETCH m.conversation
           WHERE LOWER(m.content) LIKE LOWER(CONCAT(:wild, :q, :wild))
             AND EXISTS (SELECT 1 FROM ConversationParticipant p
                         WHERE p.conversation = m.conversation AND p.user.id = :userId)
           ORDER BY m.createdAt DESC
           """)
    List<Message> searchWild(@Param("q") String q, @Param("wild") String wild,
                            @Param("userId") Long userId, Pageable pageable);

    default List<Message> search(String q, Long userId, Pageable pageable) {
        return searchWild(q, "%", userId, pageable);
    }
}
