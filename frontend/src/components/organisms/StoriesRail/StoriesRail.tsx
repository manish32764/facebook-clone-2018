import { useState } from 'react';
import { Icon } from '@atoms/index';
import { StoryTile } from '@molecules/index';
import { StoryComposer, StoryViewer } from '../StoryViewer';
import type { StoryReel } from '@/types';
import styles from './StoriesRail.module.css';

export interface StoriesRailProps {
  reels: StoryReel[];
  /** Reloads the rail after a story is added or watched. */
  onChanged: () => void;
}

/** The stories strip above the feed: your own reel first, then friends'. */
export function StoriesRail({ reels, onChanged }: StoriesRailProps) {
  const [openReel, setOpenReel] = useState<number | null>(null);
  const [isComposing, setIsComposing] = useState(false);

  return (
    <>
      <div className={styles.rail} aria-label="Stories">
        <button type="button" className={styles.create} onClick={() => setIsComposing(true)}>
          <span className={styles.plusRing}>
            <Icon name="plus" size={16} />
          </span>
          Add to Story
        </button>

        {reels.map((reel, index) => (
          <StoryTile key={reel.author.id} reel={reel} onClick={() => setOpenReel(index)} />
        ))}

        {reels.length === 0 && (
          <p className={styles.blank}>
            Nobody has posted a story in the last 24 hours. Add the first one.
          </p>
        )}
      </div>

      {openReel !== null && (
        <StoryViewer
          reels={reels}
          startReel={openReel}
          onClose={() => {
            setOpenReel(null);
            onChanged();
          }}
          onSeen={onChanged}
        />
      )}

      {isComposing && (
        <StoryComposer
          onClose={() => setIsComposing(false)}
          onCreated={() => {
            setIsComposing(false);
            onChanged();
          }}
        />
      )}
    </>
  );
}
