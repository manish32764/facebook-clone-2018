import { AppShell } from '@templates/index';
import { Card } from '@atoms/index';
import { Feed } from '@organisms/index';
import { useAuth } from '@/hooks/useAuth';
import { usePostCollection } from '@/hooks/usePostCollection';
import { postApi } from '@/api/endpoints';
import styles from './WatchPage.module.css';

/** Watch: every post carrying a video, newest first. */
export function WatchPage() {
  const { user } = useAuth();
  const videos = usePostCollection((page, size) => postApi.videos(page, size), []);

  if (!user) return null;

  return (
    <AppShell layout="wide" title="Watch">
      <Card title="Watch" className={styles.intro}>
        <p className={styles.blurb}>
          Videos shared by you and everyone else, collected in one place. Post a clip from the
          composer&rsquo;s Photo/Video panel and it lands here too.
        </p>
      </Card>

      <div className={styles.column}>
        <Feed
          collection={videos}
          viewer={user}
          emptyTitle="No videos yet"
          emptyDescription="Add a video URL to a post and it will show up in Watch."
        />
      </div>
    </AppShell>
  );
}
