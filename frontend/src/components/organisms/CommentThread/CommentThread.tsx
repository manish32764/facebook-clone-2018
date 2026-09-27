import { forwardRef, useState } from 'react';
import { CommentComposer, CommentItem } from '@molecules/index';
import { pluralize } from '@/utils/format';
import { socialApi } from '@/api/endpoints';
import { ReportDialog } from '../SocialDialogs';
import type { Comment, ReactionName, User } from '@/types';
import styles from './CommentThread.module.css';

export interface CommentThreadProps {
  comments: Comment[];
  viewer: User;
  /** The post author can delete any comment on their post. */
  postAuthorId?: number;
  onAddComment: (content: string, parentId?: number) => Promise<unknown>;
  onLikeComment: (commentId: number) => void;
  onReactToComment: (commentId: number, reaction: ReactionName) => void;
  onEditComment: (commentId: number, content: string) => Promise<unknown> | void;
  onDeleteComment: (commentId: number) => void;
  /** Collapse anything past this many top-level comments behind a "view more". */
  collapseAfter?: number;
}

/** Replies past this depth render flat under their thread, as they do on Facebook. */
const MAX_INDENT = 3;

/**
 * The comment tray under a post: top-level comments with nested replies, and a
 * composer that retargets itself when you press Reply.
 */
export const CommentThread = forwardRef<HTMLTextAreaElement, CommentThreadProps>(
  function CommentThread(
    {
      comments,
      viewer,
      postAuthorId,
      onAddComment,
      onReactToComment,
      onEditComment,
      onDeleteComment,
      collapseAfter = 2,
    },
    ref,
  ) {
    const [showAll, setShowAll] = useState(false);
    const [replyTo, setReplyTo] = useState<Comment | null>(null);
    const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
    const [reporting, setReporting] = useState<Comment | null>(null);

    const hiddenCount = Math.max(0, comments.length - collapseAfter);
    const visible = showAll ? comments : comments.slice(-collapseAfter);
    const canModerate = postAuthorId === viewer.id;

    async function submit(content: string) {
      await onAddComment(content, replyTo?.id);
      if (replyTo) {
        setCollapsed((current) => {
          const next = new Set(current);
          next.delete(replyTo.id);
          return next;
        });
      }
      setReplyTo(null);
      setShowAll(true);
    }

    function toggleReplies(id: number) {
      setCollapsed((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }

    function renderComment(comment: Comment, depth: number) {
      const replies = comment.replies ?? [];
      const isCollapsed = collapsed.has(comment.id) || (depth >= 1 && replies.length > 2 && !collapsed.has(-comment.id));
      return (
        <div key={comment.id} className={styles.group}>
          <CommentItem
            comment={comment}
            viewer={viewer}
            depth={depth}
            canModerate={canModerate}
            onReact={onReactToComment}
            onReply={setReplyTo}
            onEdit={onEditComment}
            onDelete={onDeleteComment}
            onReport={setReporting}
          />

          {replies.length > 0 &&
            (isCollapsed ? (
              <button
                type="button"
                className={styles.replyToggle}
                onClick={() => {
                  // A negative id marks "expanded by hand" for threads collapsed by default.
                  setCollapsed((current) => {
                    const next = new Set(current);
                    next.delete(comment.id);
                    next.add(-comment.id);
                    return next;
                  });
                }}
              >
                &#8627; {pluralize(replies.length, 'reply', 'replies')}
              </button>
            ) : (
              <div className={depth < MAX_INDENT - 1 ? styles.replies : styles.repliesFlat}>
                {replies.map((reply) => renderComment(reply, Math.min(depth + 1, MAX_INDENT)))}
                {depth === 0 && replies.length > 1 && (
                  <button type="button" className={styles.replyToggle} onClick={() => toggleReplies(comment.id)}>
                    Hide replies
                  </button>
                )}
              </div>
            ))}
        </div>
      );
    }

    return (
      <div className={styles.thread}>
        {hiddenCount > 0 && !showAll && (
          <button type="button" className={styles.showMore} onClick={() => setShowAll(true)}>
            View {hiddenCount} more {hiddenCount === 1 ? 'comment' : 'comments'}
          </button>
        )}

        {visible.map((comment) => renderComment(comment, 0))}

        <CommentComposer
          ref={ref}
          author={viewer}
          onSubmit={submit}
          replyingTo={replyTo?.author.fullName}
          autoFocus={Boolean(replyTo)}
          placeholder={replyTo ? `Reply to ${replyTo.author.firstName}…` : undefined}
          onCancelReply={() => setReplyTo(null)}
        />

        {reporting && (
          <ReportDialog
            targetType="COMMENT"
            targetId={reporting.id}
            targetName="this comment"
            blockName={reporting.author.fullName}
            onBlock={() => socialApi.block(reporting.author.id)}
            onClose={() => setReporting(null)}
          />
        )}
      </div>
    );
  },
);
