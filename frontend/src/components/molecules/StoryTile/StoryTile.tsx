import { Avatar } from '@atoms/index';
import { classNames } from '@/utils/format';
import type { StoryReel } from '@/types';
import styles from './StoryTile.module.css';

export interface StoryTileProps {
  reel: StoryReel;
  onClick: () => void;
}

/**
 * One author's reel on the stories rail. The avatar ring is blue until every
 * card has been watched, then it goes grey - the same signal the app uses.
 */
export function StoryTile({ reel, onClick }: StoryTileProps) {
  const { author, stories, allSeen } = reel;
  const cover = stories.find((story) => story.imageUrl)?.imageUrl;
  const first = stories[0];

  return (
    <div
      className={styles.tile}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => event.key === 'Enter' && onClick()}
      title={`${author.fullName} - ${stories.length} ${stories.length === 1 ? 'story' : 'stories'}`}
    >
      {cover ? (
        <img className={styles.image} src={cover} alt="" loading="lazy" />
      ) : (
        /* A text-only reel shows its first card's colour and words instead. */
        <span
          className={styles.textCover}
          style={{ background: first?.backgroundColor ?? 'var(--fb-blue)' }}
        >
          {first?.text}
        </span>
      )}

      <Avatar
        src={author.avatarUrl}
        name={author.fullName}
        size="xs"
        circle
        className={classNames(styles.ring, allSeen ? styles.ringSeen : styles.ringUnseen)}
      />

      <span className={styles.name}>{author.firstName}</span>

      {stories.length > 1 && <span className={styles.count}>{stories.length}</span>}
    </div>
  );
}
