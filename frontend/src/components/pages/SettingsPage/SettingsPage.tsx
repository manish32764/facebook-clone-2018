import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AppShell } from '@templates/index';
import { Avatar, Button, Card, Input, Spinner, Text } from '@atoms/index';
import { EmptyState, ErrorNotice, Tabs } from '@molecules/index';
import { EditProfileDialog } from '@organisms/index';
import { toErrorMessage } from '@/api/client';
import { socialApi, userApi } from '@/api/endpoints';
import { useAsync } from '@/hooks/useAsync';
import { humanizeEnum } from '@/utils/format';
import { timeAgo } from '@/utils/time';
import { useAuth } from '@/hooks/useAuth';
import { fullTimestamp } from '@/utils/time';
import styles from './SettingsPage.module.css';

type TabKey = 'account' | 'security' | 'blocking' | 'support';

/** Settings &amp; Privacy: account, password, blocking and your support inbox. */
export function SettingsPage() {
  const { user, patchUser } = useAuth();
  const [params] = useSearchParams();
  const [tab, setTab] = useState<TabKey>((params.get('tab') as TabKey) ?? 'account');
  const [isEditing, setIsEditing] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!user) return null;

  async function changePassword() {
    setError(null);
    setNotice(null);

    if (newPassword.length < 6) {
      setError('Pick a new password of at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('The two new passwords do not match');
      return;
    }

    setIsSaving(true);
    try {
      await userApi.changePassword(currentPassword, newPassword);
      setNotice('Your password has been changed.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(toErrorMessage(err, 'Your password could not be changed'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AppShell layout="wide" title="Settings">
      <Card className={styles.intro} title="Settings &amp; Privacy" />

      <Tabs
        items={[
          { key: 'account', label: 'Account' },
          { key: 'security', label: 'Security' },
          { key: 'blocking', label: 'Blocking' },
          { key: 'support', label: 'Support Inbox' },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div className={styles.body}>
        {tab === 'blocking' ? (
          <BlockingPanel />
        ) : tab === 'support' ? (
          <SupportInbox />
        ) : tab === 'account' ? (
          <Card
            title="Your information"
            action={
              <Button size="sm" onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            }
          >
            <dl className={styles.list}>
              <div className={styles.row}>
                <dt>Name</dt>
                <dd>{user.fullName}</dd>
              </div>
              <div className={styles.row}>
                <dt>Email</dt>
                <dd>{user.email ?? '\u2014'}</dd>
              </div>
              <div className={styles.row}>
                <dt>Bio</dt>
                <dd>{user.bio ?? 'Not set'}</dd>
              </div>
              <div className={styles.row}>
                <dt>Work</dt>
                <dd>{user.work ?? 'Not set'}</dd>
              </div>
              <div className={styles.row}>
                <dt>Education</dt>
                <dd>{user.education ?? 'Not set'}</dd>
              </div>
              <div className={styles.row}>
                <dt>Hometown</dt>
                <dd>{user.hometown ?? 'Not set'}</dd>
              </div>
              <div className={styles.row}>
                <dt>Current city</dt>
                <dd>{user.currentCity ?? 'Not set'}</dd>
              </div>
              <div className={styles.row}>
                <dt>Relationship</dt>
                <dd>{user.relationshipStatus ?? 'Not set'}</dd>
              </div>
              <div className={styles.row}>
                <dt>Phone</dt>
                <dd>{user.phone ?? 'Not set'}</dd>
              </div>
              <div className={styles.row}>
                <dt>Website</dt>
                <dd>{user.website ?? 'Not set'}</dd>
              </div>
              <div className={styles.row}>
                <dt>Joined</dt>
                <dd>{user.createdAt ? fullTimestamp(user.createdAt) : '\u2014'}</dd>
              </div>
            </dl>
          </Card>
        ) : (
          <Card title="Change your password">
            <div className={styles.form}>
              <Input
                type="password"
                label="Current password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
              <Input
                type="password"
                label="New password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                hint="At least 6 characters."
              />
              <Input
                type="password"
                label="Confirm new password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />

              {error && <ErrorNotice message={error} />}
              {notice && (
                <Text tone="primary" size="md">
                  {notice}
                </Text>
              )}

              <div>
                <Button disabled={isSaving || !currentPassword} onClick={() => void changePassword()}>
                  {isSaving ? 'Saving…' : 'Change Password'}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {isEditing && (
        <EditProfileDialog
          user={user}
          onClose={() => setIsEditing(false)}
          onSaved={(updated) => patchUser(updated)}
        />
      )}
    </AppShell>
  );
}

function BlockingPanel() {
  const blockedQuery = useAsync(() => socialApi.blocked(), []);
  const blocked = blockedQuery.data ?? [];

  async function unblock(userId: number) {
    await socialApi.unblock(userId);
    void blockedQuery.reload();
  }

  return (
    <Card title="Block users">
      <p className={styles.help}>
        Once you block someone, that person can no longer see things you post on your timeline, tag you, invite you
        to events or groups, start a conversation with you, or add you as a friend. Blocking also unfriends them.
      </p>
      {blockedQuery.isLoading ? (
        <Spinner size="sm" />
      ) : blocked.length === 0 ? (
        <EmptyState icon="ban" title="You have not blocked anyone" />
      ) : (
        <div className={styles.blockList}>
          {blocked.map((row) => (
            <div key={row.user.id} className={styles.blockRow}>
              <Avatar src={row.user.avatarUrl} name={row.user.fullName} size="sm" />
              <span className={styles.blockName}>
                {row.user.fullName}
                <span className={styles.blockMeta}>Blocked {timeAgo(row.blockedAt)}</span>
              </span>
              <Button size="sm" variant="secondary" onClick={() => void unblock(row.user.id)}>
                Unblock
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function SupportInbox() {
  const reportsQuery = useAsync(() => socialApi.myReports(), []);
  const reports = reportsQuery.data ?? [];

  return (
    <Card title="Support Inbox">
      <p className={styles.help}>Reports you have made, and where they stand.</p>
      {reportsQuery.isLoading ? (
        <Spinner size="sm" />
      ) : reports.length === 0 ? (
        <EmptyState icon="alert" title="No reports" description="Use the ... menu on a post, profile or comment to report it." />
      ) : (
        <div className={styles.blockList}>
          {reports.map((report) => (
            <div key={report.id} className={styles.blockRow}>
              <span className={styles.blockName}>
                {report.targetType === 'USER' ? (
                  <Link to={`/profile/${report.targetId}`}>{report.targetLabel}</Link>
                ) : report.targetType === 'POST' ? (
                  <Link to={`/posts/${report.targetId}`}>{report.targetLabel}</Link>
                ) : (
                  report.targetLabel
                )}
                <span className={styles.blockMeta}>
                  {report.reason} &middot; reported {timeAgo(report.createdAt)}
                </span>
                {report.details && <span className={styles.blockMeta}>&ldquo;{report.details}&rdquo;</span>}
              </span>
              <span className={styles.status}>{humanizeEnum(report.status)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
