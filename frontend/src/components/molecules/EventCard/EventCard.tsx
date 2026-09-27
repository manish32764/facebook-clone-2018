import { Link } from 'react-router-dom';
import { Button, Icon } from '@atoms/index';
import { classNames, pluralize } from '@/utils/format';
import { eventDate, eventDateParts } from '@/utils/time';
import type { AttendeeStatus, Event } from '@/types';
import styles from './EventCard.module.css';

export interface EventCardProps {
  event: Event;
  onRespond?: (eventId: number, status: AttendeeStatus) => void;
  isBusy?: boolean;
}

export function EventCard({ event, onRespond, isBusy = false }: EventCardProps) {
  const { month, day } = eventDateParts(event.startsAt);

  return (
    <div className={styles.card}>
      <Link to={`/events/${event.id}`} className={styles.cover}>
        {event.coverUrl ? (
          <img className={styles.coverImage} src={event.coverUrl} alt="" loading="lazy" />
        ) : (
          <span className={styles.coverFallback}>
            <Icon name="calendar" size={28} />
          </span>
        )}
        {/* The torn-calendar date block the real event card puts on the cover. */}
        <span className={styles.dateBlock}>
          <span className={styles.dateMonth}>{month}</span>
          <span className={styles.dateDay}>{day}</span>
        </span>
      </Link>

      <div className={styles.body}>
        <span className={styles.when}>{eventDate(event.startsAt)}</span>

        <Link to={`/events/${event.id}`} className={styles.name}>
          {event.name}
        </Link>

        <span className={styles.meta}>
          <Icon name={event.online ? 'globe' : 'location'} size={11} />
          {event.online ? 'Online event' : event.location ?? 'Location to be confirmed'}
        </span>

        <span className={styles.counts}>
          {pluralize(event.goingCount, 'person', 'people')} going
          <span className={styles.dot}>&middot;</span>
          {event.interestedCount} interested
        </span>

        {onRespond && (
          <div className={styles.actions}>
            <Button
              size="sm"
              variant={event.myStatus === 'GOING' ? 'primary' : 'secondary'}
              disabled={isBusy}
              className={classNames(styles.respond)}
              onClick={() => onRespond(event.id, 'GOING')}
            >
              <Icon name="check" size={12} /> Going
            </Button>
            <Button
              size="sm"
              variant={event.myStatus === 'INTERESTED' ? 'primary' : 'secondary'}
              disabled={isBusy}
              className={styles.respond}
              onClick={() => onRespond(event.id, 'INTERESTED')}
            >
              Interested
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
