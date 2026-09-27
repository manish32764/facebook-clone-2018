import { classNames } from '@/utils/format';
import { parseOverlays } from '@/utils/labels';
import type { Story } from '@/types';
import styles from './StoryFace.module.css';

export interface StoryFaceProps {
  story: Pick<Story, 'imageUrl' | 'text' | 'backgroundColor' | 'overlays'>;
  /** Thumbnail mode: smaller type, no caption. */
  small?: boolean;
}

/**
 * One story card as it is drawn: the photo or colour, then every text and
 * sticker layer at its saved position. Used by the player, the composer
 * preview and the highlight thumbnails, so all three always match.
 */
export function StoryFace({ story, small = false }: StoryFaceProps) {
  const overlays = parseOverlays(story.overlays);
  const scale = small ? 0.35 : 1;

  return (
    <div
      className={classNames(styles.face, small && styles.small)}
      style={{ background: story.imageUrl ? '#000' : story.backgroundColor ?? '#4267b2' }}
    >
      {story.imageUrl ? (
        <img className={styles.image} src={story.imageUrl} alt="" loading="lazy" />
      ) : (
        story.text && overlays.length === 0 && <p className={styles.textCard}>{story.text}</p>
      )}

      {overlays.map((layer, index) => (
        <span
          key={index}
          className={classNames(styles.layer, layer.kind === 'sticker' ? styles.sticker : styles.text)}
          style={{
            left: `${layer.x * 100}%`,
            top: `${layer.y * 100}%`,
            color: layer.color ?? '#fff',
            fontSize: `${(layer.size ?? (layer.kind === 'sticker' ? 56 : 28)) * scale}px`,
          }}
        >
          {layer.value}
        </span>
      ))}

      {/* A photo story can carry a caption underneath, as it can in the app. */}
      {!small && story.imageUrl && story.text && <p className={styles.caption}>{story.text}</p>}
      {!story.imageUrl && story.text && overlays.length > 0 && !small && (
        <p className={styles.caption}>{story.text}</p>
      )}
    </div>
  );
}
