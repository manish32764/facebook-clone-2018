import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '@templates/index';
import { Avatar, Button, Card, Icon, Input, Spinner, TextArea } from '@atoms/index';
import { EmptyState, ErrorNotice, MenuButton, Modal } from '@molecules/index';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { toErrorMessage } from '@/api/client';
import { fundraiserApi, postApi } from '@/api/endpoints';
import { classNames, formatPrice, pluralize } from '@/utils/format';
import { eventDate, timeAgo } from '@/utils/time';
import { FundraiserDialog } from './FundraisersPage';
import { fundraiserProgress } from '@/utils/labels';
import styles from '@/styles/Feature.module.css';

const PRESETS = [10, 25, 50, 100];

/** One fundraiser: the story, the progress bar, recent donations and Donate. */
export function FundraiserPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { fundraiserId } = useParams<{ fundraiserId: string }>();
  const id = Number(fundraiserId);

  const fundraiserQuery = useAsync(() => fundraiserApi.one(id), [id]);
  const donationsQuery = useAsync(() => fundraiserApi.donations(id), [id]);
  const [dialog, setDialog] = useState<'donate' | 'edit' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const f = fundraiserQuery.data;

  async function share() {
    if (!f) return;
    await postApi.create({
      content: `I'm supporting "${f.title}". Every bit helps: ${window.location.origin}/fundraisers/${f.id}`,
      imageUrl: f.coverUrl ?? undefined,
      privacy: 'PUBLIC',
    });
    setNotice('Shared to your timeline.');
  }

  async function remove() {
    if (!f || !window.confirm('Delete this fundraiser and its donation records?')) return;
    await fundraiserApi.remove(f.id);
    navigate('/fundraisers');
  }

  if (!user) return null;

  if (fundraiserQuery.isLoading && !f) {
    return (
      <AppShell layout="wide" title="Fundraiser">
        <Spinner label="Loading fundraiser" />
      </AppShell>
    );
  }

  if (fundraiserQuery.error || !f) {
    return (
      <AppShell layout="wide" title="Fundraiser">
        <ErrorNotice message={fundraiserQuery.error ?? 'That fundraiser could not be found'} onRetry={fundraiserQuery.reload} />
      </AppShell>
    );
  }

  const donations = donationsQuery.data ?? [];
  const percent = fundraiserProgress(f);

  return (
    <AppShell layout="wide" title={f.title}>
      <div className={styles.cover}>
        {f.coverUrl ? <img className={styles.coverImage} src={f.coverUrl} alt="" /> : <span className={styles.coverFallback} />}
        <div className={styles.coverBar}>
          <span className={styles.identityText}>
            <span className={styles.bigName}>{f.title}</span>
            <span className={styles.meta}>
              <Avatar src={f.creator.avatarUrl} name={f.creator.fullName} size="xs" circle />
              <Link to={`/profile/${f.creator.id}`}>{f.creator.fullName}</Link> is raising money
              {f.beneficiary && <> for <strong>{f.beneficiary}</strong></>}
            </span>
          </span>
          <div className={styles.actions}>
            <Button disabled={f.closed} onClick={() => setDialog('donate')}>
              <Icon name="heart" size={12} /> Donate
            </Button>
            <Button variant="secondary" onClick={() => void share()}>
              <Icon name="share" size={12} /> Share
            </Button>
            {f.mine && (
              <MenuButton
                bordered
                items={[
                  { label: 'Edit fundraiser', icon: 'pencil', onClick: () => setDialog('edit') },
                  {
                    label: f.closed ? 'Reopen fundraiser' : 'End fundraiser',
                    icon: 'clock',
                    onClick: () => void fundraiserApi.setClosed(f.id, !f.closed).then((u) => fundraiserQuery.setData(() => u)),
                  },
                  { label: 'Delete fundraiser', icon: 'trash', destructive: true, onClick: () => void remove(), divider: true },
                ]}
              />
            )}
          </div>
        </div>
      </div>

      {notice && <p className={classNames(styles.notice)}>{notice}</p>}

      <div className={styles.body}>
        <div className={styles.twoCol}>
          <aside className={styles.stack}>
            <Card>
              <div className={styles.stack}>
                <span className={styles.bigName}>{formatPrice(Number(f.raised), f.currency)}</span>
                <span className={styles.muted}>raised of {formatPrice(Number(f.goal), f.currency)} goal</span>
                <span className={styles.progress}>
                  <span className={styles.progressFill} style={{ width: `${percent}%` }} />
                </span>
                <span className={styles.muted}>
                  {percent}% &middot; {pluralize(f.donationCount, 'donation')}
                  {f.endsAt && ` · ${f.closed ? 'Ended' : 'Ends'} ${eventDate(f.endsAt)}`}
                </span>
                {f.closed ? (
                  <span className={classNames(styles.pill, styles.pillWarn)}>This fundraiser has ended</span>
                ) : (
                  <Button fullWidth onClick={() => setDialog('donate')}>
                    Donate
                  </Button>
                )}
              </div>
            </Card>
            <Card title="Recent donations">
              {donations.length === 0 ? (
                <EmptyState icon="heart" title="Be the first to donate" />
              ) : (
                <div className={styles.list}>
                  {donations.slice(0, 20).map((d) => (
                    <div key={d.id} className={styles.listRow}>
                      <Avatar src={d.donor.avatarUrl} name={d.donor.fullName} size="sm" />
                      <span className={styles.listText}>
                        <span>
                          <strong>{d.donor.fullName}</strong> donated {formatPrice(Number(d.amount), f.currency)}
                        </span>
                        {d.message && <span className={styles.blurb}>&ldquo;{d.message}&rdquo;</span>}
                        <span className={styles.muted}>{timeAgo(d.createdAt)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </aside>

          <Card title="About this fundraiser">
            <div className={styles.infoRow}>
              <Icon name="tag" size={16} /> {f.category}
            </div>
            <div className={styles.infoRow}>
              <Icon name="clock" size={16} /> Created {timeAgo(f.createdAt)}
            </div>
            <p className={classNames(styles.blurb, styles.preWrap, styles.spaced)}>
              {f.story ?? 'No story yet.'}
            </p>
          </Card>
        </div>
      </div>

      {dialog === 'donate' && (
        <DonateDialog
          title={f.title}
          currency={f.currency}
          onClose={() => setDialog(null)}
          onDonate={async (amount, message) => {
            const updated = await fundraiserApi.donate(f.id, amount, message);
            fundraiserQuery.setData(() => updated);
            void donationsQuery.reload();
            setNotice(`Thank you for donating ${formatPrice(amount, f.currency)}!`);
          }}
        />
      )}
      {dialog === 'edit' && (
        <FundraiserDialog
          fundraiser={f}
          onClose={() => setDialog(null)}
          onSaved={(updated) => {
            setDialog(null);
            fundraiserQuery.setData(() => updated);
          }}
        />
      )}
    </AppShell>
  );
}

function DonateDialog({
  title,
  currency,
  onClose,
  onDonate,
}: {
  title: string;
  currency: string;
  onClose: () => void;
  onDonate: (amount: number, message?: string) => Promise<void>;
}) {
  const [amount, setAmount] = useState('25');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = Number(amount);

  async function submit() {
    setIsSending(true);
    setError(null);
    try {
      await onDonate(value, message.trim() || undefined);
      onClose();
    } catch (err) {
      setError(toErrorMessage(err, 'Your donation could not be recorded'));
      setIsSending(false);
    }
  }

  return (
    <Modal
      title={`Donate to ${title}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={!(value >= 1) || isSending}>
            {isSending ? 'Donating…' : `Donate ${value >= 1 ? formatPrice(value, currency) : ''}`}
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <div className={styles.rowWrap}>
          {PRESETS.map((preset) => (
            <Button key={preset} variant={value === preset ? 'primary' : 'secondary'} onClick={() => setAmount(String(preset))}>
              {formatPrice(preset, currency)}
            </Button>
          ))}
        </div>
        <Input compact type="number" min="1" label="Other amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <TextArea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a message (optional)"
          aria-label="Message"
          bordered
          rows={2}
          minHeight={54}
        />
        <p className={styles.muted}>This is a demo: no payment is taken and nothing is charged.</p>
        {error && <ErrorNotice message={error} />}
      </div>
    </Modal>
  );
}
