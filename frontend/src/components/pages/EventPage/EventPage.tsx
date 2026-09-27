import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '@templates/index';
import { Avatar, Button, Card, Icon, Spinner } from '@atoms/index';
import { EmptyState, ErrorNotice, Tabs } from '@molecules/index';
import { CreateEventDialog, FriendPicker } from '@organisms/index';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { eventApi } from '@/api/endpoints';
import { eventDate, eventDateParts } from '@/utils/time';
import { classNames, pluralize } from '@/utils/format';
import type { AttendeeStatus } from '@/types';
import styles from './EventPage.module.css';

type TabKey = 'about' | 'going' | 'interested';

/** One event: its cover, the reply buttons, and who is coming. */
export function EventPage() {
  const { user } = useAuth();
  const { eventId } = useParams<{ eventId: string }>();
  const id = Number(eventId);
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabKey>('about');
  const [isBusy, setIsBusy] = useState(false);
  const [dialog, setDialog] = useState<'edit' | 'invite' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const eventQuery = useAsync(() => eventApi.one(id), [id]);
  const attendeesQuery = useAsync(() => eventApi.attendees(id), [id]);
  const invitedQuery = useAsync(() => eventApi.invited(id), [id]);

  const event = eventQuery.data;
  const attendees = attendeesQuery.data ?? [];

  async function respond(status: AttendeeStatus) {
    setIsBusy(true);
    try {
      await eventApi.respond(id, status);
      void eventQuery.reload();
      void attendeesQuery.reload();
    } finally {
      setIsBusy(false);
    }
  }

  async function cancel() {
    if (!window.confirm('Cancel this event? This cannot be undone.')) return;
    setIsBusy(true);
    try {
      await eventApi.remove(id);
      navigate('/events');
    } finally {
      setIsBusy(false);
    }
  }

  if (!user) return null;

  if (eventQuery.isLoading) {
    return (
      <AppShell layout="wide" title="Event">
        <Spinner label="Loading event" />
      </AppShell>
    );
  }

  if (eventQuery.error || !event) {
    return (
      <AppShell layout="wide" title="Event">
        <ErrorNotice
          message={eventQuery.error ?? 'That event could not be found'}
          onRetry={eventQuery.reload}
        />
      </AppShell>
    );
  }

  const { month, day } = eventDateParts(event.startsAt);
  const isHost = event.host.id === user.id;
  const shown =
    tab === 'going'
      ? attendees.filter((attendee) => attendee.status === 'GOING')
      : tab === 'interested'
        ? attendees.filter((attendee) => attendee.status === 'INTERESTED')
        : [];

  return (
    <AppShell layout="wide" title={event.name}>
      <div className={styles.cover}>
        {event.coverUrl ? (
          <img className={styles.coverImage} src={event.coverUrl} alt="" />
        ) : (
          <span className={styles.coverFallback} />
        )}

        <div className={styles.coverBar}>
          <span className={styles.dateBlock}>
            <span className={styles.dateMonth}>{month}</span>
            <span className={styles.dateDay}>{day}</span>
          </span>

          <div className={styles.identity}>
            <span className={styles.when}>{eventDate(event.startsAt)}</span>
            <span className={styles.name}>{event.name}</span>
            <span className={styles.meta}>
              <Icon name={event.online ? 'globe' : 'location'} size={12} />
              {event.online ? 'Online event' : event.location ?? 'Location to be confirmed'}
            </span>
          </div>

          <div className={styles.actions}>
            <Button
              variant={event.myStatus === 'GOING' ? 'primary' : 'secondary'}
              disabled={isBusy}
              onClick={() => void respond('GOING')}
            >
              <Icon name="check" size={13} /> Going
            </Button>
            <Button
              variant={event.myStatus === 'INTERESTED' ? 'primary' : 'secondary'}
              disabled={isBusy}
              onClick={() => void respond('INTERESTED')}
            >
              Interested
            </Button>
            {event.myStatus && event.myStatus !== 'NOT_GOING' && (
              <Button variant="ghost" disabled={isBusy} onClick={() => void respond('NOT_GOING')}>
                Can&rsquo;t go
              </Button>
            )}
            {(isHost || (event.myStatus && event.myStatus !== 'NOT_GOING')) && (
              <Button variant="secondary" onClick={() => setDialog('invite')}>
                <Icon name="plus" size={12} /> Invite
              </Button>
            )}
            {isHost && (
              <Button variant="secondary" onClick={() => setDialog('edit')}>
                <Icon name="pencil" size={12} /> Edit
              </Button>
            )}
          </div>
        </div>
      </div>

      {notice && <p className={styles.notice}>{notice}</p>}

      <Tabs
        items={[
          { key: 'about', label: 'Details' },
          { key: 'going', label: 'Going', count: event.goingCount },
          { key: 'interested', label: 'Interested', count: event.interestedCount },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className={styles.body}>
        {tab === 'about' ? (
          <Card title="Details">
            <p className={styles.about}>{event.description ?? 'No details yet.'}</p>

            <div className={styles.row}>
              <Icon name="clock" size={16} />
              <span>
                {eventDate(event.startsAt)}
                {event.endsAt && ` until ${eventDate(event.endsAt)}`}
              </span>
            </div>
            <div className={styles.row}>
              <Icon name={event.online ? 'globe' : 'location'} size={16} />
              <span>{event.online ? 'Online event' : event.location ?? 'To be confirmed'}</span>
            </div>
            <div className={styles.row}>
              <Icon name="flag" size={16} />
              <span>
                Hosted by{' '}
                <Link to={`/profile/${event.host.id}`} className={styles.hostLink}>
                  {event.host.fullName}
                </Link>
              </span>
            </div>
            <div className={styles.row}>
              <Icon name="users" size={16} />
              <span>
                {pluralize(event.goingCount, 'person', 'people')} going &middot;{' '}
                {event.interestedCount} interested &middot; {event.invitedCount} invited
              </span>
            </div>

            {isHost && (
              <div className={styles.hostActions}>
                <Button variant="danger" disabled={isBusy} onClick={() => void cancel()}>
                  Cancel Event
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <Card title={tab === 'going' ? 'Going' : 'Interested'}>
            {attendeesQuery.isLoading && <Spinner size="sm" />}
            {shown.length === 0 && !attendeesQuery.isLoading ? (
              <EmptyState icon="users" title="Nobody here yet" />
            ) : (
              <div className={styles.attendeeGrid}>
                {shown.map((attendee) => (
                  <Link
                    key={attendee.user.id}
                    to={`/profile/${attendee.user.id}`}
                    className={styles.attendee}
                  >
                    <Avatar src={attendee.user.avatarUrl} name={attendee.user.fullName} size="md" />
                    <span className={classNames(styles.attendeeName)}>{attendee.user.fullName}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
      {dialog === 'edit' && (
        <CreateEventDialog
          event={event}
          onClose={() => setDialog(null)}
          onCreated={(updated) => {
            setDialog(null);
            eventQuery.setData(() => updated);
          }}
        />
      )}

      {dialog === 'invite' && (
        <FriendPicker
          title="Invite friends to this event"
          confirmLabel="Send Invites"
          disabledIds={[...(invitedQuery.data ?? []), ...attendees.map((a) => a.user.id)]}
          disabledNote="Invited or replied"
          onClose={() => setDialog(null)}
          onConfirm={async (ids) => {
            const result = await eventApi.invite(id, ids);
            setNotice(`${pluralize(result.sent, 'invite')} sent.`);
            void invitedQuery.reload();
            void eventQuery.reload();
          }}
        />
      )}
    </AppShell>
  );
}
