import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '@templates/index';
import { Avatar, Button, Card, Icon, Spinner, TextArea } from '@atoms/index';
import { EmptyState, ErrorNotice, MenuButton, Tabs } from '@molecules/index';
import { Feed, PageDialog, PostComposer, ReportDialog } from '@organisms/index';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { usePostCollection } from '@/hooks/usePostCollection';
import { pageApi, postApi } from '@/api/endpoints';
import { classNames, pluralize } from '@/utils/format';
import { timeAgo } from '@/utils/time';
import styles from '@/styles/Feature.module.css';
import local from './PageDetailPage.module.css';

type TabKey = 'posts' | 'about' | 'reviews';

/** One Page: cover, Like and Follow, its posts, About, and recommendations. */
export function PageDetailPage() {
  const { user } = useAuth();
  const { openWith } = useChat();
  const navigate = useNavigate();
  const { pageId } = useParams<{ pageId: string }>();
  const id = Number(pageId);

  const [tab, setTab] = useState<TabKey>('posts');
  const [dialog, setDialog] = useState<'edit' | 'report' | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [recommends, setRecommends] = useState<boolean | null>(null);
  const [reviewText, setReviewText] = useState('');

  const pageQuery = useAsync(() => pageApi.one(id), [id]);
  const reviewsQuery = useAsync(() => pageApi.reviews(id), [id]);
  const loader = useCallback((page: number, size: number) => postApi.pageFeed(id, page, size), [id]);
  const feed = usePostCollection(loader, [id]);

  const page = pageQuery.data;

  async function act(action: () => Promise<unknown>) {
    setIsBusy(true);
    try {
      await action();
      await pageQuery.reload();
    } finally {
      setIsBusy(false);
    }
  }

  async function submitReview() {
    if (recommends === null) return;
    await pageApi.review(id, recommends, reviewText.trim() || undefined);
    setRecommends(null);
    setReviewText('');
    void reviewsQuery.reload();
    void pageQuery.reload();
  }

  async function remove() {
    if (!page || !window.confirm(`Delete ${page.name} and all of its posts? This cannot be undone.`)) return;
    await pageApi.remove(id);
    navigate('/pages');
  }

  if (!user) return null;

  if (pageQuery.isLoading && !page) {
    return (
      <AppShell layout="wide" title="Page">
        <Spinner label="Loading Page" />
      </AppShell>
    );
  }

  if (pageQuery.error || !page) {
    return (
      <AppShell layout="wide" title="Page">
        <ErrorNotice message={pageQuery.error ?? 'That Page could not be found'} onRetry={pageQuery.reload} />
      </AppShell>
    );
  }

  const aboutCard = (
      <Card title="About">
        {page.description && <p className={styles.blurb}>{page.description}</p>}
        {page.location && (
          <div className={styles.infoRow}>
            <Icon name="location" size={16} /> {page.location}
          </div>
        )}
        {page.phone && (
          <div className={styles.infoRow}>
            <Icon name="send" size={16} /> {page.phone}
          </div>
        )}
        {page.website && (
          <div className={styles.infoRow}>
            <Icon name="globe" size={16} />
            <a href={page.website} target="_blank" rel="noreferrer noopener">
              {page.website}
            </a>
          </div>
        )}
        <div className={styles.infoRow}>
          <Icon name="flag" size={16} /> {page.category}
        </div>
        <div className={styles.infoRow}>
          <Icon name="users" size={16} />
          <span>
            Created by <Link to={`/profile/${page.owner.id}`}>{page.owner.fullName}</Link>
          </span>
        </div>
      </Card>
  );

  const reviews = reviewsQuery.data ?? [];
  const myReview = reviews.find((r) => r.author.id === user.id);

  return (
    <AppShell layout="wide" title={page.name}>
      <div className={styles.cover}>
        {page.coverUrl ? (
          <img className={styles.coverImage} src={page.coverUrl} alt="" />
        ) : (
          <span className={styles.coverFallback} />
        )}
        <div className={styles.coverBar}>
          <div className={styles.identity}>
            {page.avatarUrl && <img className={styles.pageAvatar} src={page.avatarUrl} alt="" />}
            <span className={styles.identityText}>
              <span className={styles.bigName}>{page.name}</span>
              <span className={styles.meta}>
                {page.category} &middot; {pluralize(page.likeCount, 'like')} &middot;{' '}
                {pluralize(page.followerCount, 'follower')}
              </span>
            </span>
          </div>
          <div className={styles.actions}>
            {page.mine ? (
              <>
                <Button variant="secondary" onClick={() => setDialog('edit')}>
                  <Icon name="pencil" size={12} /> Edit Page
                </Button>
                <Button variant="secondary" onClick={() => navigate('/ads')}>
                  <Icon name="megaphone" size={12} /> Promote
                </Button>
                <MenuButton
                  bordered
                  items={[{ label: 'Delete Page', icon: 'trash', destructive: true, onClick: () => void remove() }]}
                />
              </>
            ) : (
              <>
                <Button
                  variant={page.liked ? 'secondary' : 'primary'}
                  disabled={isBusy}
                  onClick={() => void act(() => pageApi.toggleLike(id))}
                >
                  <Icon name="like" size={12} /> {page.liked ? 'Liked' : 'Like'}
                </Button>
                <Button variant="secondary" disabled={isBusy} onClick={() => void act(() => pageApi.toggleFollow(id))}>
                  <Icon name={page.following ? 'check' : 'bell'} size={12} /> {page.following ? 'Following' : 'Follow'}
                </Button>
                <Button variant="secondary" onClick={() => void openWith(page.owner.id)}>
                  <Icon name="messenger" size={12} /> Message
                </Button>
                <MenuButton
                  bordered
                  items={[{ label: 'Report Page', icon: 'alert', onClick: () => setDialog('report') }]}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <Tabs
        items={[
          { key: 'posts', label: 'Posts' },
          { key: 'about', label: 'About' },
          { key: 'reviews', label: 'Reviews', count: page.reviewCount },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className={styles.body}>
        {tab === 'posts' && (
          <div className={styles.twoCol}>
            <aside className={styles.stack}>
              {aboutCard}
            </aside>
            <div>
              {page.mine && (
                <PostComposer
                  author={user}
                  page={{ id: page.id, name: page.name, avatarUrl: page.avatarUrl, category: page.category }}
                  onCreate={feed.createPost}
                />
              )}
              <Feed collection={feed} viewer={user} emptyTitle="No posts yet" emptyDescription="This Page has not posted anything." />
            </div>
          </div>
        )}

        {tab === 'about' && aboutCard}

        {tab === 'reviews' && (
          <div className={styles.stack}>
            {!page.mine && (
              <Card title={myReview ? 'Update your recommendation' : `Do you recommend ${page.name}?`}>
                <div className={styles.stack}>
                  <div className={styles.rowWrap}>
                    <Button variant={recommends === true ? 'primary' : 'secondary'} onClick={() => setRecommends(true)}>
                      <Icon name="like" size={12} /> Yes
                    </Button>
                    <Button variant={recommends === false ? 'primary' : 'secondary'} onClick={() => setRecommends(false)}>
                      No
                    </Button>
                  </div>
                  {recommends !== null && (
                    <>
                      <TextArea
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder={`What do you ${recommends ? 'like' : 'not like'} about ${page.name}?`}
                        aria-label="Your review"
                        bordered
                        rows={3}
                        minHeight={70}
                      />
                      <div>
                        <Button onClick={() => void submitReview()}>Post</Button>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            )}
            <Card
              title={
                page.recommendPercent != null
                  ? `${page.recommendPercent}% recommend (${pluralize(page.reviewCount, 'review')})`
                  : 'Reviews'
              }
            >
              {reviews.length === 0 ? (
                <EmptyState icon="star" title="No reviews yet" />
              ) : (
                <div className={styles.list}>
                  {reviews.map((review) => (
                    <div key={review.id} className={styles.listRow}>
                      <Avatar src={review.author.avatarUrl} name={review.author.fullName} size="md" />
                      <span className={styles.listText}>
                        <span>
                          <Link to={`/profile/${review.author.id}`} className={styles.listName}>
                            {review.author.fullName}
                          </Link>{' '}
                          <span className={classNames(styles.pill, review.recommends ? styles.pillGreen : styles.pillRed)}>
                            {review.recommends ? 'recommends' : "doesn't recommend"}
                          </span>
                        </span>
                        {review.content && <span className={local.review}>{review.content}</span>}
                        <span className={styles.muted}>{timeAgo(review.createdAt)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {dialog === 'edit' && (
        <PageDialog
          page={page}
          onClose={() => setDialog(null)}
          onSaved={(updated) => {
            setDialog(null);
            pageQuery.setData(() => updated);
          }}
        />
      )}
      {dialog === 'report' && (
        <ReportDialog targetType="PAGE" targetId={page.id} targetName={page.name} onClose={() => setDialog(null)} />
      )}
    </AppShell>
  );
}
