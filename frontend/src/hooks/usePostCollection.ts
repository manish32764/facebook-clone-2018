import { useCallback, useEffect, useRef, useState } from 'react';
import { toErrorMessage } from '@/api/client';
import { postApi } from '@/api/endpoints';
import type { Comment, CreatePostPayload, Post, Privacy, ReactionName } from '@/types';

const PAGE_SIZE = 10;

type Loader = (page: number, size: number) => Promise<Post[]>;

export interface PostEdit {
  content?: string;
  feeling?: string;
  location?: string;
  privacy?: Privacy;
  audienceUserIds?: number[];
}

// ------------------------------------------------------ comment tree helpers ---

function mapTree(comments: Comment[], fn: (comment: Comment) => Comment): Comment[] {
  return comments.map((comment) => fn({ ...comment, replies: mapTree(comment.replies ?? [], fn) }));
}

function insertReply(comments: Comment[], parentId: number, reply: Comment): Comment[] {
  return comments.map((comment) =>
    comment.id === parentId
      ? { ...comment, replies: [...(comment.replies ?? []), reply] }
      : { ...comment, replies: insertReply(comment.replies ?? [], parentId, reply) },
  );
}

function countTree(comment: Comment): number {
  return 1 + (comment.replies ?? []).reduce((sum, reply) => sum + countTree(reply), 0);
}

/** Removes a comment and its replies; returns the new tree and how many went. */
function removeFromTree(comments: Comment[], id: number): [Comment[], number] {
  let removed = 0;
  const next: Comment[] = [];
  for (const comment of comments) {
    if (comment.id === id) {
      removed += countTree(comment);
      continue;
    }
    const [replies, count] = removeFromTree(comment.replies ?? [], id);
    removed += count;
    next.push(count > 0 ? { ...comment, replies } : comment);
  }
  return [next, removed];
}

/**
 * Owns one paginated list of posts plus every mutation that acts on it.
 * Reactions, saves and comments apply optimistically and roll back if the
 * request fails.
 */
