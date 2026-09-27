import { useState } from 'react';
import { AppShell } from '@templates/index';
import { Link } from 'react-router-dom';
import { Avatar, Button, Card, Icon, Spinner } from '@atoms/index';
import { EmptyState, GroupCard, Tabs } from '@molecules/index';
import { CreateGroupDialog } from '@organisms/index';
import { useAsync } from '@/hooks/useAsync';
import { groupApi } from '@/api/endpoints';
import styles from './GroupsPage.module.css';

type TabKey = 'joined' | 'discover';

export function GroupsPage() {
  const [tab, setTab] = useState<TabKey>('joined');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const joinedQuery = useAsync(() => groupApi.mine(), []);
  const discoverQuery = useAsync(() => groupApi.discover(), []);
  const invitesQuery = useAsync(() => groupApi.invites(), []);
  const invites = invitesQuery.data ?? [];

  const joined = joinedQuery.data ?? [];
  const discover = discoverQuery.data ?? [];
  const shown = tab === 'joined' ? joined : discover;
  const isLoading = tab === 'joined' ? joinedQuery.isLoading : discoverQuery.isLoading;

  function reloadBoth() {
    void joinedQuery.reload();
    void discoverQuery.reload();
    void invitesQuery.reload();
  }

  async function declineInvite(groupId: number) {
    await groupApi.declineInvite(groupId);
    reloadBoth();
  }

  async function join(groupId: number) {
    setBusyId(groupId);
    try {
      await groupApi.join(groupId);
      reloadBoth();
    } finally {
      setBusyId(null);
    }
  }

  async function leave(groupId: number) {
    if (!window.confirm('Leave this group?')) return;
    setBusyId(groupId);
    try {
      await groupApi.leave(groupId);
      reloadBoth();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell layout="wide" title="Groups">
      <Card
        title="Groups"
        className={styles.intro}
        action={
          <Button size="sm" onClick={() => setIsCreating(true)}>
            <Icon name="plus" size={12} /> Create Group
          </Button>
        }
      >
        <p className={styles.blurb}>
          Groups have their own feed, and posts from every group you belong to also show up in your
          News Feed.
        </p>
      </Card>

      {invites.length > 0 && (
        <Card title={`Group Invites (${invites.length})`} className={styles.intro}>
          {invites.map((invite) => (
            <div key={invite.group.id} className={styles.inviteRow}>
              <Avatar src={invite.inviter.avatarUrl} name={invite.inviter.fullName} size="md" />
              <span className={styles.inviteText}>
                <strong>{invite.inviter.fullName}</strong> invited you to join{' '}
                <Link to={`/groups/${invite.group.id}`}>{invite.group.name}</Link>
              </span>
              <Button size="sm" disabled={busyId === invite.group.id} onClick={() => void join(invite.group.id)}>
                Join
              </Button>
              <Button size="sm" variant="secondary" onClick={() => void declineInvite(invite.group.id)}>
                Decline
              </Button>
            </div>
          ))}
        </Card>
      )}

      <Tabs
        items={[
          { key: 'joined', label: 'Your Groups', count: joined.length },
          { key: 'discover', label: 'Discover', count: discover.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      <Card padded={false} className={styles.panel}>
        {isLoading && shown.length === 0 ? (
          <div className={styles.loading}>
            <Spinner label="Loading groups" />
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon="users"
            title={tab === 'joined' ? 'You have not joined any groups' : 'Nothing new to discover'}
            description={
              tab === 'joined'
                ? 'Join one from Discover, or create your own.'
                : 'You are already a member of every group here.'
            }
            action={
              tab === 'joined' ? (
                <Button onClick={() => setTab('discover')}>Browse Groups</Button>
              ) : undefined
            }
          />
        ) : (
          <div className={styles.grid}>
            {shown.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                isBusy={busyId === group.id}
                onJoin={(id) => void join(id)}
                onLeave={(id) => void leave(id)}
              />
            ))}
          </div>
        )}
      </Card>

      {isCreating && (
        <CreateGroupDialog
          onClose={() => setIsCreating(false)}
          onCreated={() => {
            setIsCreating(false);
            setTab('joined');
            reloadBoth();
          }}
        />
      )}
    </AppShell>
  );
}
