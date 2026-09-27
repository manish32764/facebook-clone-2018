import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Button, Icon, PresenceDot, TextArea } from '@atoms/index';
import { AdCard, ErrorNotice, Modal } from '@molecules/index';
import { useChat } from '@/hooks/useChat';
import { postApi } from '@/api/endpoints';
import { toErrorMessage } from '@/api/client';
import { classNames } from '@/utils/format';
import { eventDateParts } from '@/utils/time';
import type { Ad, Event, Friend, User } from '@/types';
import styles from './RightSidebar.module.css';

export interface RightSidebarProps {
  contacts: Friend[];
  /** Friend ids the presence service reports as online right now. */
  onlineIds?: number[];
  birthdays?: User[];
  upcomingEvents?: Event[];
  /** Live ads from Ads Manager. */
  ads?: Ad[];
}

/**
 * The right rail: sponsored slots, birthday and event reminders, then the
 * contacts list. Clicking a contact opens a chat head rather than navigating,
 * which is what the real rail does.
 */
export function RightSidebar({
  contacts,
  onlineIds = [],
  birthdays = [],
  upcomingEvents = [],
  ads = [],
}: RightSidebarProps) {
  const { openWith } = useChat();
  const [filter, setFilter] = useState('');
  const [wishing, setWishing] = useState<User | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const online = useMemo(() => new Set(onlineIds), [onlineIds]);

  // Online contacts float to the top, exactly as they do in the product.
  const ordered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const matching = needle
      ? contacts.filter((contact) => contact.user.fullName.toLowerCase().includes(needle))
      : contacts;

    return [...matching].sort((a, b) => {
      const aOnline = online.has(a.user.id) ? 0 : 1;
      const bOnline = online.has(b.user.id) ? 0 : 1;
      return aOnline - bOnline || a.user.fullName.localeCompare(b.user.fullName);
    });
  }, [contacts, filter, online]);

  const nextEvent = upcomingEvents[0];

  return (
    <aside className={styles.sidebar} aria-label="Sponsored, reminders and contacts">
      {ads.length > 0 && (
        <div className={`${styles.section} ${styles.sponsoredSection}`}>
          <div className={styles.sectionTitle}>
            <span>Sponsored</span>
            <Link to="/ads" className={styles.sectionAction}>
              Create Ad
            </Link>
          </div>
          {ads.map((ad) => (
            <AdCard key={ad.id} ad={ad} variant="rail" />
          ))}
        </div>
      )}

      {birthdays.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <span>Birthdays</span>
          </div>
          {birthdays.map((person) => (
            <div key={person.id} className={styles.reminder}>
              <span className={styles.reminderIcon}>
                <Icon name="smiley" size={14} />
              </span>
              <span className={styles.reminderText}>
                <Link to={`/profile/${person.id}`}>
                  <strong>{person.fullName}</strong>
                </Link>{' '}
                has a birthday today.{' '}
                <button type="button" className={styles.inlineAction} onClick={() => setWishing(person)}>
                  Write on {person.firstName}&rsquo;s timeline
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {nextEvent && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <span>Upcoming Event</span>
            <Link to="/events" className={styles.sectionAction}>
              See All
            </Link>
          </div>
          <Link to={`/events/${nextEvent.id}`} className={styles.reminder}>
            <span className={`${styles.reminderIcon} ${styles.reminderDate}`}>
              <span className={styles.reminderMonth}>{eventDateParts(nextEvent.startsAt).month}</span>
              <span className={styles.reminderDay}>{eventDateParts(nextEvent.startsAt).day}</span>
            </span>
            <span className={styles.reminderText}>
              <strong>{nextEvent.name}</strong>
              <span className={styles.reminderMeta}>
                {nextEvent.goingCount} going
              </span>
            </span>
          </Link>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <span>Contacts</span>
          <button
            type="button"
            className={styles.searchToggle}
            aria-label="Search contacts"
            onClick={() => setIsSearchOpen((open) => !open)}
          >
            <Icon name="search" size={12} />
          </button>
        </div>

        {isSearchOpen && (
          <input
            className={styles.contactSearch}
            value={filter}
            placeholder="Search contacts"
            aria-label="Search contacts"
            onChange={(event) => setFilter(event.target.value)}
          />
        )}

        {ordered.length === 0 && <p className={styles.blank}>No contacts to show.</p>}

        {ordered.map(({ user }) => (
          <button
            key={user.id}
            type="button"
            className={styles.contact}
            onClick={() => void openWith(user.id)}
            title={`Chat with ${user.fullName}`}
          >
            <span className={styles.contactAvatar}>
              <Avatar src={user.avatarUrl} name={user.fullName} size="xs" circle />
            </span>
            <span className={classNames(styles.contactName)}>{user.fullName}</span>
            <PresenceDot online={online.has(user.id)} size="sm" />
          </button>
        ))}
      </div>
      {wishing && <BirthdayDialog person={wishing} onClose={() => setWishing(null)} />}
    </aside>
  );
}

/** "Write on her timeline": a birthday wish that lands on the friend's wall. */
function BirthdayDialog({ person, onClose }: { person: User; onClose: () => void }) {
  const [message, setMessage] = useState(`Happy birthday, ${person.firstName}! \u{1F382}`);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setIsSending(true);
    setError(null);
    try {
      await postApi.create({ content: message.trim(), wallOwnerId: person.id, privacy: 'FRIENDS' });
      setSent(true);
    } catch (err) {
      setError(toErrorMessage(err, 'Your post could not be shared'));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Modal
      title={`Write on ${person.firstName}'s timeline`}
      onClose={onClose}
      footer={
        sent ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => void send()} disabled={!message.trim() || isSending}>
              {isSending ? 'Posting…' : 'Post'}
            </Button>
          </>
        )
      }
    >
      {sent ? (
        <p>Your wish is on {person.firstName}&rsquo;s timeline.</p>
      ) : (
        <>
          <TextArea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            aria-label="Birthday message"
            bordered
            rows={3}
            minHeight={70}
          />
          {error && <ErrorNotice message={error} />}
        </>
      )}
    </Modal>
  );
}
