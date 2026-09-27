import { useRef, useState } from 'react';
import { Icon } from '@atoms/index';
import { REACTIONS, reactionMeta } from '@/utils/reactions';
import { classNames } from '@/utils/format';
import type { ReactionName } from '@/types';
import styles from './ReactionPicker.module.css';

export interface ReactionPickerProps {
  myReaction?: ReactionName | null;
  onReact: (reaction: ReactionName) => void;
  /** `comment` is the small text link under a comment bubble. */
  variant?: 'post' | 'comment';
}

/** Hovering must be deliberate, or the tray flashes open on every pass. */
const OPEN_DELAY_MS = 320;
const CLOSE_DELAY_MS = 260;

/**
 * The Like button with the six-reaction tray above it.
 *
 * A plain click sends whichever reaction you already have (which clears it) or
 * LIKE if you have none - exactly the behaviour of the real button. Holding the
 * pointer over it, or pressing Enter on the arrow, opens the tray.
 */
export function ReactionPicker({ myReaction, onReact, variant = 'post' }: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const openTimer = useRef(0);
  const closeTimer = useRef(0);

  const active = reactionMeta(myReaction);
  const hasReaction = Boolean(myReaction);

  function scheduleOpen() {
    window.clearTimeout(closeTimer.current);
    openTimer.current = window.setTimeout(() => setIsOpen(true), OPEN_DELAY_MS);
  }

  function scheduleClose() {
    window.clearTimeout(openTimer.current);
    closeTimer.current = window.setTimeout(() => setIsOpen(false), CLOSE_DELAY_MS);
  }

  function choose(reaction: ReactionName) {
    window.clearTimeout(openTimer.current);
    window.clearTimeout(closeTimer.current);
    setIsOpen(false);
    onReact(reaction);
  }

  return (
    <div
      className={classNames(styles.wrapper, variant === 'comment' && styles.commentWrapper)}
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
    >
      {isOpen && (
        <div className={styles.tray} role="menu" aria-label="Pick a reaction">
          {REACTIONS.map((reaction) => (
            <button
              key={reaction.name}
              type="button"
              role="menuitem"
              className={classNames(styles.trayItem, myReaction === reaction.name && styles.trayItemActive)}
              title={reaction.label}
              aria-label={reaction.label}
              onClick={() => choose(reaction.name)}
            >
              <span className={styles.trayEmoji}>{reaction.emoji}</span>
              <span className={styles.trayLabel}>{reaction.label}</span>
            </button>
          ))}
        </div>
      )}

      {variant === 'comment' ? (
        <button
          type="button"
          className={styles.commentButton}
          style={hasReaction ? { color: active.color } : undefined}
          onClick={() => choose(myReaction ?? 'LIKE')}
          aria-expanded={isOpen}
        >
          {hasReaction ? active.label : 'Like'}
        </button>
      ) : (
      <button
        type="button"
        className={classNames(styles.button, hasReaction && styles.reacted)}
        style={hasReaction ? { color: active.color } : undefined}
        onClick={() => choose(myReaction ?? 'LIKE')}
        aria-expanded={isOpen}
      >
        {hasReaction ? (
          <span className={styles.chosenEmoji} aria-hidden>
            {active.emoji}
          </span>
        ) : (
          <Icon name="like" size={14} />
        )}
        {hasReaction ? active.label : 'Like'}
      </button>
      )}
    </div>
  );
}
