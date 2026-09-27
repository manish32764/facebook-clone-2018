import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppShell } from '@templates/index';
import { Avatar, Button, Card, Icon, Input, Select, Spinner, TextArea } from '@atoms/index';
import { EmptyState, ErrorNotice, Modal, Tabs } from '@molecules/index';
import { useAsync } from '@/hooks/useAsync';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { toErrorMessage } from '@/api/client';
import { jobApi, pageApi } from '@/api/endpoints';
import { classNames, humanizeEnum } from '@/utils/format';
import { JOB_TYPES, jobTypeLabel, salaryLabel } from '@/utils/labels';
import { STATUS_TONE } from './statusTone';
import { timeAgo } from '@/utils/time';
import type { EmploymentType, Job, JobApplication, JobPayload } from '@/types';
import styles from '@/styles/Feature.module.css';

type TabKey = 'browse' | 'applications' | 'posted';

function JobRow({ job }: { job: Job }) {
  const salary = salaryLabel(job);
  return (
    <Link to={`/jobs/${job.id}`} className={classNames(styles.listRow, styles.jobRow)}>
      <Avatar src={job.page?.avatarUrl ?? job.poster.avatarUrl} name={job.company} size="md" />
      <span className={styles.listText}>
        <span className={styles.listName}>{job.title}</span>
        <span className={styles.strong}>{job.company}</span>
        <span className={styles.meta}>
          {job.location ?? 'Location flexible'}
          {job.remote && <span className={classNames(styles.pill, styles.pillGreen)}>Remote</span>}
          <span className={styles.pill}>{jobTypeLabel(job.employmentType)}</span>
          {salary && <span>{salary}</span>}
          <span>&middot; {timeAgo(job.createdAt)}</span>
        </span>
      </span>
      {job.myApplicationStatus && (
        <span className={classNames(styles.pill, STATUS_TONE[job.myApplicationStatus as JobApplication['status']])}>
          {humanizeEnum(job.myApplicationStatus)}
        </span>
      )}
      {job.mine && <span className={classNames(styles.pill, styles.pillBlue)}>{job.applicantCount} applicants</span>}
    </Link>
  );
}

