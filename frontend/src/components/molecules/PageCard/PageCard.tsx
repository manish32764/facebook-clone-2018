import { Link } from 'react-router-dom';
import { Button, Icon } from '@atoms/index';
import { pluralize } from '@/utils/format';
import type { Page } from '@/types';
import styles from '@/styles/Feature.module.css';

export interface PageCardProps {
  page: Page;
  onToggleLike?: (pageId: number) => void;
  isBusy?: boolean;
}

/** A Page tile: cover, name, category, likes, and a Like button. */
export function PageCard({ page, onToggleLike, isBusy = false }: PageCardProps) {
  return (
    <div className={styles.tile}>
      <Link to={`/pages/${page.id}`}>
        {page.coverUrl ? (
          <img className={styles.tileImage} src={page.coverUrl} alt="" loading="lazy" />
        ) : (
          <span className={styles.tileFallback}>
            <Icon name="flag" size={28} />
          </span>
        )}
      </Link>
      <div className={styles.tileBody}>
        <div className={styles.row}>
          {page.avatarUrl && (
            <img className={styles.tileLogo} src={page.avatarUrl} alt="" />
          )}
          <span className={styles.listText}>
            <Link to={`/pages/${page.id}`} className={styles.tileTitle}>
              {page.name}
            </Link>
            <span className={styles.muted}>{page.category}</span>
          </span>
        </div>
        <span className={styles.muted}>
          {pluralize(page.likeCount, 'like')} &middot; {pluralize(page.followerCount, 'follower')}
          {page.recommendPercent != null && ` · ${page.recommendPercent}% recommend`}
        </span>
      </div>
      {onToggleLike && !page.mine && (
        <div className={styles.tileActions}>
          <Button
            size="sm"
            variant={page.liked ? 'secondary' : 'primary'}
            fullWidth
            disabled={isBusy}
            onClick={() => onToggleLike(page.id)}
          >
            <Icon name="like" size={12} /> {page.liked ? 'Liked' : 'Like'}
          </Button>
        </div>
      )}
    </div>
  );
}
