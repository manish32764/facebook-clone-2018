import { forwardRef, useState, type KeyboardEvent } from 'react';
import { Avatar } from '@atoms/index';
import { classNames } from '@/utils/format';
import type { User } from '@/types';
import styles from './CommentComposer.module.css';

export interface CommentComposerProps {
  author: User;
  onSubmit: (content: string) => Promise<void> | void;
  placeholder?: string;
  /** Replies open with the caret already in the field. */
  autoFocus?: boolean;
  /** Shown above the field when replying, with a way to back out. */
  replyingTo?: string;
  onCancelReply?: () => void;
  size?: 'sm' | 'md';
}

/** Enter posts, Shift+Enter adds a newline — the behaviour Facebook shipped in 2018. */
export const CommentComposer = forwardRef<HTMLTextAreaElement, CommentComposerProps>(
  function CommentComposer(
    { author, onSubmit, placeholder, autoFocus = false, replyingTo, onCancelReply, size = 'md' },
    ref,
  ) {
    const [value, setValue] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    async function submit() {
      const trimmed = value.trim();
      if (!trimmed || isSending) return;

      setIsSending(true);
      try {
        await onSubmit(trimmed);
        setValue('');
      } finally {
        setIsSending(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void submit();
      }
    }

    return (
      <div>
        {replyingTo && (
          <div className={styles.replyBanner}>
            Replying to <strong>{replyingTo}</strong>
            {onCancelReply && (
              <button type="button" className={styles.cancelReply} onClick={onCancelReply}>
                Cancel
              </button>
            )}
          </div>
        )}

        <div className={styles.composer}>
          <Avatar src={author.avatarUrl} name={author.fullName} size={size === 'sm' ? 'xs' : 'sm'} />
          <div className={classNames(styles.field, isFocused && styles.fieldFocused)}>
            <textarea
              ref={ref}
              rows={1}
              autoFocus={autoFocus}
              className={styles.input}
              value={value}
              disabled={isSending}
              placeholder={placeholder ?? 'Write a comment…'}
              aria-label="Write a comment"
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
          </div>
        </div>
        {isFocused && value.trim().length > 0 && (
          <p className={styles.hint}>Press Enter to post, Shift + Enter for a new line</p>
        )}
      </div>
    );
  },
);
