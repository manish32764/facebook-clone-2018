import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '@templates/index';
import { Button, Card, Icon, Spinner } from '@atoms/index';
import { EmptyState, PageCard, Tabs } from '@molecules/index';
import { PageDialog } from '@organisms/index';
import { useAsync } from '@/hooks/useAsync';
import { pageApi } from '@/api/endpoints';
import styles from '@/styles/Feature.module.css';

type TabKey = 'liked' | 'mine' | 'discover';

/** Pages: the ones you like, the ones you run, and ones to discover. */
export function PagesPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('liked');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const likedQuery = useAsync(() => pageApi.connected(), []);
  const mineQuery = useAsync(() => pageApi.mine(), []);
  const discoverQuery = useAsync(() => pageApi.discover(), []);

  const lists = { liked: likedQuery, mine: mineQuery, discover: discoverQuery };
  const query = lists[tab];
  const shown = query.data ?? [];

  async function toggleLike(pageId: number) {
    setBusyId(pageId);
    try {
      await pageApi.toggleLike(pageId);
      await Promise.all([likedQuery.reload(), discoverQuery.reload()]);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell layout="wide" title="Pages">
      <Card
        title="Pages"
        className={styles.intro}
        action={
          <Button size="sm" onClick={() => setIsCreating(true)}>
            <Icon name="plus" size={12} /> Create Page
          </Button>
        }
      >
        <p className={styles.blurb}>
          Businesses, brands and public figures. Like or follow a Page and its posts appear in your News Feed.
        </p>
      </Card>

      <Tabs
        items={[
          { key: 'liked', label: 'Liked Pages', count: likedQuery.data?.length },
          { key: 'mine', label: 'Your Pages', count: mineQuery.data?.length },
          { key: 'discover', label: 'Discover', count: discoverQuery.data?.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      <Card padded={false} className={styles.section}>
        {query.isLoading && shown.length === 0 ? (
          <div className={styles.loading}>
            <Spinner label="Loading Pages" />
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon="flag"
            title={tab === 'mine' ? 'You have not created a Page' : tab === 'liked' ? 'No liked Pages yet' : 'Nothing new to discover'}
            description={tab === 'liked' ? 'Discover Pages and like the ones you care about.' : undefined}
            action={
              tab === 'mine' ? (
                <Button onClick={() => setIsCreating(true)}>Create Page</Button>
              ) : tab === 'liked' ? (
                <Button onClick={() => setTab('discover')}>Discover Pages</Button>
              ) : undefined
            }
          />
        ) : (
          <div className={styles.grid}>
            {shown.map((page) => (
              <PageCard key={page.id} page={page} isBusy={busyId === page.id} onToggleLike={(id) => void toggleLike(id)} />
            ))}
          </div>
        )}
      </Card>

      {isCreating && (
        <PageDialog onClose={() => setIsCreating(false)} onSaved={(page) => navigate(`/pages/${page.id}`)} />
      )}
    </AppShell>
  );
}
