import { useState } from 'react';
import { Button, Input, TextArea } from '@atoms/index';
import { ErrorNotice, Modal } from '@molecules/index';
import { AudiencePicker } from '../SocialDialogs';
import type { PostEdit } from '@/hooks/usePostCollection';
import { toErrorMessage } from '@/api/client';
import type { Post, Privacy } from '@/types';
import styles from './PostDialogs.module.css';

export interface EditPostDialogProps {
  post: Post;
  onClose: () => void;
  onSave: (updates: PostEdit) => Promise<unknown>;
}

export function EditPostDialog({ post, onClose, onSave }: EditPostDialogProps) {
  const [content, setContent] = useState(post.content ?? '');
  const [feeling, setFeeling] = useState(post.feeling ?? '');
  const [location, setLocation] = useState(post.location ?? '');
  const [privacy, setPrivacy] = useState<Privacy>(post.privacy);
  const [audienceIds, setAudienceIds] = useState<number[]>((post.audience ?? []).map((u) => u.id));
  // Group and Page posts take their audience from where they live.
  const fixedAudience = Boolean(post.group || post.page);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        content: content.trim(),
        feeling: feeling.trim(),
        location: location.trim(),
        ...(fixedAudience ? {} : { privacy, audienceUserIds: audienceIds }),
      });
      onClose();
    } catch (err) {
      setError(toErrorMessage(err, 'Those changes could not be saved'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      title="Edit post"
      onClose={onClose}
      footer={
        <>
          {!fixedAudience && (
            <AudiencePicker
              privacy={privacy}
              audienceIds={audienceIds}
              onChange={(next, ids) => {
                setPrivacy(next);
                setAudienceIds(ids);
              }}
            />
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <TextArea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="What's on your mind?"
          aria-label="Post text"
          rows={4}
          minHeight={90}
        />

        <div className={styles.formRow}>
          <Input
            compact
            label="Feeling / activity"
            placeholder="feeling nostalgic"
            value={feeling}
            onChange={(event) => setFeeling(event.target.value)}
          />
          <Input
            compact
            label="Location"
            placeholder="Mumbai, India"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        </div>

        {/* Photos and videos stay as they were: the API edits text, not media. */}
        {(post.imageUrl || post.videoUrl) && (
          <p className={styles.note}>The attached media cannot be changed after posting.</p>
        )}

        {error && <ErrorNotice message={error} />}
      </div>
    </Modal>
  );
}
