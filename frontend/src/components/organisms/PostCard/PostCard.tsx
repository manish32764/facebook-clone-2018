import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Button, Icon } from '@atoms/index';
import { PostActions, PostHeader, ReactionBar, type MenuItem } from '@molecules/index';
import { classNames } from '@/utils/format';
import { timeAgo } from '@/utils/time';
import { socialApi } from '@/api/endpoints';
import type { PostEdit } from '@/hooks/usePostCollection';
import { CommentThread } from '../CommentThread';
import { PhotoLightbox } from '../PhotoLightbox';
import { EditPostDialog, ReactorsDialog, ShareDialog } from '../PostDialogs';
import { ReportDialog } from '../SocialDialogs';
import type { Post, Privacy, ReactionName, User } from '@/types';
import styles from './PostCard.module.css';

export interface PostCardProps {
  post: Post;
  viewer: User;
  onReact: (postId: number, reaction: ReactionName) => Promise<void> | void;
  onAddComment: (postId: number, content: string, parentId?: number) => Promise<unknown>;
  onLikeComment: (postId: number, commentId: number) => Promise<void> | void;
  onReactToComment: (postId: number, commentId: number, reaction: ReactionName) => Promise<void> | void;
  onEditComment: (postId: number, commentId: number, content: string) => Promise<void> | void;
  onDeleteComment: (postId: number, commentId: number) => Promise<void> | void;
  onToggleSave: (postId: number) => Promise<void> | void;
  onShare: (postId: number, content: string, privacy: Privacy) => Promise<unknown>;
  onEdit: (postId: number, updates: PostEdit) => Promise<unknown>;
  onDelete: (postId: number) => Promise<void> | void;
  onTogglePin?: (postId: number) => Promise<void> | void;
  onHide?: (postId: number) => Promise<void> | void;
  /** Present only in a group's approval queue. */
  onApprove?: (postId: number) => Promise<void> | void;
  onDecline?: (postId: number) => Promise<void> | void;
}

type OpenDialog = 'share' | 'reactors' | 'edit' | 'report' | null;

