import { AppShell } from '@templates/index';
import { Card } from '@atoms/index';
import { Feed } from '@organisms/index';
import { useAuth } from '@/hooks/useAuth';
import { usePostCollection } from '@/hooks/usePostCollection';
import { postApi } from '@/api/endpoints';
import styles from './SavedPage.module.css';

/** Saved items, most recently saved first. */
export function SavedPage() {
  const { user } = useAuth();
  const saved = usePostCollection((page, size) => postApi.saved(page, size), []);

  if (!user) return null;

  return (
    <AppShell title="Saved">
      <Card title="Saved" className={styles.intro}>
        <p className={styles.blurb}>
          Posts you have saved, newest first. Use the bookmark on any post to add or remove it.
        </p>
      </Card>

      <Feed
        collection={saved}
        viewer={user}
        emptyTitle="Nothing saved yet"
        emptyDescription="Tap Save on a post and it will wait for you here."
      />
    </AppShell>
  );
}
