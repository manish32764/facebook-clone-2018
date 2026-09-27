import { useCallback, useState } from 'react';
import { AppShell } from '@templates/index';
import { Card, Spinner } from '@atoms/index';
import { EmptyState, ErrorNotice } from '@molecules/index';
import { Feed } from '@organisms/index';
import { useAuth } from '@/hooks/useAuth';
import { usePostCollection } from '@/hooks/usePostCollection';
import { postApi } from '@/api/endpoints';
import styles from './MemoriesPage.module.css';

/**
 * On This Day: your own posts from a year or more ago that fall near today's
 * date. The API picks the window, so the page just renders what comes back.
 */
export function MemoriesPage() {
  const { user } = useAuth();
  const [isReady, setIsReady] = useState(false);

  const loader = useCallback(async () => {
    const posts = await postApi.memories();
    setIsReady(true);
    return posts;
  }, []);

  const memories = usePostCollection(loader, []);

  if (!user) return null;

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });

  return (
    <AppShell title="Memories">
      <Card title="On This Day" className={styles.intro}>
        <p className={styles.blurb}>
          Looking back at <strong>{today}</strong>. Posts from a year or more ago show up here.
        </p>
      </Card>

      {memories.isLoading && !isReady ? (
        <Spinner label="Looking through your timeline" />
      ) : memories.error ? (
        <ErrorNotice message={memories.error} onRetry={memories.reload} />
      ) : memories.posts.length === 0 ? (
        <Card>
          <EmptyState
            icon="clock"
            title="No memories yet"
            description="Once your posts are a year old they will start appearing here."
          />
        </Card>
      ) : (
        <Feed collection={memories} viewer={user} paginate={false} />
      )}
    </AppShell>
  );
}
