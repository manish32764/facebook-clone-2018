import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { AppShell } from '@templates/index';
import { Avatar, Button, Card, Icon, Spinner, TextArea } from '@atoms/index';
import { EmptyState, ErrorNotice, MenuButton, Modal, Tabs } from '@molecules/index';
import { Feed, FriendPicker, GroupSettingsDialog, PostComposer, ReportDialog } from '@organisms/index';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { usePostCollection } from '@/hooks/usePostCollection';
import { groupApi, postApi } from '@/api/endpoints';
import { pluralize } from '@/utils/format';
import { timeAgo } from '@/utils/time';
import type { GroupMember } from '@/types';
import styles from './GroupPage.module.css';

type TabKey = 'discussion' | 'members' | 'about' | 'requests' | 'pending';
type OpenDialog = 'settings' | 'invite' | 'report' | 'ask' | null;

const ROLE_LABEL: Record<GroupMember['role'], string> = {
  ADMIN: 'Admin',
  MODERATOR: 'Moderator',
  MEMBER: 'Member',
};

/**
 * One group: its cover, its own feed, members with roles, and - for admins and
 * moderators - join requests and posts waiting for approval.
 */
export function GroupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { groupId } = useParams<{ groupId: string }>();
  const [params] = useSearchParams();
  const id = Number(groupId);

  const [tab, setTab] = useState<TabKey>((params.get('tab') as TabKey) ?? 'discussion');
  const [isBusy, setIsBusy] = useState(false);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [answer, setAnswer] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const groupQuery = useAsync(() => groupApi.one(id), [id]);
  const group = groupQuery.data;
  const canRead = Boolean(group && (group.privacy === 'PUBLIC' || group.joined));
  const isModerator = group?.myRole === 'ADMIN' || group?.myRole === 'MODERATOR';
  const isAdmin = group?.myRole === 'ADMIN';

  const membersQuery = useAsync(
    () => (canRead ? groupApi.members(id) : Promise.resolve([])),
    [id, canRead],
  );
  const requestsQuery = useAsync(
    () => (isModerator ? groupApi.requests(id) : Promise.resolve([])),
    [id, isModerator],
  );

  const feedLoader = useCallback(
    (page: number, size: number) => postApi.groupFeed(id, page, size),
    [id],
  );
  const feed = usePostCollection(feedLoader, [id, group?.joined]);

  const pendingLoader = useCallback(
    () => (isModerator ? postApi.groupPending(id) : Promise.resolve([])),
    [id, isModerator],
  );
  const pending = usePostCollection(pendingLoader, [id, isModerator]);

  async function act(action: () => Promise<unknown>, message?: string) {
    setIsBusy(true);
    try {
      await action();
      if (message) setNotice(message);
      await groupQuery.reload();
      void membersQuery.reload();
    } finally {
      setIsBusy(false);
    }
  }

  function join() {
    if (group?.privacy === 'PRIVATE' && !group.invitedBy) {
      setDialog('ask');
      return;
    }
    void act(() => groupApi.join(id));
  }

  async function leave() {
    if (!window.confirm('Leave this group?')) return;
    await act(() => groupApi.leave(id));
  }

  async function setRole(member: GroupMember, role: GroupMember['role']) {
    await act(() => groupApi.setRole(id, member.user.id, role));
  }

  async function removeMember(member: GroupMember) {
    if (!window.confirm(`Remove ${member.user.fullName} from the group?`)) return;
    await act(() => groupApi.removeMember(id, member.user.id));
  }

  async function answerRequest(userId: number, approve: boolean) {
    await groupApi.answerRequest(id, userId, approve);
    void requestsQuery.reload();
    void groupQuery.reload();
    void membersQuery.reload();
  }

  if (!user) return null;

  if (groupQuery.isLoading && !group) {
    return (
      <AppShell layout="wide" title="Group">
        <Spinner label="Loading group" />
      </AppShell>
    );
  }

  if (groupQuery.error || !group) {
    return (
      <AppShell layout="wide" title="Group">
        <ErrorNotice
          message={groupQuery.error ?? 'That group could not be found'}
          onRetry={groupQuery.reload}
        />
      </AppShell>
    );
  }

  const members = membersQuery.data ?? [];
  const requests = requestsQuery.data ?? [];

  const tabs: { key: TabKey; label: string; count?: number }[] = canRead
    ? [
        { key: 'discussion', label: 'Discussion' },
        { key: 'members', label: 'Members', count: members.length },
        { key: 'about', label: 'About' },
      ]
    : [{ key: 'about', label: 'About' }];
  if (isModerator) {
    tabs.push({ key: 'requests', label: 'Member Requests', count: requests.length });
    tabs.push({ key: 'pending', label: 'Pending Posts', count: pending.posts.length });
  }
  const activeTab = tabs.some((t) => t.key === tab) ? tab : tabs[0].key;

  return (
    <AppShell layout="wide" title={group.name}>
      <div className={styles.cover}>
        {group.coverUrl ? (
          <img className={styles.coverImage} src={group.coverUrl} alt="" />
        ) : (
          <span className={styles.coverFallback} />
        )}

        <div className={styles.coverBar}>
          <div className={styles.identity}>
            <span className={styles.name}>{group.name}</span>
            <span className={styles.meta}>
              <Icon name={group.privacy === 'PRIVATE' ? 'lock' : 'globe'} size={12} />
              {group.privacy === 'PRIVATE' ? 'Private group' : 'Public group'}
              <span className={styles.dot}>&middot;</span>
              {pluralize(group.memberCount, 'member')}
              {group.postApproval && (
                <>
                  <span className={styles.dot}>&middot;</span>
                  Posts are approved by admins
                </>
              )}
            </span>
          </div>

          <div className={styles.actions}>
            {group.joined ? (
              <>
                <Button onClick={() => setDialog('invite')}>
                  <Icon name="plus" size={12} /> Invite
                </Button>
                {isAdmin && (
                  <Button variant="secondary" onClick={() => setDialog('settings')}>
                    <Icon name="gear" size={13} /> Settings
                  </Button>
                )}
                <MenuButton
                  bordered
                  trigger={
                    <>
                      <Icon name="check" size={13} /> {group.myRole ? ROLE_LABEL[group.myRole] : 'Joined'}
                    </>
                  }
                  items={[
                    { label: 'Leave group', icon: 'close', onClick: () => void leave(), destructive: true },
                    { label: 'Report group', icon: 'alert', onClick: () => setDialog('report') },
                  ]}
                />
              </>
            ) : group.requestPending ? (
              <Button variant="secondary" disabled={isBusy} onClick={() => void act(() => groupApi.cancelRequest(id))}>
                Cancel Request
              </Button>
            ) : (
              <>
                <Button disabled={isBusy} onClick={join}>
                  {group.privacy === 'PRIVATE' && !group.invitedBy ? 'Request to Join' : 'Join Group'}
                </Button>
                <MenuButton
                  bordered
                  items={[{ label: 'Report group', icon: 'alert', onClick: () => setDialog('report') }]}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {group.invitedBy && !group.joined && (
        <Card className={styles.inviteBanner}>
          <Avatar src={group.invitedBy.avatarUrl} name={group.invitedBy.fullName} size="sm" />
          <span className={styles.inviteText}>
            <strong>{group.invitedBy.fullName}</strong> invited you to join this group.
          </span>
          <Button size="sm" onClick={() => void act(() => groupApi.join(id))}>
            Join
          </Button>
          <Button size="sm" variant="secondary" onClick={() => void act(() => groupApi.declineInvite(id))}>
            Decline
          </Button>
        </Card>
      )}

      {notice && <p className={styles.notice}>{notice}</p>}

      <Tabs items={tabs} active={activeTab} onChange={setTab} />

      <div className={styles.body}>
        {activeTab === 'discussion' && (
          <>
            {group.joined ? (
              <PostComposer
                author={user}
                onCreate={feed.createPost}
                groupId={group.id}
                placeholder={`Write something to ${group.name}...`}
              />
            ) : (
              <Card className={styles.joinPrompt}>
                <p>Join this group to post in it.</p>
              </Card>
            )}

            <Feed
              collection={feed}
              viewer={user}
              emptyTitle="No posts in this group yet"
              emptyDescription="Be the first to start a discussion."
            />
          </>
        )}

        {activeTab === 'members' && (
          <Card title={`Members (${members.length})`}>
            {membersQuery.isLoading && <Spinner size="sm" />}
            {members.length === 0 && !membersQuery.isLoading && (
              <EmptyState icon="users" title="No members to show" />
            )}
            <div className={styles.memberGrid}>
              {members.map((member) => {
                const isSelf = member.user.id === user.id;
                const canManage = !isSelf && (isAdmin || (group.myRole === 'MODERATOR' && member.role === 'MEMBER'));
                return (
                  <div key={member.user.id} className={styles.memberRow}>
                    <Link to={`/profile/${member.user.id}`} className={styles.member}>
                      <Avatar src={member.user.avatarUrl} name={member.user.fullName} size="md" />
                      <span className={styles.memberText}>
                        <span className={styles.memberName}>{member.user.fullName}</span>
                        <span className={styles.memberRole}>
                          {ROLE_LABEL[member.role]} &middot; joined {timeAgo(member.joinedAt)}
                        </span>
                      </span>
                    </Link>
                    {canManage && (
                      <MenuButton
                        label={`Manage ${member.user.firstName}`}
                        items={[
                          { label: 'Make admin', icon: 'star', onClick: () => void setRole(member, 'ADMIN'), hidden: !isAdmin || member.role === 'ADMIN' },
                          { label: 'Make moderator', icon: 'flag', onClick: () => void setRole(member, 'MODERATOR'), hidden: !isAdmin || member.role === 'MODERATOR' },
                          { label: 'Remove as admin/moderator', icon: 'users', onClick: () => void setRole(member, 'MEMBER'), hidden: !isAdmin || member.role === 'MEMBER' },
                          { label: 'Remove from group', icon: 'ban', onClick: () => void removeMember(member), destructive: true, divider: true },
                        ]}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {activeTab === 'about' && (
          <Card title="About this group">
            <p className={styles.about}>{group.description ?? 'No description yet.'}</p>
            <div className={styles.aboutRow}>
              <Icon name={group.privacy === 'PRIVATE' ? 'lock' : 'globe'} size={16} />
              <span>
                <strong>{group.privacy === 'PRIVATE' ? 'Private' : 'Public'}</strong> &mdash;{' '}
                {group.privacy === 'PRIVATE'
                  ? 'only members can see who is in the group and what they post. Joining needs an admin’s approval.'
                  : 'anyone can see who is in the group and what they post.'}
              </span>
            </div>
            <div className={styles.aboutRow}>
              <Icon name="users" size={16} />
              <span>{pluralize(group.memberCount, 'member')}</span>
            </div>
            <div className={styles.aboutRow}>
              <Icon name="flag" size={16} />
              <span>
                Created by <strong>{group.createdBy.fullName}</strong>
              </span>
            </div>
            {group.rules && (
              <div className={styles.rules}>
                <span className={styles.rulesTitle}>Group rules</span>
                <p className={styles.rulesBody}>{group.rules}</p>
              </div>
            )}
          </Card>
        )}

        {activeTab === 'requests' && (
          <Card title={`Member Requests (${requests.length})`}>
            {requests.length === 0 ? (
              <EmptyState icon="users" title="No pending requests" />
            ) : (
              requests.map((request) => (
                <div key={request.id} className={styles.requestRow}>
                  <Avatar src={request.user.avatarUrl} name={request.user.fullName} size="md" />
                  <span className={styles.memberText}>
                    <Link to={`/profile/${request.user.id}`} className={styles.memberName}>
                      {request.user.fullName}
                    </Link>
                    <span className={styles.memberRole}>Requested {timeAgo(request.createdAt)}</span>
                    {request.answer && <span className={styles.answer}>&ldquo;{request.answer}&rdquo;</span>}
                  </span>
                  <Button size="sm" onClick={() => void answerRequest(request.user.id, true)}>
                    Approve
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => void answerRequest(request.user.id, false)}>
                    Decline
                  </Button>
                </div>
              ))
            )}
          </Card>
        )}

        {activeTab === 'pending' && (
          <Feed
            collection={pending}
            viewer={user}
            moderation
            paginate={false}
            emptyTitle="No posts waiting"
            emptyDescription="When post approval is on, new posts from members wait here."
          />
        )}
      </div>

      {dialog === 'settings' && (
        <GroupSettingsDialog
          group={group}
          onClose={() => setDialog(null)}
          onSaved={(updated) => {
            setDialog(null);
            groupQuery.setData(() => updated);
          }}
          onDeleted={() => navigate('/groups')}
        />
      )}

      {dialog === 'invite' && (
        <FriendPicker
          title={`Invite friends to ${group.name}`}
          confirmLabel="Send Invites"
          disabledIds={members.map((m) => m.user.id)}
          disabledNote="Member"
          onClose={() => setDialog(null)}
          onConfirm={async (ids) => {
            const result = await groupApi.invite(id, ids);
            setNotice(`${pluralize(result.sent, 'invite')} sent.`);
          }}
        />
      )}

      {dialog === 'report' && (
        <ReportDialog targetType="GROUP" targetId={group.id} targetName={group.name} onClose={() => setDialog(null)} />
      )}

      {dialog === 'ask' && (
        <AskToJoinDialog
          groupName={group.name}
          answer={answer}
          onAnswer={setAnswer}
          onClose={() => setDialog(null)}
          onSend={async () => {
            await act(() => groupApi.join(id, answer.trim() || undefined), 'Your request was sent to the admins.');
            setDialog(null);
          }}
        />
      )}
    </AppShell>
  );
}

function AskToJoinDialog({
  groupName,
  answer,
  onAnswer,
  onClose,
  onSend,
}: {
  groupName: string;
  answer: string;
  onAnswer: (value: string) => void;
  onClose: () => void;
  onSend: () => Promise<void>;
}) {
  return (
    <Modal
      title={`Join ${groupName}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void onSend()}>Send Request</Button>
        </>
      }
    >
      <p className={styles.about}>This is a private group. An admin will review your request.</p>
      <TextArea
        value={answer}
        onChange={(event) => onAnswer(event.target.value)}
        placeholder="Why do you want to join? (optional)"
        aria-label="Why do you want to join?"
        bordered
        rows={3}
        minHeight={70}
      />
    </Modal>
  );
}
