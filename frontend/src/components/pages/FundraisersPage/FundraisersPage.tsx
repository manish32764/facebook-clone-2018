import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '@templates/index';
import { Avatar, Button, Card, Icon, Input, Select, Spinner, TextArea } from '@atoms/index';
import { EmptyState, ErrorNotice, MediaUpload, Modal, Tabs } from '@molecules/index';
import { useAsync } from '@/hooks/useAsync';
import { toErrorMessage } from '@/api/client';
import { fundraiserApi } from '@/api/endpoints';
import { formatPrice, pluralize } from '@/utils/format';
import { fundraiserProgress } from '@/utils/labels';
import type { Fundraiser, FundraiserPayload } from '@/types';
import styles from '@/styles/Feature.module.css';

type TabKey = 'all' | 'mine';

/** Fundraisers: browse causes, and raise money for your own. */
export function FundraisersPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('all');
  const [isCreating, setIsCreating] = useState(false);
  const allQuery = useAsync(() => fundraiserApi.all(), []);
  const mineQuery = useAsync(() => fundraiserApi.mine(), []);

  const query = tab === 'all' ? allQuery : mineQuery;
  const shown = query.data ?? [];

  return (
    <AppShell layout="wide" title="Fundraisers">
      <Card
        title="Fundraisers"
        className={styles.intro}
        action={
          <Button size="sm" onClick={() => setIsCreating(true)}>
            <Icon name="plus" size={12} /> Raise Money
          </Button>
        }
      >
        <p className={styles.blurb}>
          Support the causes your friends care about. This is a clone: donations are recorded as pledges and no
          real money is taken.
        </p>
      </Card>

      <Tabs
        items={[
          { key: 'all', label: 'Discover', count: allQuery.data?.length },
          { key: 'mine', label: 'Your Fundraisers', count: mineQuery.data?.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      <Card padded={false} className={styles.section}>
        {query.isLoading && shown.length === 0 ? (
          <div className={styles.loading}>
            <Spinner label="Loading fundraisers" />
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon="money"
            title={tab === 'mine' ? 'You have not started a fundraiser' : 'No fundraisers yet'}
            action={<Button onClick={() => setIsCreating(true)}>Raise Money</Button>}
          />
        ) : (
          <div className={styles.grid}>
            {shown.map((f) => (
              <Link key={f.id} to={`/fundraisers/${f.id}`} className={styles.tile}>
                {f.coverUrl ? (
                  <img className={styles.tileImage} src={f.coverUrl} alt="" loading="lazy" />
                ) : (
                  <span className={styles.tileFallback}>
                    <Icon name="money" size={28} />
                  </span>
                )}
                <span className={styles.tileBody}>
                  <span className={styles.tileTitle}>{f.title}</span>
                  <span className={styles.row}>
                    <Avatar src={f.creator.avatarUrl} name={f.creator.fullName} size="xs" circle />
                    <span className={styles.muted}>
                      {f.creator.fullName} &middot; {f.category}
                    </span>
                  </span>
                  <span className={styles.progress}>
                    <span className={styles.progressFill} style={{ width: `${fundraiserProgress(f)}%` }} />
                  </span>
                  <span className={styles.muted}>
                    <strong className={styles.strong}>{formatPrice(Number(f.raised), f.currency)}</strong> raised of{' '}
                    {formatPrice(Number(f.goal), f.currency)} &middot; {pluralize(f.donationCount, 'donation')}
                    {f.closed && ' · Ended'}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {isCreating && (
        <FundraiserDialog
          onClose={() => setIsCreating(false)}
          onSaved={(f) => navigate(`/fundraisers/${f.id}`)}
        />
      )}
    </AppShell>
  );
}

export interface FundraiserDialogProps {
  fundraiser?: Fundraiser;
  onClose: () => void;
  onSaved: (fundraiser: Fundraiser) => void;
}

/** Start a fundraiser, or edit your own. */
export function FundraiserDialog({ fundraiser, onClose, onSaved }: FundraiserDialogProps) {
  const categoriesQuery = useAsync(() => fundraiserApi.categories(), []);
  const [title, setTitle] = useState(fundraiser?.title ?? '');
  const [story, setStory] = useState(fundraiser?.story ?? '');
  const [goal, setGoal] = useState(fundraiser ? String(fundraiser.goal) : '1000');
  const [category, setCategory] = useState(fundraiser?.category ?? 'Community');
  const [beneficiary, setBeneficiary] = useState(fundraiser?.beneficiary ?? '');
  const [coverUrl, setCoverUrl] = useState(fundraiser?.coverUrl ?? '');
  const [endsAt, setEndsAt] = useState(fundraiser?.endsAt ? fundraiser.endsAt.slice(0, 10) : '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goalValue = Number(goal);
  const canSave = title.trim().length > 0 && goalValue >= 1 && !isSaving;

  async function save() {
    setIsSaving(true);
    setError(null);
    const payload: FundraiserPayload = {
      title: title.trim(),
      story: story.trim() || undefined,
      goal: goalValue,
      category,
      beneficiary: beneficiary.trim() || undefined,
      coverUrl: coverUrl.trim() || undefined,
      endsAt: endsAt ? new Date(`${endsAt}T23:59:00`).toISOString() : undefined,
    };
    try {
      onSaved(fundraiser ? await fundraiserApi.update(fundraiser.id, payload) : await fundraiserApi.create(payload));
    } catch (err) {
      setError(toErrorMessage(err, 'The fundraiser could not be saved'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      title={fundraiser ? 'Edit fundraiser' : 'Raise money'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={!canSave}>
            {isSaving ? 'Saving…' : fundraiser ? 'Save' : 'Create Fundraiser'}
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <Input compact label="Title" placeholder="Help rebuild the trail bridge" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className={styles.formRow}>
          <Input compact type="number" min="1" label="Goal (USD)" value={goal} onChange={(e) => setGoal(e.target.value)} />
          <Select
            compact
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={(categoriesQuery.data ?? [category]).map((c) => ({ value: c, label: c }))}
          />
        </div>
        <div className={styles.formRow}>
          <Input compact label="Raising money for" placeholder="Cascade Trails Association" value={beneficiary} onChange={(e) => setBeneficiary(e.target.value)} />
          <Input compact type="date" label="End date (optional)" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>
        <TextArea
          value={story}
          onChange={(e) => setStory(e.target.value)}
          placeholder="Tell people why this matters and how the money will be used"
          aria-label="Your story"
          bordered
          rows={5}
          minHeight={110}
        />
        <MediaUpload label="Upload cover photo" onUploaded={(url) => setCoverUrl(url)} />
        {coverUrl && <img className={styles.previewImage} src={coverUrl} alt="Cover preview" />}
        {error && <ErrorNotice message={error} />}
      </div>
    </Modal>
  );
}
