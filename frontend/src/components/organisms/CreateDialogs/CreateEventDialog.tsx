import { useState } from 'react';
import { Button, Input, TextArea } from '@atoms/index';
import { ErrorNotice, MediaUpload, Modal } from '@molecules/index';
import { toErrorMessage } from '@/api/client';
import { eventApi } from '@/api/endpoints';
import { pluralize } from '@/utils/format';
import { FriendPicker } from '../SocialDialogs';
import type { Event } from '@/types';
import styles from './CreateDialogs.module.css';

export interface CreateEventDialogProps {
  onClose: () => void;
  onCreated: (event: Event) => void;
  /** Edit this event instead of creating one. Hosts only. */
  event?: Event;
}

const pad = (value: number) => String(value).padStart(2, '0');

/** datetime-local wants a local ISO string with no zone and no seconds. */
function toLocalInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Defaults to this time next week, which is the most likely thing anyone wants. */
function defaultStart(): string {
  const date = new Date(Date.now() + 7 * 86_400_000);
  date.setMinutes(0, 0, 0);
  return toLocalInput(date);
}

export function CreateEventDialog({ onClose, onCreated, event }: CreateEventDialogProps) {
  const [name, setName] = useState(event?.name ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [coverUrl, setCoverUrl] = useState(event?.coverUrl ?? '');
  const [location, setLocation] = useState(event?.location ?? '');
  const [startsAt, setStartsAt] = useState(event ? toLocalInput(new Date(event.startsAt)) : defaultStart());
  const [endsAt, setEndsAt] = useState(event?.endsAt ? toLocalInput(new Date(event.endsAt)) : '');
  const [online, setOnline] = useState(event?.online ?? false);
  const [inviteIds, setInviteIds] = useState<number[]>([]);
  const [isPicking, setIsPicking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || !startsAt || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const common = {
        name: name.trim(),
        description: description.trim(),
        coverUrl: coverUrl.trim(),
        location: online ? '' : location.trim(),
        // The input gives local time; the API stores an instant.
        startsAt: new Date(startsAt).toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
        online,
      };
      onCreated(
        event
          ? await eventApi.update(event.id, { ...common, clearEnd: !endsAt })
          : await eventApi.create({
              ...common,
              description: common.description || undefined,
              coverUrl: common.coverUrl || undefined,
              location: common.location || undefined,
              inviteUserIds: inviteIds,
            }),
      );
    } catch (err) {
      setError(toErrorMessage(err, event ? 'Your changes could not be saved' : 'That event could not be created'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      title={event ? 'Edit event' : 'Create an event'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={!name.trim() || isSaving}>
            {isSaving ? 'Saving…' : event ? 'Save Changes' : 'Create Event'}
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <Input
          compact
          label="Event name"
          placeholder="Mount Si Sunrise Hike"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <TextArea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What should people know before they come?"
          aria-label="Event description"
          rows={3}
          minHeight={70}
        />

        <div className={styles.row}>
          <Input
            compact
            type="datetime-local"
            label="Starts"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
          <Input
            compact
            type="datetime-local"
            label="Ends (optional)"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
        </div>

        <label className={styles.checkRow}>
          <input type="checkbox" checked={online} onChange={(e) => setOnline(e.target.checked)} />
          This is an online event
        </label>

        <Input
          compact
          label="Location"
          placeholder="Snoqualmie, WA"
          value={location}
          disabled={online}
          onChange={(e) => setLocation(e.target.value)}
        />

        <div className={styles.row}>
          <MediaUpload label="Upload cover photo" onUploaded={(url) => setCoverUrl(url)} />
          <Input compact placeholder="…or paste a cover link" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
        </div>
        {coverUrl && <img className={styles.preview} src={coverUrl} alt="Cover preview" />}

        {!event && (
          <div className={styles.inviteLine}>
            <Button size="sm" variant="secondary" onClick={() => setIsPicking(true)}>
              Invite Friends
            </Button>
            <span className={styles.note}>
              {inviteIds.length > 0 ? `${pluralize(inviteIds.length, 'friend')} will be invited.` : 'Nobody invited yet.'}
            </span>
          </div>
        )}
        {event && <p className={styles.note}>Everyone going or interested is told about the change.</p>}

        {error && <ErrorNotice message={error} />}
      </div>

      {isPicking && (
        <FriendPicker
          title="Invite friends"
          confirmLabel="Done"
          initialSelected={inviteIds}
          onClose={() => setIsPicking(false)}
          onConfirm={(ids) => setInviteIds(ids)}
        />
      )}
    </Modal>
  );
}
