import { useState } from 'react';
import { Button, Input, Select, TextArea } from '@atoms/index';
import { ErrorNotice, MediaUpload, Modal } from '@molecules/index';
import { toErrorMessage } from '@/api/client';
import { groupApi } from '@/api/endpoints';
import type { Group } from '@/types';
import styles from './CreateDialogs.module.css';

export interface GroupSettingsDialogProps {
  group: Group;
  onClose: () => void;
  onSaved: (group: Group) => void;
  onDeleted: () => void;
}

/** Admin settings: name, cover, privacy, post approval, rules - and deleting the group. */
export function GroupSettingsDialog({ group, onClose, onSaved, onDeleted }: GroupSettingsDialogProps) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? '');
  const [coverUrl, setCoverUrl] = useState(group.coverUrl ?? '');
  const [privacy, setPrivacy] = useState<string>(group.privacy);
  const [postApproval, setPostApproval] = useState(group.postApproval);
  const [rules, setRules] = useState(group.rules ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setIsSaving(true);
    setError(null);
    try {
      onSaved(
        await groupApi.update(group.id, {
          name: name.trim(),
          description: description.trim(),
          coverUrl: coverUrl.trim(),
          privacy,
          postApproval,
          rules: rules.trim(),
        }),
      );
    } catch (err) {
      setError(toErrorMessage(err, 'The settings could not be saved'));
    } finally {
      setIsSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete ${group.name} and every post in it? This cannot be undone.`)) return;
    setIsSaving(true);
    try {
      await groupApi.remove(group.id);
      onDeleted();
    } catch (err) {
      setError(toErrorMessage(err, 'The group could not be deleted'));
      setIsSaving(false);
    }
  }

  return (
    <Modal
      title="Group settings"
      onClose={onClose}
      footer={
        <>
          <Button variant="danger" onClick={() => void remove()} disabled={isSaving}>
            Delete Group
          </Button>
          <span className={styles.spacer} />
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={!name.trim() || isSaving}>
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <Input compact label="Group name" value={name} onChange={(e) => setName(e.target.value)} />
        <TextArea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this group about?"
          aria-label="Description"
          bordered
          rows={3}
          minHeight={70}
        />
        <div className={styles.row}>
          <MediaUpload label="Upload cover photo" onUploaded={(url) => setCoverUrl(url)} />
          <Input compact placeholder="…or paste a cover link" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} />
        </div>
        {coverUrl && <img className={styles.preview} src={coverUrl} alt="Cover preview" />}
        <Select
          compact
          label="Privacy"
          value={privacy}
          onChange={(e) => setPrivacy(e.target.value)}
          options={[
            { value: 'PUBLIC', label: 'Public - anyone can see posts and join' },
            { value: 'PRIVATE', label: 'Private - members only; joining needs approval' },
          ]}
        />
        <label className={styles.checkRow}>
          <input type="checkbox" checked={postApproval} onChange={(e) => setPostApproval(e.target.checked)} />
          Admins and moderators approve every post before it appears
        </label>
        <TextArea
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          placeholder={'Group rules, one per line\n1. Be kind and courteous'}
          aria-label="Group rules"
          bordered
          rows={4}
          minHeight={90}
        />
        {error && <ErrorNotice message={error} />}
      </div>
    </Modal>
  );
}
