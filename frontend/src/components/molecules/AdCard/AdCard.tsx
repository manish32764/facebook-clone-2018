import { Avatar, Icon } from '@atoms/index';
import { adApi } from '@/api/endpoints';
import { classNames, humanizeEnum } from '@/utils/format';
import type { Ad } from '@/types';
import styles from './AdCard.module.css';

export interface AdCardProps {
  ad: Ad;
  /** `feed` is a full sponsored post; `rail` is the compact right-rail slot. */
  variant?: 'feed' | 'rail';
}

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/** A sponsored slot. Clicking counts the click, then opens the advertiser's link. */
export function AdCard({ ad, variant = 'feed' }: AdCardProps) {
  const sponsor = ad.page?.name ?? ad.advertiser.fullName;
  const sponsorImage = ad.page?.avatarUrl ?? ad.advertiser.avatarUrl;

  function open() {
    void adApi.click(ad.id).catch(() => undefined);
    window.open(ad.linkUrl, '_blank', 'noopener,noreferrer');
  }

  if (variant === 'rail') {
    return (
      <button type="button" className={styles.rail} onClick={open}>
        {ad.imageUrl && <img className={styles.railImage} src={ad.imageUrl} alt="" loading="lazy" />}
        <span className={styles.railBody}>
          <span className={styles.railTitle}>{ad.title}</span>
          <span className={styles.railUrl}>{hostOf(ad.linkUrl)}</span>
        </span>
      </button>
    );
  }

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <Avatar src={sponsorImage} name={sponsor} size="md" />
        <span className={styles.who}>
          <span className={styles.sponsor}>{sponsor}</span>
          <span className={styles.meta}>
            Sponsored &middot; <Icon name="globe" size={11} />
          </span>
        </span>
      </div>
      {ad.body && <p className={styles.body}>{ad.body}</p>}
      {ad.imageUrl && (
        <button type="button" className={styles.imageButton} onClick={open} aria-label={ad.title}>
          <img className={styles.image} src={ad.imageUrl} alt="" loading="lazy" />
        </button>
      )}
      <div className={styles.footer}>
        <span className={styles.footerText}>
          <span className={styles.url}>{hostOf(ad.linkUrl).toUpperCase()}</span>
          <span className={styles.title}>{ad.title}</span>
        </span>
        <button type="button" className={classNames(styles.cta)} onClick={open}>
          {humanizeEnum(ad.callToAction).replace(' - ', ' ')}
        </button>
      </div>
    </article>
  );
}