export function usePostCollection(loader: Loader, deps: unknown[] = []) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const loadPage = useCallback(async (targetPage: number, replace: boolean) => {
    if (replace) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      const batch = await loaderRef.current(targetPage, PAGE_SIZE);
      setPosts((current) => (replace ? batch : [...current, ...batch]));
      setHasMore(batch.length === PAGE_SIZE);
      setPage(targetPage);
    } catch (err) {
      setError(toErrorMessage(err, 'Could not load posts'));
      if (replace) setPosts([]);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    void loadPage(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const reload = useCallback(() => loadPage(0, true), [loadPage]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || isLoading) return;
    void loadPage(page + 1, false);
  }, [hasMore, isLoadingMore, isLoading, page, loadPage]);

  const patchPost = useCallback((postId: number, patch: (post: Post) => Post) => {
    setPosts((current) => current.map((post) => (post.id === postId ? patch(post) : post)));
  }, []);

  const dropPost = useCallback((postId: number) => {
    setPosts((current) => current.filter((post) => post.id !== postId));
  }, []);

  const createPost = useCallback(async (payload: CreatePostPayload) => {
    const created = await postApi.create(payload);
    // A post waiting for approval is not on the feed yet.
    if (!created.pending) setPosts((current) => [created, ...current]);
    return created;
  }, []);

  /**
   * Reacting is a three-way move: add, switch, or clear by re-sending the
   * reaction you already have. The optimistic guess mirrors that so the button
   * never flickers into the wrong state.
   */
  const react = useCallback(
    async (postId: number, reaction: ReactionName) => {
      let snapshot: Post | undefined;
      setPosts((current) => {
        snapshot = current.find((post) => post.id === postId);
        return current.map((post) => {
          if (post.id !== postId) return post;
          const mine = post.reactions.myReaction;
          const clearing = mine === reaction;
          const breakdown = { ...post.reactions.breakdown };

          if (mine) breakdown[mine] = Math.max(0, (breakdown[mine] ?? 1) - 1);
          if (!clearing) breakdown[reaction] = (breakdown[reaction] ?? 0) + 1;

          return {
            ...post,
            reactions: {
              ...post.reactions,
              myReaction: clearing ? null : reaction,
              total: post.reactions.total + (clearing ? -1 : mine ? 0 : 1),
              breakdown,
            },
          };
        });
      });

      try {
        const result = await postApi.react(postId, reaction);
        patchPost(postId, (post) => ({ ...post, reactions: result.reactions }));
      } catch {
        if (snapshot) {
          const restored = snapshot;
          patchPost(postId, (post) => ({ ...post, reactions: restored.reactions }));
        }
      }
    },
    [patchPost],
  );

  const toggleSave = useCallback(
    async (postId: number) => {
      patchPost(postId, (post) => ({ ...post, savedByMe: !post.savedByMe }));
      try {
        const result = await postApi.toggleSave(postId);
        patchPost(postId, (post) => ({ ...post, savedByMe: result.saved }));
      } catch {
        patchPost(postId, (post) => ({ ...post, savedByMe: !post.savedByMe }));
      }
    },
    [patchPost],
  );

  const addComment = useCallback(
    async (postId: number, content: string, parentId?: number): Promise<Comment> => {
      const created = await postApi.addComment(postId, content, parentId);
      // The server may attach a deep reply to a shallower parent, so trust its parentId.
      const target = created.parentId ?? null;
      patchPost(postId, (post) => ({
        ...post,
        commentCount: post.commentCount + 1,
        comments: target ? insertReply(post.comments, target, created) : [...post.comments, created],
      }));
      return created;
    },
    [patchPost],
  );

  const replaceComment = useCallback(
    (postId: number, updated: Comment) => {
      patchPost(postId, (post) => ({
        ...post,
        comments: mapTree(post.comments, (comment) =>
          comment.id === updated.id ? { ...updated, replies: comment.replies } : comment,
        ),
      }));
    },
    [patchPost],
  );

  const likeComment = useCallback(
    async (postId: number, commentId: number) => {
      replaceComment(postId, await postApi.likeComment(commentId));
    },
    [replaceComment],
  );

  const reactToComment = useCallback(
    async (postId: number, commentId: number, reaction: ReactionName) => {
      replaceComment(postId, await postApi.reactToComment(commentId, reaction));
    },
    [replaceComment],
  );

  const editComment = useCallback(
    async (postId: number, commentId: number, content: string) => {
      replaceComment(postId, await postApi.editComment(commentId, content));
    },
    [replaceComment],
  );

  const deleteComment = useCallback(
    async (postId: number, commentId: number) => {
      await postApi.deleteComment(commentId);
      patchPost(postId, (post) => {
        const [comments, removed] = removeFromTree(post.comments, commentId);
        return { ...post, comments, commentCount: Math.max(0, post.commentCount - removed) };
      });
    },
    [patchPost],
  );

  const sharePost = useCallback(async (postId: number, content: string, privacy: Privacy) => {
    const created = await postApi.share(postId, { content, privacy });
    setPosts((current) => [created, ...current]);
    patchPost(postId, (post) => ({ ...post, shareCount: post.shareCount + 1 }));
    return created;
  }, [patchPost]);

  const editPost = useCallback(
    async (postId: number, updates: PostEdit) => {
      const updated = await postApi.update(postId, updates);
      patchPost(postId, (post) => ({ ...post, ...updated }));
      return updated;
    },
    [patchPost],
  );

  const deletePost = useCallback(async (postId: number) => {
    let snapshot: Post[] = [];
    setPosts((current) => {
      snapshot = current;
      return current.filter((post) => post.id !== postId);
    });
    try {
      await postApi.remove(postId);
    } catch (err) {
      setPosts(snapshot);
      setError(toErrorMessage(err, 'Could not delete that post'));
    }
  }, []);

  /** Pinned posts float to the top of the list, as they do after a reload. */
  const togglePin = useCallback(async (postId: number) => {
    const updated = await postApi.togglePin(postId);
    setPosts((current) => {
      const next = current.map((post) => (post.id === postId ? { ...post, ...updated } : post));
      return [...next.filter((p) => p.pinned), ...next.filter((p) => !p.pinned)];
    });
  }, []);

  const hidePost = useCallback(
    async (postId: number) => {
      dropPost(postId);
      await postApi.toggleHidden(postId).catch(() => undefined);
    },
    [dropPost],
  );

  const approvePost = useCallback(
    async (postId: number) => {
      await postApi.approve(postId);
      dropPost(postId);
    },
    [dropPost],
  );

  const declinePost = useCallback(
    async (postId: number) => {
      await postApi.decline(postId);
      dropPost(postId);
    },
    [dropPost],
  );

  return {
    posts,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    reload,
    loadMore,
    createPost,
    react,
    toggleSave,
    addComment,
    likeComment,
    reactToComment,
    editComment,
    deleteComment,
    sharePost,
    editPost,
    deletePost,
    togglePin,
    hidePost,
    approvePost,
    declinePost,
  };
}

export type PostCollection = ReturnType<typeof usePostCollection>;
