import { Fragment } from 'react';
import { Button, Spinner } from '@atoms/index';
import { AdCard, EmptyState, ErrorNotice } from '@molecules/index';
import { PostCard } from '@organisms/PostCard';
import type { PostEdit } from '@/hooks/usePostCollection';
import type { Ad, Post, Privacy, ReactionName, User } from '@/types';
import styles from './Feed.module.css';

/**
 * The slice of a post collection a feed needs. Taking one object rather than a
 * dozen callbacks means a page can hand over its usePostCollection result
 * directly, and adding an action later does not touch every page.
 */
export interface PostCollectionLike {
  posts: Post[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  reload: () => void;
  loadMore: () => void;
  react: (postId: number, reaction: ReactionName) => Promise<void>;
  toggleSave: (postId: number) => Promise<void>;
  addComment: (postId: number, content: string, parentId?: number) => Promise<unknown>;
  likeComment: (postId: number, commentId: number) => Promise<void>;
  reactToComment: (postId: number, commentId: number, reaction: ReactionName) => Promise<void>;
  editComment: (postId: number, commentId: number, content: string) => Promise<void>;
  deleteComment: (postId: number, commentId: number) => Promise<void>;
  sharePost: (postId: number, content: string, privacy: Privacy) => Promise<unknown>;
  editPost: (postId: number, updates: PostEdit) => Promise<unknown>;
  deletePost: (postId: number) => Promise<void>;
  togglePin: (postId: number) => Promise<void>;
  hidePost: (postId: number) => Promise<void>;
  approvePost: (postId: number) => Promise<void>;
  declinePost: (postId: number) => Promise<void>;
}

export interface FeedProps {
  collection: PostCollectionLike;
  viewer: User;
  emptyTitle?: string;
  emptyDescription?: string;
  /** Hides the "See more posts" button for lists that are never paginated. */
  paginate?: boolean;
  /** Sponsored posts woven in after every few organic ones. */
  ads?: Ad[];
  /** Shows Approve / Decline on each post - the group admin's review queue. */
  moderation?: boolean;
}

/** One sponsored slot after this many posts. */
const AD_EVERY = 4;

/** Renders a list of posts plus its loading, error, empty and pagination states. */
export function Feed({
  collection,
  viewer,
  emptyTitle = 'No posts yet',
  emptyDescription = 'When you or your friends share something, it will show up here.',
  paginate = true,
  ads = [],
  moderation = false,
}: FeedProps) {
  const { posts, isLoading, isLoadingMore, hasMore, error } = collection;

  if (isLoading && posts.length === 0) {
    return <Spinner label="Loading your feed" />;
  }

  if (error && posts.length === 0) {
    return <ErrorNotice message={error} onRetry={collection.reload} />;
  }

  if (posts.length === 0) {
    return (
      <div className={styles.emptyCard}>
        <EmptyState icon="pencil" title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className={styles.feed}>
      {posts.map((post, index) => {
        const ad = ads.length > 0 && (index + 1) % AD_EVERY === 0 ? ads[((index + 1) / AD_EVERY - 1) % ads.length] : null;
        return (
          <Fragment key={post.id}>
            <PostCard
              post={post}
              viewer={viewer}
              onReact={collection.react}
              onAddComment={collection.addComment}
              onLikeComment={collection.likeComment}
              onReactToComment={collection.reactToComment}
              onEditComment={collection.editComment}
              onDeleteComment={collection.deleteComment}
              onToggleSave={collection.toggleSave}
              onShare={collection.sharePost}
              onEdit={collection.editPost}
              onDelete={collection.deletePost}
              onTogglePin={collection.togglePin}
              onHide={collection.hidePost}
              onApprove={moderation ? collection.approvePost : undefined}
              onDecline={moderation ? collection.declinePost : undefined}
            />
            {ad && <AdCard ad={ad} />}
          </Fragment>
        );
      })}

      {!paginate ? null : hasMore ? (
        <div className={styles.loadMore}>
          <Button variant="secondary" onClick={collection.loadMore} disabled={isLoadingMore}>
            {isLoadingMore ? 'Loading...' : 'See more posts'}
          </Button>
        </div>
      ) : (
        <p className={styles.endOfFeed}>You are all caught up.</p>
      )}
    </div>
  );
}
