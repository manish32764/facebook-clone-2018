import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@atoms/index';
import { Modal } from '@molecules/index';
import styles from './PhotoLightbox.module.css';

export interface PhotoLightboxProps {
  images: string[];
  startIndex?: number;
  onClose: () => void;
  caption?: string;
}

/** Full-screen photo viewer with arrow-key navigation, as the theatre view had. */
export function PhotoLightbox({ images, startIndex = 0, onClose, caption }: PhotoLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const count = images.length;

  const step = useCallback(
    (delta: number) => setIndex((current) => (current + delta + count) % count),
    [count],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [step]);

  if (count === 0) return null;

  return (
    <Modal onClose={onClose} bare>
      <div className={styles.stage}>
        {count > 1 && (
          <button
            type="button"
            className={`${styles.nav} ${styles.prev}`}
            aria-label="Previous photo"
            onClick={() => step(-1)}
          >
            <Icon name="arrowLeft" size={20} />
          </button>
        )}

        <img className={styles.image} src={images[index]} alt={caption ?? ''} />

        {count > 1 && (
          <button
            type="button"
            className={`${styles.nav} ${styles.next}`}
            aria-label="Next photo"
            onClick={() => step(1)}
          >
            <Icon name="chevronRight" size={24} />
          </button>
        )}
      </div>

      {(caption || count > 1) && (
        <div className={styles.caption}>
          {caption}
          {count > 1 && (
            <span className={styles.counter}>
              {index + 1} of {count}
            </span>
          )}
        </div>
      )}
    </Modal>
  );
}
