import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '@templates/index';
import { Avatar, Button, Card, Icon, Select, Spinner } from '@atoms/index';
import { ErrorNotice } from '@molecules/index';
import { CreateListingDialog, PhotoLightbox, ReportDialog } from '@organisms/index';
import { useAsync } from '@/hooks/useAsync';
import { useChat } from '@/hooks/useChat';
import { marketplaceApi, socialApi } from '@/api/endpoints';
import { formatPrice, humanizeEnum } from '@/utils/format';
import { timeAgo } from '@/utils/time';
import styles from './ListingPage.module.css';

/** One Marketplace item, with a Message Seller button that opens a real chat. */
export function ListingPage() {
  const { listingId } = useParams<{ listingId: string }>();
  const id = Number(listingId);
  const navigate = useNavigate();
  const { openWith } = useChat();

  const listingQuery = useAsync(() => marketplaceApi.one(id), [id]);
  const [isBusy, setIsBusy] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [sentInterest, setSentInterest] = useState(false);
  const [dialog, setDialog] = useState<'edit' | 'report' | null>(null);
  const categoriesQuery = useAsync(() => marketplaceApi.categories(), []);

  const listing = listingQuery.data;

  const sellerListings = useAsync(
    () => (listing ? marketplaceApi.bySeller(listing.seller.id) : Promise.resolve([])),
    [listing?.seller.id],
  );

  async function messageSeller() {
    if (!listing) return;
    setIsBusy(true);
    try {
      // The ping tells the seller why the chat just opened.
      await marketplaceApi.registerInterest(listing.id).catch(() => undefined);
      setSentInterest(true);
      await openWith(listing.seller.id);
    } finally {
      setIsBusy(false);
    }
  }

  async function setStatus(status: string) {
    if (!listing) return;
    setIsBusy(true);
    try {
      await marketplaceApi.setStatus(listing.id, status);
      void listingQuery.reload();
    } finally {
      setIsBusy(false);
    }
  }

  async function toggleSave() {
    if (!listing) return;
    const result = await marketplaceApi.toggleSave(listing.id);
    listingQuery.setData((current) => (current ? { ...current, savedByMe: result.saved } : current));
  }

  async function remove() {
    if (!listing) return;
    if (!window.confirm('Remove this listing? This cannot be undone.')) return;
    setIsBusy(true);
    try {
      await marketplaceApi.remove(listing.id);
      navigate('/marketplace');
    } finally {
      setIsBusy(false);
    }
  }

  if (listingQuery.isLoading) {
    return (
      <AppShell layout="full" title="Marketplace">
        <Spinner label="Loading listing" />
      </AppShell>
    );
  }

  if (listingQuery.error || !listing) {
    return (
      <AppShell layout="full" title="Marketplace">
        <ErrorNotice
          message={listingQuery.error ?? 'That listing could not be found'}
          onRetry={listingQuery.reload}
        />
      </AppShell>
    );
  }

  const others = (sellerListings.data ?? []).filter((item) => item.id !== listing.id);

  return (
    <AppShell layout="full" title={listing.title}>
      <Link to="/marketplace" className={styles.back}>
        <Icon name="arrowLeft" size={14} /> Back to Marketplace
      </Link>

      <div className={styles.layout}>
        <div className={styles.media}>
          {listing.imageUrl ? (
            <button
              type="button"
              className={styles.imageButton}
              onClick={() => setIsLightboxOpen(true)}
              aria-label="View photo"
            >
              <img className={styles.image} src={listing.imageUrl} alt={listing.title} />
            </button>
          ) : (
            <span className={styles.imageBlank}>
              <Icon name="store" size={40} />
            </span>
          )}
        </div>

        <div className={styles.details}>
          <Card>
            <span className={styles.price}>{formatPrice(listing.price, listing.currency)}</span>
            <h1 className={styles.title}>{listing.title}</h1>

            <span className={styles.meta}>
              {listing.status !== 'AVAILABLE' && (
                <span className={styles.statusPill}>{humanizeEnum(listing.status)}</span>
              )}
              Listed {timeAgo(listing.createdAt)} &middot; {listing.location ?? 'Nearby'}
            </span>

            <div className={styles.facts}>
              <div className={styles.factRow}>
                <Icon name="tag" size={14} />
                <span>{listing.category}</span>
              </div>
              <div className={styles.factRow}>
                <Icon name="check" size={14} />
                <span>{humanizeEnum(listing.condition)}</span>
              </div>
            </div>

            {listing.description && <p className={styles.description}>{listing.description}</p>}

            {listing.mine ? (
              <div className={styles.ownerTools}>
                <Select
                  compact
                  label="Listing status"
                  options={[
                    { value: 'AVAILABLE', label: 'Available' },
                    { value: 'PENDING', label: 'Sale pending' },
                    { value: 'SOLD', label: 'Sold' },
                  ]}
                  value={listing.status}
                  onChange={(event) => void setStatus(event.target.value)}
                />
                <Button variant="secondary" disabled={isBusy} onClick={() => setDialog('edit')}>
                  <Icon name="pencil" size={13} /> Edit Listing
                </Button>
                <Button variant="danger" disabled={isBusy} onClick={() => void remove()}>
                  Delete Listing
                </Button>
              </div>
            ) : (
              <div className={styles.buyerTools}>
                <Button fullWidth disabled={isBusy} onClick={() => void messageSeller()}>
                  <Icon name="messenger" size={14} /> Message Seller
                </Button>
                <div className={styles.buyerRow}>
                  <Button variant="secondary" fullWidth onClick={() => void toggleSave()}>
                    <Icon name={listing.savedByMe ? 'heart' : 'bookmark'} size={13} />
                    {listing.savedByMe ? 'Saved' : 'Save'}
                  </Button>
                  <Button variant="secondary" fullWidth onClick={() => setDialog('report')}>
                    <Icon name="alert" size={13} /> Report
                  </Button>
                </div>
                {sentInterest && (
                  <p className={styles.sent}>
                    {listing.seller.firstName} has been told you are interested.
                  </p>
                )}
              </div>
            )}
          </Card>

          <Card title="Seller">
            <Link to={`/profile/${listing.seller.id}`} className={styles.seller}>
              <Avatar src={listing.seller.avatarUrl} name={listing.seller.fullName} size="md" />
              <span className={styles.sellerText}>
                <span className={styles.sellerName}>{listing.seller.fullName}</span>
                <span className={styles.sellerMeta}>
                  {others.length > 0
                    ? `${others.length} other ${others.length === 1 ? 'listing' : 'listings'}`
                    : 'View profile'}
                </span>
              </span>
            </Link>
          </Card>
        </div>
      </div>

      {dialog === 'edit' && (
        <CreateListingDialog
          listing={listing}
          categories={categoriesQuery.data ?? [listing.category]}
          onClose={() => setDialog(null)}
          onCreated={(updated) => {
            setDialog(null);
            listingQuery.setData(() => updated);
          }}
        />
      )}

      {dialog === 'report' && (
        <ReportDialog
          targetType="LISTING"
          targetId={listing.id}
          targetName="this listing"
          blockName={listing.seller.fullName}
          onBlock={() => socialApi.block(listing.seller.id)}
          onClose={() => setDialog(null)}
        />
      )}

      {isLightboxOpen && listing.imageUrl && (
        <PhotoLightbox
          images={[listing.imageUrl]}
          caption={listing.title}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}
    </AppShell>
  );
}
