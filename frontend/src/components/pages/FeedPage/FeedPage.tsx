import { useState } from 'react';
import { AppShell } from '@templates/index';
import { Icon } from '@atoms/index';
import { Feed, PostComposer, StoriesRail } from '@organisms/index';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { usePostCollection } from '@/hooks/usePostCollection';
import { adApi, postApi, storyApi, type FeedMode } from '@/api/endpoints';
import { classNames } from '@/utils/format';
import styles from './FeedPage.module.css';

const MODE_KEY = 'fbclone.feedMode';

function storedMode(): FeedMode {
  try {
    return window.localStorage.getItem(MODE_KEY) === 'recent' ? 'recent' : 'top';
  } catch {
    return 'top';
  }
}

export function FeedPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<FeedMode>(storedMode);
  const storiesQuery = useAsync(() => storyApi.reels(), []);
  const adsQuery = useAsync(() => adApi.serve(3), []);
  const feed = usePostCollection((page, size) => postApi.feed(page, size, mode), [mode]);

  function choose(next: FeedMode) {
    setMode(next);
    try {
      window.localStorage.setItem(MODE_KEY, next);
    } catch {
      /* blocked storage: the choice just lasts for this visit */
    }
  }

  if (!user) return null;

  return (
    <AppShell title="Facebook">
      <StoriesRail reels={storiesQuery.data ?? []} onChanged={storiesQuery.reload} />

      <PostComposer author={user} onCreate={feed.createPost} />

      {/* News Feed ranking: Top Stories (the default) or strictly newest first. */}
      <div className={styles.modeBar} role="tablist" aria-label="Sort News Feed">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'top'}
          className={classNames(styles.mode, mode === 'top' && styles.modeActive)}
          onClick={() => choose('top')}
        >
          <Icon name="star" size={13} /> Top Stories
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'recent'}
          className={classNames(styles.mode, mode === 'recent' && styles.modeActive)}
          onClick={() => choose('recent')}
        >
          <Icon name="clock" size={13} /> Most Recent
        </button>
      </div>

      <Feed
        collection={feed}
        viewer={user}
        ads={adsQuery.data ?? []}
        emptyTitle="Your News Feed is empty"
        emptyDescription="Add a few friends, follow people and Pages, join a group, or share your first post to get things going."
      />
    </AppShell>
  );
}
