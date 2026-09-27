import { useState } from 'react';
import { AppShell } from '@templates/index';
import { Button, Card, Icon, Input, Select, Spinner, TextArea } from '@atoms/index';
import { AdCard, EmptyState, ErrorNotice, MediaUpload, Modal } from '@molecules/index';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { toErrorMessage } from '@/api/client';
import { adApi, pageApi } from '@/api/endpoints';
import { classNames, formatPrice, humanizeEnum } from '@/utils/format';
import type { Ad, AdPayload, CallToAction } from '@/types';
import styles from '@/styles/Feature.module.css';

const CTAS: CallToAction[] = ['LEARN_MORE', 'SHOP_NOW', 'SIGN_UP', 'BOOK_NOW', 'CONTACT_US', 'DOWNLOAD'];

function ctr(ad: Pick<Ad, 'impressions' | 'clicks'>): string {
  return ad.impressions === 0 ? '0%' : `${((ad.clicks / ad.impressions) * 100).toFixed(1)}%`;
}

/** Ads Manager: create ads, switch them on and off, and watch reach and clicks. */
export function AdsManagerPage() {
  const adsQuery = useAsync(() => adApi.mine(), []);
  const [editing, setEditing] = useState<Ad | 'new' | null>(null);
  const ads = adsQuery.data ?? [];

  const totals = ads.reduce(
    (sum, ad) => ({ impressions: sum.impressions + ad.impressions, clicks: sum.clicks + ad.clicks }),
    { impressions: 0, clicks: 0 },
  );

  async function toggle(ad: Ad) {
    const updated = await adApi.setActive(ad.id, !ad.active);
    adsQuery.setData((current) => (current ?? []).map((a) => (a.id === ad.id ? updated : a)));
  }

  async function remove(ad: Ad) {
    if (!window.confirm(`Delete the ad "${ad.title}"?`)) return;
    await adApi.remove(ad.id);
    void adsQuery.reload();
  }

  return (
    <AppShell layout="wide" title="Ads Manager">
      <Card
        title="Ads Manager"
        className={styles.intro}
        action={
          <Button size="sm" onClick={() => setEditing('new')}>
            <Icon name="plus" size={12} /> Create Ad
          </Button>
        }
      >
        <p className={styles.blurb}>
          Your ads appear in the right column and between News Feed posts. Every time one is shown counts as an
          impression; every click is counted too. Budgets are for show - nothing is billed.
        </p>
      </Card>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{ads.filter((a) => a.active).length}</span>
          <span className={styles.statLabel}>Active ads</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{totals.impressions.toLocaleString()}</span>
          <span className={styles.statLabel}>Impressions</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{totals.clicks.toLocaleString()}</span>
          <span className={styles.statLabel}>Link clicks</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{ctr(totals)}</span>
          <span className={styles.statLabel}>Click-through rate</span>
        </div>
      </div>

      <Card title="Your ads" padded={false}>
        {adsQuery.isLoading && ads.length === 0 ? (
          <div className={styles.loading}>
            <Spinner label="Loading ads" />
          </div>
        ) : ads.length === 0 ? (
          <EmptyState
            icon="megaphone"
            title="You have no ads yet"
            action={<Button onClick={() => setEditing('new')}>Create Ad</Button>}
          />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Ad</th>
                  <th>Status</th>
                  <th>Daily budget</th>
                  <th>Impressions</th>
                  <th>Clicks</th>
                  <th>CTR</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {ads.map((ad) => (
                  <tr key={ad.id}>
                    <td>
                      <span className={styles.row}>
                        {ad.imageUrl && <img className={styles.tileLogo} src={ad.imageUrl} alt="" />}
                        <span className={styles.listText}>
                          <span className={styles.strong}>{ad.title}</span>
                          <span className={styles.muted}>{ad.page?.name ?? 'You'}</span>
                        </span>
                      </span>
                    </td>
                    <td>
                      <span className={classNames(styles.pill, ad.active ? styles.pillGreen : undefined)}>
                        {ad.active ? 'Active' : 'Off'}
                      </span>
                    </td>
                    <td>{ad.dailyBudget != null ? formatPrice(Number(ad.dailyBudget)) : '—'}</td>
                    <td>{ad.impressions.toLocaleString()}</td>
                    <td>{ad.clicks.toLocaleString()}</td>
                    <td>{ctr(ad)}</td>
                    <td>
                      <span className={styles.rowWrap}>
                        <Button size="sm" variant="secondary" onClick={() => void toggle(ad)}>
                          {ad.active ? 'Turn off' : 'Turn on'}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditing(ad)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void remove(ad)}>
                          <Icon name="trash" size={12} />
                        </Button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && (
        <AdDialog
          ad={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void adsQuery.reload();
          }}
        />
      )}
    </AppShell>
  );
}

function AdDialog({ ad, onClose, onSaved }: { ad?: Ad; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const pagesQuery = useAsync(() => pageApi.mine(), []);
  const [title, setTitle] = useState(ad?.title ?? '');
  const [body, setBody] = useState(ad?.body ?? '');
  const [imageUrl, setImageUrl] = useState(ad?.imageUrl ?? '');
  const [linkUrl, setLinkUrl] = useState(ad?.linkUrl ?? '');
  const [cta, setCta] = useState<CallToAction>(ad?.callToAction ?? 'LEARN_MORE');
  const [budget, setBudget] = useState(ad?.dailyBudget != null ? String(ad.dailyBudget) : '10');
  const [pageId, setPageId] = useState(ad?.page ? String(ad.page.id) : '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pages = pagesQuery.data ?? [];
  const page = pages.find((p) => String(p.id) === pageId);

  async function save() {
    setIsSaving(true);
    setError(null);
    const payload: AdPayload = {
      title: title.trim(),
      body: body.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      linkUrl: linkUrl.trim(),
      callToAction: cta,
      dailyBudget: budget ? Number(budget) : undefined,
      pageId: pageId ? Number(pageId) : undefined,
    };
    try {
      if (ad) await adApi.update(ad.id, payload);
      else await adApi.create(payload);
      onSaved();
    } catch (err) {
      setError(toErrorMessage(err, 'The ad could not be saved'));
    } finally {
      setIsSaving(false);
    }
  }

  const preview: Ad | null = user
    ? {
        id: 0,
        advertiser: user,
        page: page ? { id: page.id, name: page.name, avatarUrl: page.avatarUrl, category: page.category } : null,
        title: title || 'Your headline',
        body: body || 'Your ad text appears here.',
        imageUrl: imageUrl || null,
        linkUrl: linkUrl || 'https://example.com',
        callToAction: cta,
        impressions: 0,
        clicks: 0,
        active: true,
        mine: true,
        createdAt: new Date().toISOString(),
      }
    : null;

  return (
    <Modal
      title={ad ? 'Edit ad' : 'Create an ad'}
      width="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={!title.trim() || !linkUrl.trim() || isSaving}>
            {isSaving ? 'Saving…' : ad ? 'Save' : 'Publish Ad'}
          </Button>
        </>
      }
    >
      <div className={styles.twoCol}>
        <div className={styles.form}>
          {pages.length > 0 && (
            <Select
              compact
              label="Run as"
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
              options={[{ value: '', label: 'Yourself' }, ...pages.map((p) => ({ value: String(p.id), label: p.name }))]}
            />
          )}
          <Input compact label="Headline" value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextArea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Primary text" aria-label="Ad text" bordered rows={3} minHeight={70} />
          <Input compact label="Website URL" placeholder="https://" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />
          <div className={styles.formRow}>
            <Select
              compact
              label="Button"
              value={cta}
              onChange={(e) => setCta(e.target.value as CallToAction)}
              options={CTAS.map((c) => ({ value: c, label: humanizeEnum(c).replace(' - ', ' ') }))}
            />
            <Input compact type="number" min="1" label="Daily budget (USD)" value={budget} onChange={(e) => setBudget(e.target.value)} />
          </div>
          <MediaUpload label="Upload image" onUploaded={(url) => setImageUrl(url)} />
          {error && <ErrorNotice message={error} />}
        </div>
        <div>
          <span className={styles.muted}>Preview in News Feed</span>
          {preview && <AdCard ad={preview} />}
        </div>
      </div>
    </Modal>
  );
}