/** Jobs: search openings, track your applications, and post your own. */
export function JobsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('browse');
  const [isPosting, setIsPosting] = useState(false);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [location, setLocation] = useState('');
  const [remote, setRemote] = useState(false);

  const filters = useDebouncedValue(JSON.stringify({ query, type, location, remote }), 300);
  const jobsQuery = useAsync(
    () => jobApi.browse({ q: query || undefined, type: type || undefined, location: location || undefined, remote: remote || undefined }),
    [filters],
  );
  const applicationsQuery = useAsync(() => jobApi.myApplications(), []);
  const postedQuery = useAsync(() => jobApi.mine(), []);

  const jobs = jobsQuery.data ?? [];
  const applications = applicationsQuery.data ?? [];
  const posted = postedQuery.data ?? [];

  return (
    <AppShell layout="wide" title="Jobs">
      <Card
        title="Jobs"
        className={styles.intro}
        action={
          <Button size="sm" onClick={() => setIsPosting(true)}>
            <Icon name="plus" size={12} /> Post a Job
          </Button>
        }
      >
        <p className={styles.blurb}>Find work near you, apply in a couple of taps, and hire from your community.</p>
      </Card>

      <Tabs
        items={[
          { key: 'browse', label: 'Browse Jobs', count: jobs.length },
          { key: 'applications', label: 'Your Applications', count: applications.length },
          { key: 'posted', label: 'Your Job Posts', count: posted.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'browse' && (
        <>
          <Card className={styles.section}>
            <div className={styles.filters}>
              <Input compact label="Search" placeholder="Title, company or keyword" value={query} onChange={(e) => setQuery(e.target.value)} />
              <Select
                compact
                label="Job type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                options={[{ value: '', label: 'Any type' }, ...JOB_TYPES]}
              />
              <Input compact label="Location" placeholder="City" value={location} onChange={(e) => setLocation(e.target.value)} />
              <label className={styles.checkRow}>
                <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} /> Remote only
              </label>
            </div>
          </Card>
          <Card className={styles.section}>
            {jobsQuery.isLoading && jobs.length === 0 ? (
              <Spinner label="Loading jobs" />
            ) : jobs.length === 0 ? (
              <EmptyState icon="briefcase" title="No jobs match" description="Try a wider search." />
            ) : (
              <div className={styles.list}>
                {jobs.map((job) => (
                  <JobRow key={job.id} job={job} />
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {tab === 'applications' && (
        <Card className={styles.section}>
          {applications.length === 0 ? (
            <EmptyState icon="briefcase" title="You have not applied to anything yet" />
          ) : (
            <div className={styles.list}>
              {applications.map((application) => (
                <Link key={application.id} to={`/jobs/${application.job.id}`} className={styles.listRow}>
                  <Avatar src={application.job.page?.avatarUrl ?? application.job.poster.avatarUrl} name={application.job.company} size="md" />
                  <span className={styles.listText}>
                    <span className={styles.listName}>{application.job.title}</span>
                    <span className={styles.muted}>
                      {application.job.company} &middot; applied {timeAgo(application.createdAt)}
                    </span>
                  </span>
                  <span className={classNames(styles.pill, STATUS_TONE[application.status])}>{humanizeEnum(application.status)}</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'posted' && (
        <Card className={styles.section}>
          {posted.length === 0 ? (
            <EmptyState
              icon="briefcase"
              title="You have not posted a job"
              action={<Button onClick={() => setIsPosting(true)}>Post a Job</Button>}
            />
          ) : (
            <div className={styles.list}>
              {posted.map((job) => (
                <JobRow key={job.id} job={job} />
              ))}
            </div>
          )}
        </Card>
      )}

      {isPosting && <JobDialog onClose={() => setIsPosting(false)} onSaved={(job) => navigate(`/jobs/${job.id}`)} />}
    </AppShell>
  );
}

export interface JobDialogProps {
  job?: Job;
  onClose: () => void;
  onSaved: (job: Job) => void;
}

/** Post a job, or edit one of yours. */
export function JobDialog({ job, onClose, onSaved }: JobDialogProps) {
  const pagesQuery = useAsync(() => pageApi.mine(), []);
  const [title, setTitle] = useState(job?.title ?? '');
  const [company, setCompany] = useState(job?.company ?? '');
  const [location, setLocation] = useState(job?.location ?? '');
  const [employmentType, setEmploymentType] = useState<EmploymentType>(job?.employmentType ?? 'FULL_TIME');
  const [remote, setRemote] = useState(job?.remote ?? false);
  const [salaryMin, setSalaryMin] = useState(job?.salaryMin != null ? String(job.salaryMin) : '');
  const [salaryMax, setSalaryMax] = useState(job?.salaryMax != null ? String(job.salaryMax) : '');
  const [description, setDescription] = useState(job?.description ?? '');
  const [pageId, setPageId] = useState(job?.page ? String(job.page.id) : '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setIsSaving(true);
    setError(null);
    const payload: JobPayload = {
      title: title.trim(),
      company: company.trim(),
      location: location.trim() || undefined,
      employmentType,
      remote,
      salaryMin: salaryMin ? Number(salaryMin) : undefined,
      salaryMax: salaryMax ? Number(salaryMax) : undefined,
      description: description.trim() || undefined,
      pageId: pageId ? Number(pageId) : undefined,
      open: job?.open,
    };
    try {
      onSaved(job ? await jobApi.update(job.id, payload) : await jobApi.create(payload));
    } catch (err) {
      setError(toErrorMessage(err, 'The job could not be saved'));
    } finally {
      setIsSaving(false);
    }
  }

  const pages = pagesQuery.data ?? [];

  return (
    <Modal
      title={job ? 'Edit job post' : 'Post a job'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={!title.trim() || !company.trim() || isSaving}>
            {isSaving ? 'Saving…' : job ? 'Save' : 'Post Job'}
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <div className={styles.formRow}>
          <Input compact label="Job title" placeholder="Barista" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input compact label="Company" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <div className={styles.formRow}>
          <Input compact label="Location" placeholder="City" value={location} onChange={(e) => setLocation(e.target.value)} />
          <Select
            compact
            label="Job type"
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
            options={JOB_TYPES}
          />
        </div>
        <div className={styles.formRow}>
          <Input compact type="number" min="0" label="Salary from (USD)" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} />
          <Input compact type="number" min="0" label="Salary to (USD)" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} />
        </div>
        <label className={styles.checkRow}>
          <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} /> This job can be done remotely
        </label>
        {pages.length > 0 && (
          <Select
            compact
            label="Post as"
            value={pageId}
            onChange={(e) => setPageId(e.target.value)}
            options={[{ value: '', label: 'Yourself' }, ...pages.map((p) => ({ value: String(p.id), label: p.name }))]}
          />
        )}
        <TextArea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Responsibilities, requirements, and anything else candidates should know"
          aria-label="Job description"
          bordered
          rows={5}
          minHeight={110}
        />
        {error && <ErrorNotice message={error} />}
      </div>
    </Modal>
  );
}
