import { useState } from 'react';
import { Avatar, Button, TextArea } from '@atoms/index';
import { ComposerToolbar, ErrorNotice, Modal } from '@molecules/index';
import { toErrorMessage } from '@/api/client';
import { timeAgo } from '@/utils/time';
import type { Post, Privacy, User } from '@/types';
import styles from './PostDialogs.module.css';

export interface ShareDialogProps {
  post: Post;
  viewer: User;
  onClose: () => void;
  onShare: (content: string, privacy: Privacy) => Promise<unknown>;
}

/** "Share this post" - a note on top, and a preview of what is being shared. */
export function ShareDialog({ post, viewer, onClose, onShare }: ShareDialogProps) {
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState<Privacy>('PUBLIC');
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sharing a share credits the original author, the way the real dialog does.
  const original = post.sharedPost ?? post;

  async function submit() {
    setIsSharing(true);
    setError(null);
    try {
      await onShare(content.trim(), privacy);
      onClose();
    } catch (err) {
      setError(toErrorMessage(err, 'That post could not be shared'));
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <Modal
      title="Share this post"
      onClose={onClose}
      footer={
        <>
          <ComposerToolbar.Privacy value={privacy} onChange={setPrivacy} />
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={isSharing}>
            {isSharing ? 'Sharing…' : 'Share Now'}
          </Button>
        </>
      }
    >
      <div className={styles.shareRow}>
        <Avatar src={viewer.avatarUrl} name={viewer.fullName} size="md" />
        <TextArea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Say something about this…"
          aria-label="Say something about this"
          rows={2}
          minHeight={54}
        />
      </div>

      <div className={styles.preview}>
        <div className={styles.previewHeader}>
          <Avatar src={original.author.avatarUrl} name={original.author.fullName} size="sm" />
          <span>
            <strong>{original.author.fullName}</strong>
            <span className={styles.previewTime}>{timeAgo(original.createdAt)}</span>
          </span>
        </div>
        {original.content && <p className={styles.previewBody}>{original.content}</p>}
        {original.imageUrl && (
          <img className={styles.previewImage} src={original.imageUrl} alt="" loading="lazy" />
        )}
      </div>

      {error && <ErrorNotice message={error} />}
    </Modal>
  );
}
