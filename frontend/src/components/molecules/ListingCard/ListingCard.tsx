import { Link } from 'react-router-dom';
import { Icon } from '@atoms/index';
import { classNames, formatPrice } from '@/utils/format';
import { timeAgo } from '@/utils/time';
import type { Listing } from '@/types';
import styles from './ListingCard.module.css';

export interface ListingCardProps {
  listing: Listing;
  /** Shows the save heart over the photo. */
  onToggleSave?: (listingId: number) => void;
}

export function ListingCard({ listing, onToggleSave }: ListingCardProps) {
  const isSold = listing.status === 'SOLD';

  return (
    <Link to={`/marketplace/${listing.id}`} className={styles.card}>
      <span className={styles.imageWrap}>
        {listing.imageUrl ? (
          <img className={styles.image} src={listing.imageUrl} alt="" loading="lazy" />
        ) : (
          <span className={styles.fallback}>
            <Icon name="store" size={28} />
          </span>
        )}
        {isSold && <span className={styles.sold}>Sold</span>}
        {onToggleSave && !listing.mine && (
          <button
            type="button"
            className={classNames(styles.save, listing.savedByMe && styles.saved)}
            aria-label={listing.savedByMe ? 'Remove from saved' : 'Save'}
            aria-pressed={listing.savedByMe}
            onClick={(event) => {
              // The card is a link; saving must not navigate.
              event.preventDefault();
              event.stopPropagation();
              onToggleSave(listing.id);
            }}
          >
            <Icon name={listing.savedByMe ? 'heart' : 'bookmark'} size={14} />
          </button>
        )}
      </span>

      <span className={styles.body}>
        <span className={classNames(styles.price, isSold && styles.priceSold)}>
          {formatPrice(listing.price, listing.currency)}
        </span>
        <span className={styles.title}>{listing.title}</span>
        <span className={styles.meta}>
          {listing.location ?? 'Nearby'}
          <span className={styles.dot}>&middot;</span>
          {timeAgo(listing.createdAt)}
        </span>
      </span>
    </Link>
  );
}
