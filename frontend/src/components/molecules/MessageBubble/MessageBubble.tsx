import { useState } from 'react';
import { Avatar, Icon } from '@atoms/index';
import { classNames } from '@/utils/format';
import { clockTime, fullTimestamp } from '@/utils/time';
import type { Message, User } from '@/types';
import styles from './MessageBubble.module.css';

export interface MessageBubbleProps {
  message: Message;
  viewer: User;
  /** False when the previous bubble came from the same person, so avatars group. */
  showAvatar?: boolean;
  showSender?: boolean;
  onReact: (messageId: number, emoji: string) => void;
  onUnsend: (messageId: number) => void;
  onOpenImage?: (url: string) => void;
}

/** The emoji Messenger offers on a long press. */
const QUICK_EMOJI = ['\u2764\uFE0F', '\u{1F606}', '\u{1F62E}', '\u{1F622}', '\u{1F621}', '\u{1F44D}'];

export function MessageBubble({
  message,
  viewer,
  showAvatar = true,
  showSender = false,
  onReact,
  onUnsend,
  onOpenImage,
}: MessageBubbleProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const mine = message.sender.id === viewer.id;

  // System lines ("X left the conversation") sit centred, with no bubble.
  if (message.type === 'SYSTEM') {
    return <div className={styles.system}>{message.content}</div>;
  }

  const reactionEntries = Object.entries(message.reactions ?? {});

  return (
    <div className={classNames(styles.row, mine ? styles.mine : styles.theirs)}>
      {!mine && (
        <span className={styles.avatarSlot}>
          {showAvatar && (
            <Avatar src={message.sender.avatarUrl} name={message.sender.fullName} size="xs" circle />
          )}
        </span>
      )}

      <div className={styles.stack}>
        {showSender && !mine && <span className={styles.sender}>{message.sender.firstName}</span>}

        <div className={styles.bubbleRow}>
          <div
            className={classNames(
              styles.bubble,
              mine ? styles.bubbleMine : styles.bubbleTheirs,
              message.deleted && styles.removed,
              message.type === 'STICKER' && styles.sticker,
            )}
            title={fullTimestamp(message.createdAt)}
          >
            {message.deleted ? (
              <em>Message removed</em>
            ) : (
              <>
                {message.type === 'STICKER' ? (
                  <span className={styles.stickerGlyph}>{'\u{1F44D}'}</span>
                ) : null}

                {message.attachmentUrl && (
                  <img
                    className={styles.attachment}
                    src={message.attachmentUrl}
                    alt=""
                    loading="lazy"
                    onClick={() => onOpenImage?.(message.attachmentUrl as string)}
                  />
                )}

                {message.content && <span className={styles.text}>{message.content}</span>}
              </>
            )}

            {reactionEntries.length > 0 && (
              <span className={styles.reactions}>
                {reactionEntries.map(([emoji, names]) => (
                  <span key={emoji} className={styles.reaction} title={names.join(', ')}>
                    {emoji}
                    {names.length > 1 && <span className={styles.reactionCount}>{names.length}</span>}
                  </span>
                ))}
              </span>
            )}
          </div>

          {!message.deleted && (
            <div className={styles.tools}>
              <button
                type="button"
                className={styles.tool}
                aria-label="React to message"
                onClick={() => setIsPickerOpen((open) => !open)}
              >
                <Icon name="smiley" size={13} />
              </button>

              {mine && (
                <button
                  type="button"
                  className={styles.tool}
                  aria-label="Remove message"
                  onClick={() => onUnsend(message.id)}
                >
                  <Icon name="trash" size={13} />
                </button>
              )}

              {isPickerOpen && (
                <div className={styles.picker} role="menu">
                  {QUICK_EMOJI.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={classNames(
                        styles.pickerItem,
                        message.myReaction === emoji && styles.pickerItemActive,
                      )}
                      onClick={() => {
                        setIsPickerOpen(false);
                        onReact(message.id, emoji);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <span className={styles.clock}>{clockTime(message.createdAt)}</span>
      </div>
    </div>
  );
}
