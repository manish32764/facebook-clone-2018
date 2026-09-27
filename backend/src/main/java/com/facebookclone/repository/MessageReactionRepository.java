package com.facebookclone.repository;

import com.facebookclone.entity.MessageReaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface MessageReactionRepository extends JpaRepository<MessageReaction, Long> {

    Optional<MessageReaction> findByMessageIdAndUserId(Long messageId, Long userId);

    @Query("SELECT r FROM MessageReaction r JOIN FETCH r.user WHERE r.message.id IN :messageIds")
    List<MessageReaction> findByMessageIds(@Param("messageIds") Collection<Long> messageIds);
}
