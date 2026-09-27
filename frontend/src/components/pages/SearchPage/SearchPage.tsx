import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppShell } from '@templates/index';
import { Card, Spinner } from '@atoms/index';
import { EmptyState, EventCard, FriendTile, GroupCard, ListingCard, PageCard, Tabs } from '@molecules/index';
import { Feed } from '@organisms/index';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { usePostCollection } from '@/hooks/usePostCollection';
import { searchApi } from '@/api/endpoints';
import styles from './SearchPage.module.css';

type TabKey = 'all' | 'people' | 'posts' | 'pages' | 'groups' | 'events' | 'marketplace';

/** One query across people, posts, groups, events and Marketplace. */
export function SearchPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const query = params.get('q') ?? '';
  const [tab, setTab] = useState<TabKey>('all');

  const resultsQuery = useAsync(() => searchApi.all(query), [query]);
  const results = resultsQuery.data;

  // Posts render through the normal feed, so they keep every interaction.
  const postLoader = useCallback(async () => results?.posts ?? [], [results]);
  const postCollection = usePostCollection(postLoader, [results]);

  const counts = useMemo(
    () => ({
      people: results?.people.length ?? 0,
      posts: results?.posts.length ?? 0,
      groups: results?.groups.length ?? 0,
      events: results?.events.length ?? 0,
      listings: results?.listings.length ?? 0,
      pages: results?.pages?.length ?? 0,
    }),
    [results],
  );

  const total =
    counts.people + counts.posts + counts.groups + counts.events + counts.listings + counts.pages;

  if (!user) return null;

  const showPeople = tab === 'all' || tab === 'people';
  const showPosts = tab === 'all' || tab === 'posts';
  const showGroups = tab === 'all' || tab === 'groups';
  const showEvents = tab === 'all' || tab === 'events';
  const showListings = tab === 'all' || tab === 'marketplace';
  const showPages = tab === 'all' || tab === 'pages';

  return (
    <AppShell layout="wide" title={query ? `${query} - Search` : 'Search'}>
      <Card className={styles.intro}>
        <span className={styles.heading}>
          {query.length < 2
            ? 'Type at least two characters to search'
            : `Results for "${query}"`}
        </span>
        {query.length >= 2 && !resultsQuery.isLoading && (
          <span className={styles.total}>
            {total === 0 ? 'Nothing found' : `${total} ${total === 1 ? 'result' : 'results'}`}
          </span>
        )}
      </Card>

      <Tabs
        items={[
          { key: 'all', label: 'All' },
          { key: 'people', label: 'People', count: counts.people },
          { key: 'posts', label: 'Posts', count: counts.posts },
          { key: 'pages', label: 'Pages', count: counts.pages },
          { key: 'groups', label: 'Groups', count: counts.groups },
          { key: 'events', label: 'Events', count: counts.events },
          { key: 'marketplace', label: 'Marketplace', count: counts.listings },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className={styles.body}>
        {resultsQuery.isLoading ? (
          <Card>
            <Spinner label="Searching" />
          </Card>
        ) : total === 0 ? (
          <Card>
            <EmptyState
              icon="search"
              title={query.length < 2 ? 'Start typing' : `No results for "${query}"`}
              description="Try a different spelling, or search for someone by their first name."
            />
          </Card>
        ) : (
          <>
            {showPeople && counts.people > 0 && (
              <Card title="People" className={styles.section}>
                <div className={styles.peopleGrid}>
                  {results?.people.map((friend) => (
                    <FriendTile key={friend.user.id} friend={friend} variant="row" />
                  ))}
                </div>
              </Card>
            )}

            {showPages && counts.pages > 0 && (
              <Card title="Pages" padded={false} className={styles.section}>
                <div className={styles.cardGrid}>
                  {results?.pages.map((page) => (
                    <PageCard key={page.id} page={page} />
                  ))}
                </div>
              </Card>
            )}

            {showGroups && counts.groups > 0 && (
              <Card title="Groups" padded={false} className={styles.section}>
                <div className={styles.cardGrid}>
                  {results?.groups.map((group) => (
                    <GroupCard key={group.id} group={group} />
                  ))}
                </div>
              </Card>
            )}

            {showEvents && counts.events > 0 && (
              <Card title="Events" padded={false} className={styles.section}>
                <div className={styles.cardGrid}>
                  {results?.events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </Card>
            )}

            {showListings && counts.listings > 0 && (
              <Card title="Marketplace" padded={false} className={styles.section}>
                <div className={styles.listingGrid}>
                  {results?.listings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              </Card>
            )}

            {showPosts && counts.posts > 0 && (
              <div className={styles.section}>
                <span className={styles.sectionHeading}>Posts</span>
                <Feed collection={postCollection} viewer={user} paginate={false} />
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
