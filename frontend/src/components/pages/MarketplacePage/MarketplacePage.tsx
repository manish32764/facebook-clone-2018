import { useState } from 'react';
import { AppShell } from '@templates/index';
import { Button, Card, Icon, Input, Select, Spinner } from '@atoms/index';
import { EmptyState, ListingCard } from '@molecules/index';
import { CreateListingDialog } from '@organisms/index';
import { CONDITIONS } from '@/utils/labels';
import { useAsync } from '@/hooks/useAsync';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { marketplaceApi } from '@/api/endpoints';
import { classNames } from '@/utils/format';
import type { ListingFilters } from '@/types';
import styles from './MarketplacePage.module.css';

type View = 'browse' | 'mine' | 'saved';

export function MarketplacePage() {
  const [category, setCategory] = useState<string | null>(null);
  const [view, setView] = useState<View>('browse');
  const [isCreating, setIsCreating] = useState(false);

  const [query, setQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [location, setLocation] = useState('');
  const [condition, setCondition] = useState('');
  const [sort, setSort] = useState<NonNullable<ListingFilters['sort']>>('newest');

  // Typing in a filter should not fire a request per keystroke.
  const filters = useDebouncedValue(
    JSON.stringify({ category, query, minPrice, maxPrice, location, condition, sort }),
    300,
  );

  const categoriesQuery = useAsync(() => marketplaceApi.categories(), []);
  const listingsQuery = useAsync(() => {
    if (view === 'mine') return marketplaceApi.mine();
    if (view === 'saved') return marketplaceApi.saved();
    return marketplaceApi.browse({
      category: category ?? undefined,
      q: query.trim() || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      location: location.trim() || undefined,
      condition: condition || undefined,
      sort,
    });
  }, [filters, view]);

  const categories = categoriesQuery.data ?? [];
  const listings = listingsQuery.data ?? [];

  function pick(next: string | null) {
    setView('browse');
    setCategory(next);
  }

  function clearFilters() {
    setQuery('');
    setMinPrice('');
    setMaxPrice('');
    setLocation('');
    setCondition('');
    setSort('newest');
  }

  async function toggleSave(listingId: number) {
    const result = await marketplaceApi.toggleSave(listingId);
    if (view === 'saved' && !result.saved) {
      listingsQuery.setData((current) => (current ?? []).filter((l) => l.id !== listingId));
    } else {
      listingsQuery.setData((current) =>
        (current ?? []).map((l) => (l.id === listingId ? { ...l, savedByMe: result.saved } : l)),
      );
    }
  }

  const heading = view === 'mine' ? 'Your Listings' : view === 'saved' ? 'Saved Items' : category ?? "Today's Picks";
  const hasFilters = Boolean(query || minPrice || maxPrice || location || condition || sort !== 'newest');

  return (
    <AppShell layout="full" title="Marketplace">
      <div className={styles.layout}>
        <aside className={styles.categories}>
          <span className={styles.railTitle}>Marketplace</span>

          <button
            type="button"
            className={classNames(styles.category, view === 'browse' && !category && styles.categoryActive)}
            onClick={() => pick(null)}
          >
            <Icon name="store" size={14} /> Browse All
          </button>
          <button
            type="button"
            className={classNames(styles.category, view === 'saved' && styles.categoryActive)}
            onClick={() => setView('saved')}
          >
            <Icon name="bookmark" size={14} /> Saved Items
          </button>
          <button
            type="button"
            className={classNames(styles.category, view === 'mine' && styles.categoryActive)}
            onClick={() => setView('mine')}
          >
            <Icon name="tag" size={14} /> Your Listings
          </button>

          <span className={styles.categoryTitle}>Categories</span>
          {categories.map((name) => (
            <button
              key={name}
              type="button"
              className={classNames(styles.category, view === 'browse' && category === name && styles.categoryActive)}
              onClick={() => pick(name)}
            >
              <Icon name="chevronRight" size={12} /> {name}
            </button>
          ))}
        </aside>

        <div className={styles.main}>
          <div className={styles.header}>
            <span className={styles.title}>
              {heading}
              {/* The rail carries the section name, but it is hidden on a phone. */}
              <span className={styles.titleContext}>Marketplace</span>
            </span>
            <Button onClick={() => setIsCreating(true)}>
              <Icon name="plus" size={13} /> Sell Something
            </Button>
          </div>

          {view === 'browse' && (
            <Card className={styles.filters}>
              <div className={styles.filterGrid}>
                <Input compact label="Search" placeholder="Search Marketplace" value={query} onChange={(e) => setQuery(e.target.value)} />
                <Input compact type="number" min="0" label="Min price" placeholder="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
                <Input compact type="number" min="0" label="Max price" placeholder="Any" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
                <Input compact label="Location" placeholder="City" value={location} onChange={(e) => setLocation(e.target.value)} />
                <Select
                  compact
                  label="Condition"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  options={[{ value: '', label: 'Any' }, ...CONDITIONS]}
                />
                <Select
                  compact
                  label="Sort by"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as NonNullable<ListingFilters['sort']>)}
                  options={[
                    { value: 'newest', label: 'Newest first' },
                    { value: 'price_asc', label: 'Price: low to high' },
                    { value: 'price_desc', label: 'Price: high to low' },
                  ]}
                />
              </div>
              {hasFilters && (
                <button type="button" className={styles.clearFilters} onClick={clearFilters}>
                  Clear filters
                </button>
              )}
            </Card>
          )}

          {listingsQuery.isLoading && listings.length === 0 ? (
            <div className={styles.loading}>
              <Spinner label="Loading listings" />
            </div>
          ) : listings.length === 0 ? (
            <Card>
              <EmptyState
                icon="store"
                title={
                  view === 'mine'
                    ? 'You have not listed anything'
                    : view === 'saved'
                      ? 'Nothing saved yet'
                      : 'Nothing matches'
                }
                description={
                  view === 'mine'
                    ? 'List something and it shows up in Marketplace straight away.'
                    : view === 'saved'
                      ? 'Tap the bookmark on any listing to keep it here.'
                      : 'Try another category, widen the price range, or clear the filters.'
                }
                action={view === 'mine' ? <Button onClick={() => setIsCreating(true)}>Sell Something</Button> : undefined}
              />
            </Card>
          ) : (
            <div className={styles.grid}>
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} onToggleSave={(id) => void toggleSave(id)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {isCreating && (
        <CreateListingDialog
          categories={categories}
          onClose={() => setIsCreating(false)}
          onCreated={() => {
            setIsCreating(false);
            setCategory(null);
            setView('mine');
            void listingsQuery.reload();
          }}
        />
      )}
    </AppShell>
  );
}
