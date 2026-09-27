import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '@templates/index';
import { Avatar, Button, Card, Icon, Input, Select, Spinner, TextArea } from '@atoms/index';
import { EmptyState, ErrorNotice, MediaUpload, MenuButton, Modal } from '@molecules/index';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { toErrorMessage } from '@/api/client';
import { jobApi } from '@/api/endpoints';
import { classNames, humanizeEnum, pluralize } from '@/utils/format';
import { timeAgo } from '@/utils/time';
import { JobDialog } from './JobsPage';
import { STATUS_TONE } from './statusTone';
import { jobTypeLabel, salaryLabel } from '@/utils/labels';
import type { JobApplication } from '@/types';
import styles from '@/styles/Feature.module.css';

const STATUSES: JobApplication['status'][] = ['SUBMITTED', 'REVIEWED', 'INTERVIEW', 'REJECTED', 'HIRED'];

/** One job: the description, Apply, and - for the poster - the applicants. */
export function JobPage() {
  const { user } = useAuth();
  const { openWith } = useChat();
  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId: string }>();
  const id = Number(jobId);

  const jobQuery = useAsync(() => jobApi.one(id), [id]);
  const job = jobQuery.data;
  const applicantsQuery = useAsync(() => (job?.mine ? jobApi.applicants(id) : Promise.resolve([])), [id, job?.mine]);
  const [dialog, setDialog] = useState<'apply' | 'edit' | null>(null);

  async function setStatus(applicationId: number, status: JobApplication['status']) {
    const updated = await jobApi.setStatus(applicationId, status);
    applicantsQuery.setData((current) => (current ?? []).map((a) => (a.id === updated.id ? updated : a)));
  }

  async function toggleOpen() {
    if (!job) return;
    const updated = await jobApi.update(job.id, {
      title: job.title,
      company: job.company,
      location: job.location ?? undefined,
      employmentType: job.employmentType,
      remote: job.remote,
      salaryMin: job.salaryMin ?? undefined,
      salaryMax: job.salaryMax ?? undefined,
      description: job.description ?? undefined,
      pageId: job.page?.id,
      open: !job.open,
    });
    jobQuery.setData(() => updated);
  }

  async function remove() {
    if (!job || !window.confirm('Delete this job post and its applications?')) return;
    await jobApi.remove(job.id);
    navigate('/jobs');
  }

  if (!user) return null;

  if (jobQuery.isLoading && !job) {
    return (
      <AppShell layout="wide" title="Job">
        <Spinner label="Loading job" />
      </AppShell>
    );
  }

  if (jobQuery.error || !job) {
    return (
      <AppShell layout="wide" title="Job">
        <ErrorNotice message={jobQuery.error ?? 'That job could not be found'} onRetry={jobQuery.reload} />
      </AppShell>
    );
  }

  const salary = salaryLabel(job);
  const applicants = applicantsQuery.data ?? [];

  return (
    <AppShell layout="wide" title={job.title}>
      <Link to="/jobs" className={styles.meta}>
        <Icon name="arrowLeft" size={14} /> All jobs
      </Link>

      <Card className={classNames(styles.section, styles.spaced)}>
        <div className={styles.row}>
          <Avatar src={job.page?.avatarUrl ?? job.poster.avatarUrl} name={job.company} size="lg" />
          <span className={styles.listText}>
            <span className={styles.bigName}>{job.title}</span>
            <span className={styles.strong}>
              {job.page ? <Link to={`/pages/${job.page.id}`}>{job.company}</Link> : job.company}
            </span>
            <span className={styles.meta}>
              {job.location ?? 'Location flexible'}
              {job.remote && <span className={classNames(styles.pill, styles.pillGreen)}>Remote</span>}
              <span className={styles.pill}>{jobTypeLabel(job.employmentType)}</span>
              {salary && <span>{salary}</span>}
              <span>&middot; posted {timeAgo(job.createdAt)}</span>
              {!job.open && <span className={classNames(styles.pill, styles.pillRed)}>No longer accepting applications</span>}
            </span>
          </span>
          <div className={styles.actions}>
            {job.mine ? (
              <>
                <Button variant="secondary" onClick={() => setDialog('edit')}>
                  <Icon name="pencil" size={12} /> Edit
                </Button>
                <MenuButton
                  bordered
                  items={[
                    { label: job.open ? 'Close job' : 'Reopen job', icon: 'clock', onClick: () => void toggleOpen() },
                    { label: 'Delete job', icon: 'trash', destructive: true, onClick: () => void remove() },
                  ]}
                />
              </>
            ) : job.myApplicationStatus ? (
              <span className={classNames(styles.pill, STATUS_TONE[job.myApplicationStatus as JobApplication['status']])}>
                Applied &middot; {humanizeEnum(job.myApplicationStatus)}
              </span>
            ) : (
              <Button disabled={!job.open} onClick={() => setDialog('apply')}>
                Apply Now
              </Button>
            )}
            {!job.mine && (
              <Button variant="secondary" onClick={() => void openWith(job.poster.id)}>
                <Icon name="messenger" size={12} /> Message
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Card title="Job description" className={styles.section}>
        <p className={classNames(styles.blurb, styles.preWrap)}>{job.description ?? 'No description provided.'}</p>
        <div className={classNames(styles.row, styles.spaced)}>
          <Avatar src={job.poster.avatarUrl} name={job.poster.fullName} size="sm" />
          <span className={styles.muted}>
            Posted by <Link to={`/profile/${job.poster.id}`}>{job.poster.fullName}</Link>
          </span>
        </div>
      </Card>

      {job.mine && (
        <Card title={`Applicants (${applicants.length})`} className={styles.section}>
          {applicants.length === 0 ? (
            <EmptyState icon="users" title="No applicants yet" />
          ) : (
            <div className={styles.list}>
              {applicants.map((application) => (
                <div key={application.id} className={styles.listRow}>
                  <Avatar src={application.applicant.avatarUrl} name={application.applicant.fullName} size="md" />
                  <span className={styles.listText}>
                    <Link to={`/profile/${application.applicant.id}`} className={styles.listName}>
                      {application.applicant.fullName}
                    </Link>
                    <span className={styles.muted}>
                      Applied {timeAgo(application.createdAt)}
                      {application.email && ` · ${application.email}`}
                      {application.phone && ` · ${application.phone}`}
                    </span>
                    {application.message && <span className={styles.blurb}>&ldquo;{application.message}&rdquo;</span>}
                    {application.resumeUrl && (
                      <a href={application.resumeUrl} target="_blank" rel="noreferrer noopener">
                        <Icon name="upload" size={12} /> View résumé
                      </a>
                    )}
                  </span>
                  <Select
                    compact
                    aria-label="Application status"
                    value={application.status}
                    onChange={(e) => void setStatus(application.id, e.target.value as JobApplication['status'])}
                    options={STATUSES.map((s) => ({ value: s, label: humanizeEnum(s) }))}
                  />
                  <Button size="sm" variant="secondary" onClick={() => void openWith(application.applicant.id)}>
                    Message
                  </Button>
                </div>
              ))}
            </div>
          )}
          <p className={classNames(styles.muted, styles.spaced)}>
            {pluralize(applicants.length, 'applicant')} &middot; applicants are notified when you change their status.
          </p>
        </Card>
      )}

      {dialog === 'apply' && (
        <ApplyDialog
          jobTitle={job.title}
          defaultEmail={user.email ?? ''}
          onClose={() => setDialog(null)}
          onApply={async (payload) => {
            const updated = await jobApi.apply(job.id, payload);
            jobQuery.setData(() => updated);
            setDialog(null);
          }}
        />
      )}
      {dialog === 'edit' && (
        <JobDialog
          job={job}
          onClose={() => setDialog(null)}
          onSaved={(updated) => {
            setDialog(null);
            jobQuery.setData(() => updated);
          }}
        />
      )}
    </AppShell>
  );
}

function ApplyDialog({
  jobTitle,
  defaultEmail,
  onClose,
  onApply,
}: {
  jobTitle: string;
  defaultEmail: string;
  onClose: () => void;
  onApply: (payload: { message?: string; email?: string; phone?: string; resumeUrl?: string }) => Promise<void>;
}) {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setIsSending(true);
    setError(null);
    try {
      await onApply({
        message: message.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        resumeUrl: resumeUrl || undefined,
      });
    } catch (err) {
      setError(toErrorMessage(err, 'Your application could not be sent'));
      setIsSending(false);
    }
  }

  return (
    <Modal
      title={`Apply for ${jobTitle}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={isSending}>
            {isSending ? 'Sending…' : 'Submit Application'}
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <div className={styles.formRow}>
          <Input compact type="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input compact label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <TextArea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Why are you a good fit?"
          aria-label="Cover message"
          bordered
          rows={4}
          minHeight={90}
        />
        <div className={styles.row}>
          <MediaUpload accept="application/pdf,image/*" label="Attach résumé (PDF)" onUploaded={(url) => setResumeUrl(url)} />
          {resumeUrl && <span className={classNames(styles.pill, styles.pillGreen)}>Résumé attached</span>}
        </div>
        {error && <ErrorNotice message={error} />}
      </div>
    </Modal>
  );
}
