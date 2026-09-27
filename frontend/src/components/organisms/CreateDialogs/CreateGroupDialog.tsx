import { useState } from 'react';
import { Button, Input, Select, TextArea } from '@atoms/index';
import { ErrorNotice, Modal } from '@molecules/index';
import { toErrorMessage } from '@/api/client';
import { groupApi } from '@/api/endpoints';
import type { Group } from '@/types';
import styles from './CreateDialogs.module.css';

export interface CreateGroupDialogProps {
  onClose: () => void;
  onCreated: (group: Group) => void;
}

export function CreateGroupDialog({ onClose, onCreated }: CreateGroupDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [privacy, setPrivacy] = useState('PUBLIC');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      onCreated(
        await groupApi.create({
          name: name.trim(),
          description: description.trim() || undefined,
          coverUrl: coverUrl.trim() || undefined,
          privacy,
        }),
      );
    } catch (err) {
      setError(toErrorMessage(err, 'That group could not be created'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      title="Create a group"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={!name.trim() || isSaving}>
            {isSaving ? 'Creating…' : 'Create Group'}
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <Input
          compact
          label="Group name"
          placeholder="Frontend Engineers"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <TextArea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What is this group for?"
          aria-label="Group description"
          rows={3}
          minHeight={70}
        />

        <div className={styles.row}>
          <Select
            compact
            label="Privacy"
            options={[
              { value: 'PUBLIC', label: 'Public - anyone can see and join' },
              { value: 'PRIVATE', label: 'Private - members only' },
            ]}
            value={privacy}
            onChange={(event) => setPrivacy(event.target.value)}
          />
          <Input
            compact
            label="Cover photo URL"
            placeholder="https://example.com/cover.jpg"
            value={coverUrl}
            onChange={(event) => setCoverUrl(event.target.value)}
          />
        </div>

        <p className={styles.note}>You become the first admin of the group you create.</p>

        {error && <ErrorNotice message={error} />}
      </div>
    </Modal>
  );
}
