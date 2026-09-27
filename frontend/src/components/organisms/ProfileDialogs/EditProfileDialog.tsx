import { useState } from 'react';
import { Avatar, Button, Input, Select, TextArea } from '@atoms/index';
import { ErrorNotice, MediaUpload, Modal } from '@molecules/index';
import { toErrorMessage } from '@/api/client';
import { userApi } from '@/api/endpoints';
import type { User } from '@/types';
import styles from './ProfileDialogs.module.css';

export interface EditProfileDialogProps {
  user: User;
  onClose: () => void;
  onSaved: (updated: User) => void;
}

const RELATIONSHIP_OPTIONS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'Single', label: 'Single' },
  { value: 'In a relationship', label: 'In a relationship' },
  { value: 'Engaged', label: 'Engaged' },
  { value: 'Married', label: 'Married' },
  { value: "It's complicated", label: "It's complicated" },
];

/** "Edit Profile" - everything the API lets you change about yourself. */
export function EditProfileDialog({ user, onClose, onSaved }: EditProfileDialogProps) {
  const [form, setForm] = useState({
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    bio: user.bio ?? '',
    work: user.work ?? '',
    education: user.education ?? '',
    hometown: user.hometown ?? '',
    currentCity: user.currentCity ?? '',
    relationshipStatus: user.relationshipStatus ?? '',
    phone: user.phone ?? '',
    website: user.website ?? '',
    birthDate: user.birthDate ?? '',
    avatarUrl: user.avatarUrl ?? '',
    coverUrl: user.coverUrl ?? '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit() {
    setIsSaving(true);
    setError(null);
    try {
      onSaved(await userApi.updateMe(form));
      onClose();
    } catch (err) {
      setError(toErrorMessage(err, 'Your profile could not be saved'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      title="Edit profile"
      onClose={onClose}
      width="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save Changes'}
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        {/* Upload a photo or paste a link; the preview shows the result either way. */}
        <div className={styles.photos}>
          <div className={styles.coverPreview}>
            {form.coverUrl ? (
              <img className={styles.coverImage} src={form.coverUrl} alt="Cover preview" />
            ) : (
              <span className={styles.coverBlank}>No cover photo</span>
            )}
            <Avatar
              src={form.avatarUrl}
              name={`${form.firstName} ${form.lastName}`}
              size="lg"
              className={styles.avatarPreview}
            />
          </div>

          <div className={styles.row}>
            <MediaUpload label="Upload profile photo" onUploaded={(url) => set('avatarUrl', url)} />
            <MediaUpload label="Upload cover photo" onUploaded={(url) => set('coverUrl', url)} />
          </div>

          <div className={styles.row}>
            <Input
              compact
              label="Profile photo URL"
              placeholder="https://example.com/me.jpg"
              value={form.avatarUrl}
              onChange={(event) => set('avatarUrl', event.target.value)}
            />
            <Input
              compact
              label="Cover photo URL"
              placeholder="https://example.com/cover.jpg"
              value={form.coverUrl}
              onChange={(event) => set('coverUrl', event.target.value)}
            />
          </div>
        </div>

        <div className={styles.row}>
          <Input
            compact
            label="First name"
            value={form.firstName}
            onChange={(event) => set('firstName', event.target.value)}
          />
          <Input
            compact
            label="Last name"
            value={form.lastName}
            onChange={(event) => set('lastName', event.target.value)}
          />
        </div>

        <TextArea
          value={form.bio}
          onChange={(event) => set('bio', event.target.value)}
          placeholder="Write something about yourself"
          aria-label="Bio"
          rows={2}
          minHeight={56}
        />

        <div className={styles.row}>
          <Input
            compact
            label="Work"
            placeholder="Frontend Engineer at Swiggy"
            value={form.work}
            onChange={(event) => set('work', event.target.value)}
          />
          <Input
            compact
            label="Education"
            placeholder="IIT Bombay"
            value={form.education}
            onChange={(event) => set('education', event.target.value)}
          />
        </div>

        <div className={styles.row}>
          <Input
            compact
            label="Hometown"
            placeholder="Mumbai, India"
            value={form.hometown}
            onChange={(event) => set('hometown', event.target.value)}
          />
          <Input
            compact
            label="Current city"
            placeholder="Bengaluru, India"
            value={form.currentCity}
            onChange={(event) => set('currentCity', event.target.value)}
          />
        </div>

        <div className={styles.row}>
          <Select
            compact
            label="Relationship"
            options={RELATIONSHIP_OPTIONS}
            value={form.relationshipStatus}
            onChange={(event) => set('relationshipStatus', event.target.value)}
          />
          <Input
            compact
            type="date"
            label="Birthday"
            value={form.birthDate}
            onChange={(event) => set('birthDate', event.target.value)}
          />
        </div>

        <div className={styles.row}>
          <Input
            compact
            label="Phone"
            placeholder="+91 98765 43210"
            value={form.phone}
            onChange={(event) => set('phone', event.target.value)}
          />
          <Input
            compact
            label="Website"
            placeholder="https://example.dev"
            value={form.website}
            onChange={(event) => set('website', event.target.value)}
          />
        </div>

        {error && <ErrorNotice message={error} />}
      </div>
    </Modal>
  );
}
