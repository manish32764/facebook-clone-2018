package com.facebookclone.repository;

import com.facebookclone.entity.ConversationParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ConversationParticipantRepository extends JpaRepository<ConversationParticipant, Long> {

    @Query("""
           SELECT p FROM ConversationParticipant p
           JOIN FETCH p.user
           WHERE p.conversation.id IN :conversationIds
           """)
    List<ConversationParticipant> findByConversationIds(@Param("conversationIds") Collection<Long> conversationIds);

    Optional<ConversationParticipant> findByConversationIdAndUserId(Long conversationId, Long userId);

    @Query("SELECT p.user.id FROM ConversationParticipant p WHERE p.conversation.id = :conversationId")
    List<Long> findUserIds(@Param("conversationId") Long conversationId);

    boolean existsByConversationIdAndUserId(Long conversationId, Long userId);
}
