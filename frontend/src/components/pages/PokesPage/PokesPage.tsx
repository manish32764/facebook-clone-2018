import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '@templates/index';
import { Avatar, Button, Card, Icon, Spinner } from '@atoms/index';
import { EmptyState } from '@molecules/index';
import { useAsync } from '@/hooks/useAsync';
import { friendApi, socialApi } from '@/api/endpoints';
import { pluralize } from '@/utils/format';
import { timeAgo } from '@/utils/time';
import styles from '@/styles/Feature.module.css';

/** Pokes: the ones waiting for you, the ones you sent, and friends to poke. */
export function PokesPage() {
  const pokesQuery = useAsync(() => socialApi.pokes(), []);
  const sentQuery = useAsync(() => socialApi.sentPokes(), []);
  const friendsQuery = useAsync(() => friendApi.mine(), []);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set());

  async function sendPoke(userId: number) {
    setBusyId(userId);
    try {
      await socialApi.poke(userId);
      setDone((set) => new Set(set).add(userId));
      await Promise.all([pokesQuery.reload(), sentQuery.reload()]);
    } finally {
      setBusyId(null);
    }
  }

  async function dismiss(pokeId: number) {
    await socialApi.dismissPoke(pokeId);
    void pokesQuery.reload();
  }

  const pokes = pokesQuery.data ?? [];
  const sent = sentQuery.data ?? [];
  const waiting = new Set(sent.map((p) => p.user.id));

  return (
    <AppShell layout="wide" title="Pokes">
      <Card title="Pokes" className={styles.intro}>
        <p className={styles.blurb}>Say hi without saying anything. Poking someone back clears their poke.</p>
      </Card>

      <Card title={`Pokes waiting for you (${pokes.length})`} className={styles.section}>
        {pokesQuery.isLoading ? (
          <Spinner size="sm" />
        ) : pokes.length === 0 ? (
          <EmptyState icon="poke" title="No new pokes" />
        ) : (
          <div className={styles.list}>
            {pokes.map((poke) => (
              <div key={poke.id} className={styles.listRow}>
                <Avatar src={poke.user.avatarUrl} name={poke.user.fullName} size="md" />
                <span className={styles.listText}>
                  <Link to={`/profile/${poke.user.id}`} className={styles.listName}>
                    {poke.user.fullName}
                  </Link>
                  <span className={styles.muted}>
                    poked you {poke.count > 1 ? `${pluralize(poke.count, 'time')} in a row` : ''} &middot; {timeAgo(poke.lastPokedAt)}
                  </span>
                </span>
                <Button size="sm" disabled={busyId === poke.user.id} onClick={() => void sendPoke(poke.user.id)}>
                  <Icon name="poke" size={12} /> Poke Back
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void dismiss(poke.id)}>
                  Dismiss
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Suggested Pokes" className={styles.section}>
        {(friendsQuery.data ?? []).length === 0 ? (
          <EmptyState icon="friends" title="Add friends to poke them" />
        ) : (
          <div className={styles.list}>
            {(friendsQuery.data ?? []).map(({ user }) => (
              <div key={user.id} className={styles.listRow}>
                <Avatar src={user.avatarUrl} name={user.fullName} size="md" />
                <span className={styles.listText}>
                  <Link to={`/profile/${user.id}`} className={styles.listName}>
                    {user.fullName}
                  </Link>
                  {waiting.has(user.id) && <span className={styles.muted}>Waiting for them to poke back</span>}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busyId === user.id}
                  onClick={() => void sendPoke(user.id)}
                >
                  <Icon name="poke" size={12} /> {done.has(user.id) ? 'Poked!' : 'Poke'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
