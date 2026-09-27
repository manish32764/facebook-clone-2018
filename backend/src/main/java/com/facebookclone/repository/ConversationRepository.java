package com.facebookclone.repository;

import com.facebookclone.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    @Query("""
           SELECT c FROM Conversation c
           JOIN ConversationParticipant p ON p.conversation = c
           WHERE p.user.id = :userId AND p.archived = false
           ORDER BY c.lastMessageAt DESC
           """)
    List<Conversation> findForUser(@Param("userId") Long userId);

    /** The one-to-one thread between two people, if it has ever been opened. */
    @Query("""
           SELECT c FROM Conversation c
           WHERE c.type = com.facebookclone.entity.Conversation.Type.DIRECT
             AND EXISTS (SELECT 1 FROM ConversationParticipant a WHERE a.conversation = c AND a.user.id = :a)
             AND EXISTS (SELECT 1 FROM ConversationParticipant b WHERE b.conversation = c AND b.user.id = :b)
             AND (SELECT COUNT(x) FROM ConversationParticipant x WHERE x.conversation = c) = 2
           """)
    Optional<Conversation> findDirectBetween(@Param("a") Long a, @Param("b") Long b);
}