export function PostCard({
  post,
  viewer,
  onReact,
  onAddComment,
  onLikeComment,
  onReactToComment,
  onEditComment,
  onDeleteComment,
  onToggleSave,
  onShare,
  onEdit,
  onDelete,
  onTogglePin,
  onHide,
  onApprove,
  onDecline,
}: PostCardProps) {
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  const isMine = post.author.id === viewer.id;
  const canEdit = post.canEdit ?? isMine;
  const canDelete = post.canDelete ?? isMine;
  const shared = post.sharedPost;

  async function run(action: () => Promise<unknown> | unknown) {
    setIsBusy(true);
    try {
      await action();
    } finally {
      setIsBusy(false);
    }
  }

  function handleDelete() {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    void run(() => onDelete(post.id));
  }

  function focusComment() {
    commentInputRef.current?.focus();
  }

  const menuItems: MenuItem[] = [
    {
      label: post.savedByMe ? 'Remove from saved' : 'Save post',
      icon: 'bookmark',
      onClick: () => void onToggleSave(post.id),
    },
    { label: 'Edit post', icon: 'pencil', onClick: () => setDialog('edit'), hidden: !canEdit },
    {
      label: post.pinned ? 'Unpin post' : 'Pin post',
      icon: 'pin',
      onClick: () => void onTogglePin?.(post.id),
      hidden: !post.canPin || !onTogglePin,
    },
    {
      label: 'Hide post',
      icon: 'close',
      onClick: () => void onHide?.(post.id),
      hidden: isMine || !onHide,
      divider: true,
    },
    {
      label: 'Find support or report post',
      icon: 'alert',
      onClick: () => setDialog('report'),
      hidden: isMine,
    },
    { label: 'Delete post', icon: 'trash', onClick: handleDelete, hidden: !canDelete, destructive: true, divider: true },
  ];

  return (
    <article className={classNames(styles.card, isBusy && styles.pending)}>
      {post.pending && (
        <div className={styles.pendingBanner}>
          <Icon name="clock" size={13} />
          {onApprove ? 'Waiting for your approval' : 'Waiting for an admin to approve this post'}
          {onApprove && onDecline && (
            <span className={styles.pendingActions}>
              <Button size="sm" onClick={() => void run(() => onApprove(post.id))}>
                Approve
              </Button>
              <Button size="sm" variant="secondary" onClick={() => void run(() => onDecline(post.id))}>
                Decline
              </Button>
            </span>
          )}
        </div>
      )}

      <PostHeader post={post} menuItems={menuItems} />

      {post.content && <div className={styles.content}>{post.content}</div>}

      {/* A re-share carries the original inside a bordered card, as in the app. */}
      {shared && (
        <Link to={`/posts/${shared.id}`} className={styles.shared}>
          <span className={styles.sharedHeader}>
            <Avatar
              src={shared.page?.avatarUrl ?? shared.author.avatarUrl}
              name={shared.page?.name ?? shared.author.fullName}
              size="sm"
            />
            <span>
              <span className={styles.sharedAuthor}>{shared.page?.name ?? shared.author.fullName}</span>
              <span className={styles.sharedTime}>{timeAgo(shared.createdAt)}</span>
            </span>
          </span>
          {shared.content && <span className={styles.sharedBody}>{shared.content}</span>}
          {shared.imageUrl && (
            <img className={styles.sharedImage} src={shared.imageUrl} alt="" loading="lazy" />
          )}
        </Link>
      )}

      {post.videoUrl ? (
        <div className={styles.videoWrap}>
          <video
            className={styles.video}
            src={post.videoUrl}
            poster={post.imageUrl ?? undefined}
            controls
            preload="metadata"
          />
        </div>
      ) : (
        post.imageUrl && (
          <button
            type="button"
            className={styles.imageWrap}
            onClick={() => setIsLightboxOpen(true)}
            aria-label="View photo"
          >
            <img className={styles.image} src={post.imageUrl} alt="" loading="lazy" />
          </button>
        )
      )}

      {!post.pending && (
        <>
          <ReactionBar
            reactions={post.reactions}
            commentCount={post.commentCount}
            shareCount={post.shareCount}
            onShowReactors={() => setDialog('reactors')}
            onFocusComment={focusComment}
          />

          <PostActions
            myReaction={post.reactions.myReaction}
            savedByMe={post.savedByMe}
            onReact={(reaction) => void onReact(post.id, reaction)}
            onFocusComment={focusComment}
            onShare={() => setDialog('share')}
            onToggleSave={() => void onToggleSave(post.id)}
          />

          <CommentThread
            ref={commentInputRef}
            comments={post.comments ?? []}
            viewer={viewer}
            postAuthorId={post.author.id}
            onAddComment={(content, parentId) => onAddComment(post.id, content, parentId)}
            onLikeComment={(commentId) => void onLikeComment(post.id, commentId)}
            onReactToComment={(commentId, reaction) => void onReactToComment(post.id, commentId, reaction)}
            onEditComment={(commentId, content) => onEditComment(post.id, commentId, content)}
            onDeleteComment={(commentId) => void onDeleteComment(post.id, commentId)}
          />
        </>
      )}

      {dialog === 'share' && (
        <ShareDialog
          post={post}
          viewer={viewer}
          onClose={() => setDialog(null)}
          onShare={(content, privacy) => onShare(post.id, content, privacy)}
        />
      )}

      {dialog === 'reactors' && (
        <ReactorsDialog postId={post.id} onClose={() => setDialog(null)} />
      )}

      {dialog === 'edit' && (
        <EditPostDialog
          post={post}
          onClose={() => setDialog(null)}
          onSave={(updates) => onEdit(post.id, updates)}
        />
      )}

      {dialog === 'report' && (
        <ReportDialog
          targetType="POST"
          targetId={post.id}
          targetName="this post"
          onClose={() => setDialog(null)}
          blockName={post.page ? undefined : post.author.fullName}
          onBlock={post.page ? undefined : () => socialApi.block(post.author.id)}
        />
      )}

      {isLightboxOpen && post.imageUrl && (
        <PhotoLightbox
          images={[post.imageUrl]}
          caption={post.content || undefined}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}
    </article>
  );
}
