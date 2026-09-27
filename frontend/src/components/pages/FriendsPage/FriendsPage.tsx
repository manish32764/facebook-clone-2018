import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '@templates/index';
import { Avatar, Button, Card, Spinner } from '@atoms/index';
import { EmptyState, ErrorNotice, FriendTile, Tabs } from '@molecules/index';
import { FriendListsPanel, FriendRequestsPanel } from '@organisms/index';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { friendApi, socialApi } from '@/api/endpoints';
import type { User } from '@/types';
import { timeAgo } from '@/utils/time';
import styles from './FriendsPage.module.css';

type TabKey = 'friends' | 'lists' | 'following';

export function FriendsPage() {
  const { openWith } = useChat();
  const [tab, setTab] = useState<TabKey>('friends');
  const requestsQuery = useAsync(() => friendApi.requests(), []);
  const sentQuery = useAsync(() => friendApi.sentRequests(), []);
  const friendsQuery = useAsync(() => friendApi.mine(), []);
  const suggestionsQuery = useAsync(() => friendApi.suggestions(12), []);
  const onlineQuery = useAsync(() => friendApi.online(), []);

  const [busyUserId, setBusyUserId] = useState<number | null>(null);
  const online = useMemo(() => new Set(onlineQuery.data ?? []), [onlineQuery.data]);

  function reloadAll() {
    return Promise.all([
      requestsQuery.reload(),
      sentQuery.reload(),
      friendsQuery.reload(),
      suggestionsQuery.reload(),
    ]);
  }

  async function respondToRequest(requestId: number, accept: boolean) {
    if (accept) {
      await friendApi.accept(requestId);
    } else {
      await friendApi.decline(requestId);
    }
    // Accepting changes every list, so refresh them together.
    await reloadAll();
  }

  async function addFriend(userId: number) {
    setBusyUserId(userId);
    try {
      await friendApi.sendRequest(userId);
      await Promise.all([suggestionsQuery.reload(), sentQuery.reload()]);
    } finally {
      setBusyUserId(null);
    }
  }

  async function cancelRequest(requestId: number) {
    await friendApi.cancelRequest(requestId);
    await Promise.all([sentQuery.reload(), suggestionsQuery.reload()]);
  }

  async function removeFriend(userId: number) {
    if (!window.confirm('Remove this person from your friends?')) return;
    setBusyUserId(userId);
    try {
      await friendApi.unfriend(userId);
      await Promise.all([friendsQuery.reload(), suggestionsQuery.reload()]);
    } finally {
      setBusyUserId(null);
    }
  }

  const friends = friendsQuery.data ?? [];
  const suggestions = suggestionsQuery.data ?? [];
  const sent = sentQuery.data ?? [];

  return (
    <AppShell layout="wide" title="Friends">
      <Tabs
        items={[
          { key: 'friends', label: 'Friends', count: friends.length },
          { key: 'lists', label: 'Friend Lists' },
          { key: 'following', label: 'Following' },
        ]}
        active={tab}
        onChange={setTab}
      />
      <div className={styles.tabBody}>
      {tab === 'lists' && <FriendListsPanel />}
      {tab === 'following' && <FollowingPanel />}
      {tab === 'friends' && (
      <>
      <FriendRequestsPanel
        requests={requestsQuery.data ?? []}
        isLoading={requestsQuery.isLoading}
        error={requestsQuery.error}
        onRespond={respondToRequest}
        onRetry={requestsQuery.reload}
      />

      {/* Requests you sent, so you can see and withdraw them. */}
      {sent.length > 0 && (
        <Card title={`Sent Requests (${sent.length})`} className={styles.section}>
          <div className={styles.sentList}>
            {sent.map((request) => (
              <div key={request.requestId} className={styles.sentRow}>
                <Avatar src={request.to.avatarUrl} name={request.to.fullName} size="md" />
                <span className={styles.sentText}>
                  <span className={styles.sentName}>{request.to.fullName}</span>
                  <span className={styles.sentMeta}>Sent {timeAgo(request.createdAt)}</span>
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void cancelRequest(request.requestId)}
                >
                  Cancel Request
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title={'Your Friends (' + friends.length + ')'} className={styles.section}>
        {friendsQuery.isLoading && <Spinner size="sm" />}
        {friendsQuery.error && <ErrorNotice message={friendsQuery.error} onRetry={friendsQuery.reload} />}

        {!friendsQuery.isLoading && friends.length === 0 && (
          <EmptyState
            icon="friends"
            title="You have not added anyone yet"
            description="Pick someone from the suggestions below to get started."
          />
        )}

        <div className={styles.grid}>
          {friends.map((friend) => (
            <FriendTile
              key={friend.user.id}
              friend={friend}
              variant="card"
              online={online.has(friend.user.id)}
              isBusy={busyUserId === friend.user.id}
              onRemove={(id) => void removeFriend(id)}
              onMessage={(id) => void openWith(id)}
            />
          ))}
        </div>
      </Card>

      <Card title="People You May Know" className={styles.section}>
        {suggestionsQuery.isLoading && <Spinner size="sm" />}

        {!suggestionsQuery.isLoading && suggestions.length === 0 && (
          <EmptyState icon="users" title="No suggestions right now" description="You already know everyone here." />
        )}

        <div className={styles.grid}>
          {suggestions.map((person) => (
            <FriendTile
              key={person.user.id}
              friend={person}
              variant="card"
              isBusy={busyUserId === person.user.id}
              onAdd={(id) => void addFriend(id)}
            />
          ))}
        </div>
      </Card>
      </>
      )}
      </div>
    </AppShell>
  );
}

function PersonRow({ person, action }: { person: User; action?: React.ReactNode }) {
  return (
    <div className={styles.sentRow}>
      <Avatar src={person.avatarUrl} name={person.fullName} size="md" />
      <span className={styles.sentText}>
        <Link to={`/profile/${person.id}`} className={styles.sentName}>
          {person.fullName}
        </Link>
      </span>
      {action}
    </div>
  );
}

/** Who you follow, who follows you, and people worth following. */
function FollowingPanel() {
  const { user } = useAuth();
  const followingQuery = useAsync(() => (user ? socialApi.following(user.id) : Promise.resolve([])), [user?.id]);
  const followersQuery = useAsync(() => (user ? socialApi.followers(user.id) : Promise.resolve([])), [user?.id]);
  const suggestionsQuery = useAsync(() => socialApi.followSuggestions(), []);

  async function toggle(userId: number) {
    await socialApi.toggleFollow(userId);
    await Promise.all([followingQuery.reload(), suggestionsQuery.reload()]);
  }

  const following = followingQuery.data ?? [];
  const followers = followersQuery.data ?? [];
  const suggestions = suggestionsQuery.data ?? [];

  return (
    <>
      <Card title={`Following (${following.length})`} className={styles.section}>
        {following.length === 0 ? (
          <EmptyState icon="bell" title="You are not following anyone" description="Follow people to see their public posts without being friends." />
        ) : (
          <div className={styles.sentList}>
            {following.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                action={<Button size="sm" variant="secondary" onClick={() => void toggle(person.id)}>Unfollow</Button>}
              />
            ))}
          </div>
        )}
      </Card>

      <Card title={`Followers (${followers.length})`} className={styles.section}>
        {followers.length === 0 ? (
          <EmptyState icon="users" title="No followers yet" />
        ) : (
          <div className={styles.sentList}>
            {followers.map((person) => (
              <PersonRow key={person.id} person={person} />
            ))}
          </div>
        )}
      </Card>

      {suggestions.length > 0 && (
        <Card title="People to follow" className={styles.section}>
          <div className={styles.sentList}>
            {suggestions.map((person) => (
              <PersonRow
                key={person.id}
                person={person}
                action={<Button size="sm" onClick={() => void toggle(person.id)}>Follow</Button>}
              />
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
