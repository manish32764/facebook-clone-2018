import { useState } from 'react';
import { AppShell } from '@templates/index';
import { Link } from 'react-router-dom';
import { Avatar, Button, Card, Icon, Spinner } from '@atoms/index';
import { EmptyState, EventCard, Tabs } from '@molecules/index';
import { CreateEventDialog } from '@organisms/index';
import { useAsync } from '@/hooks/useAsync';
import { eventApi } from '@/api/endpoints';
import type { AttendeeStatus } from '@/types';
import styles from './EventsPage.module.css';

type TabKey = 'upcoming' | 'invites' | 'mine' | 'past';

export function EventsPage() {
  const [tab, setTab] = useState<TabKey>('upcoming');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const upcomingQuery = useAsync(() => eventApi.upcoming(), []);
  const mineQuery = useAsync(() => eventApi.mine(), []);
  const pastQuery = useAsync(() => eventApi.past(), []);
  const invitesQuery = useAsync(() => eventApi.invites(), []);
  const invites = invitesQuery.data ?? [];

  const upcoming = upcomingQuery.data ?? [];
  const mine = mineQuery.data ?? [];
  const past = pastQuery.data ?? [];

  const shown = tab === 'upcoming' ? upcoming : tab === 'mine' ? mine : past;
  const isLoading =
    tab === 'upcoming'
      ? upcomingQuery.isLoading
      : tab === 'mine'
        ? mineQuery.isLoading
        : pastQuery.isLoading;

  function reloadAll() {
    void upcomingQuery.reload();
    void mineQuery.reload();
    void pastQuery.reload();
    void invitesQuery.reload();
  }

  async function respond(eventId: number, status: AttendeeStatus) {
    setBusyId(eventId);
    try {
      await eventApi.respond(eventId, status);
      reloadAll();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell layout="wide" title="Events">
      <Card
        title="Events"
        className={styles.intro}
        action={
          <Button size="sm" onClick={() => setIsCreating(true)}>
            <Icon name="plus" size={12} /> Create Event
          </Button>
        }
      >
        <p className={styles.blurb}>
          Say you are going or interested, and the host hears about it. Invite friends when you
          create an event, or from any event you are going to.
        </p>
      </Card>

      <Tabs
        items={[
          { key: 'upcoming', label: 'Upcoming', count: upcoming.length },
          { key: 'invites', label: 'Invitations', count: invites.length },
          { key: 'mine', label: 'Your Events', count: mine.length },
          { key: 'past', label: 'Past', count: past.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'invites' ? (
        <Card className={styles.panel}>
          {invites.length === 0 ? (
            <EmptyState icon="calendar" title="No invitations" description="When friends invite you to events, they show up here." />
          ) : (
            invites.map((invite) => (
              <div key={invite.event.id} className={styles.inviteRow}>
                <Avatar src={invite.inviter.avatarUrl} name={invite.inviter.fullName} size="md" />
                <span className={styles.inviteText}>
                  <strong>{invite.inviter.fullName}</strong> invited you to{' '}
                  <Link to={`/events/${invite.event.id}`}>{invite.event.name}</Link>
                </span>
                <Button size="sm" disabled={busyId === invite.event.id} onClick={() => void respond(invite.event.id, 'GOING')}>
                  Going
                </Button>
                <Button size="sm" variant="secondary" disabled={busyId === invite.event.id} onClick={() => void respond(invite.event.id, 'INTERESTED')}>
                  Interested
                </Button>
                <Button size="sm" variant="ghost" disabled={busyId === invite.event.id} onClick={() => void respond(invite.event.id, 'NOT_GOING')}>
                  Can&rsquo;t go
                </Button>
              </div>
            ))
          )}
        </Card>
      ) : (
      <Card padded={false} className={styles.panel}>
        {isLoading && shown.length === 0 ? (
          <div className={styles.loading}>
            <Spinner label="Loading events" />
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon="calendar"
            title={
              tab === 'mine'
                ? 'You have not replied to any events'
                : tab === 'past'
                  ? 'No past events'
                  : 'Nothing coming up'
            }
            description={
              tab === 'mine'
                ? 'Mark yourself going or interested and it will appear here.'
                : 'Create one and invite your friends.'
            }
            action={<Button onClick={() => setIsCreating(true)}>Create Event</Button>}
          />
        ) : (
          <div className={styles.grid}>
            {shown.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isBusy={busyId === event.id}
                /* A past event is a record, not an invitation, so it takes no reply. */
                onRespond={tab === 'past' ? undefined : (id, status) => void respond(id, status)}
              />
            ))}
          </div>
        )}
      </Card>
      )}

      {isCreating && (
        <CreateEventDialog
          onClose={() => setIsCreating(false)}
          onCreated={() => {
            setIsCreating(false);
            setTab('mine');
            reloadAll();
          }}
        />
      )}
    </AppShell>
  );
}
