import { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { AppShell } from '@templates/index';
import { Spinner } from '@atoms/index';
import { ErrorNotice } from '@molecules/index';
import { Feed } from '@organisms/index';
import { useAuth } from '@/hooks/useAuth';
import { usePostCollection } from '@/hooks/usePostCollection';
import { postApi } from '@/api/endpoints';

/** A single post on its own page, which is what notification links point at. */
export function PostPage() {
  const { user } = useAuth();
  const { postId } = useParams<{ postId: string }>();
  const id = Number(postId);

  const loader = useCallback(async () => [await postApi.one(id)], [id]);
  const collection = usePostCollection(loader, [id]);

  if (!user) return null;

  if (collection.isLoading) {
    return (
      <AppShell title="Post">
        <Spinner label="Loading post" />
      </AppShell>
    );
  }

  if (collection.error) {
    return (
      <AppShell title="Post">
        <ErrorNotice message={collection.error} onRetry={collection.reload} />
      </AppShell>
    );
  }

  return (
    <AppShell title="Post">
      <Feed
        collection={collection}
        viewer={user}
        paginate={false}
        emptyTitle="That post is gone"
        emptyDescription="It may have been deleted, or you may not be able to see it."
      />
    </AppShell>
  );
}
