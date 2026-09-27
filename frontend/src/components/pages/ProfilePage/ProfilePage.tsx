import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '@templates/index';
import { Avatar, Button, Card, Icon, Spinner } from '@atoms/index';
import { EmptyState, FriendTile, type MenuItem } from '@molecules/index';
import {
  AlbumDialog,
  EditProfileDialog,
  Feed,
  Highlights,
  ListMembershipDialog,
  PhotoLightbox,
  PostComposer,
  ProfileCover,
  ReportDialog,
  type ProfileTabKey,
} from '@organisms/index';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { usePostCollection } from '@/hooks/usePostCollection';
import { albumApi, friendApi, postApi, socialApi, userApi } from '@/api/endpoints';
import { pluralize } from '@/utils/format';
import { presenceLabel } from '@/utils/time';
import type { Relationship } from '@/types';
import styles from './ProfilePage.module.css';

type OpenDialog = 'edit' | 'lists' | 'report' | 'album' | null;

export function ProfilePage() {
  const { user: viewer, patchUser } = useAuth();
  const { openWith } = useChat();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const profileId = Number(userId);

  const [activeTab, setActiveTab] = useState<ProfileTabKey>('timeline');
  // Set locally after add/remove so the header updates without a full refetch.
  const [relationshipOverride, setRelationshipOverride] = useState<Relationship | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const profileQuery = useAsync(() => userApi.profile(profileId), [profileId]);
  const friendsQuery = useAsync(() => friendApi.of(profileId), [profileId]);
  const albumsQuery = useAsync(() => albumApi.ofUser(profileId), [profileId]);

  const timelineLoader = useCallback(
    (page: number, size: number) => postApi.timeline(profileId, page, size),
    [profileId],
  );
  const timeline = usePostCollection(timelineLoader, [profileId]);

  const data = profileQuery.data;
  const profile = data?.user;
  const relationship = relationshipOverride ?? data?.relationship ?? 'NONE';
  const isOwnProfile = viewer?.id === profileId;
  const mutual = data?.mutualFriends;

  const photos = useMemo(
    () => timeline.posts.filter((post) => Boolean(post.imageUrl)).map((post) => post.imageUrl as string),
    [timeline.posts],
  );

  async function busy(action: () => Promise<unknown>, reload = true) {
    setIsBusy(true);
    try {
      await action();
      if (reload) {
        setRelationshipOverride(null);
        await profileQuery.reload();
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function handleAddFriend() {
    await busy(() => friendApi.sendRequest(profileId), false);
    setRelationshipOverride('REQUEST_SENT');
    void profileQuery.reload();
  }

  async function handleUnfriend() {
    if (!window.confirm('Remove this person from your friends?')) return;
    await busy(() => friendApi.unfriend(profileId));
    void friendsQuery.reload();
  }

  async function handleBlock() {
    if (!profile) return;
    if (!window.confirm(`Block ${profile.fullName}? They won't be able to see your profile, message you or add you.`)) return;
    await socialApi.block(profileId);
    navigate('/settings?tab=blocking');
  }

  async function handlePoke() {
    if (!profile) return;
    await socialApi.poke(profileId);
    setToast(`You poked ${profile.firstName}.`);
    window.setTimeout(() => setToast(null), 2500);
  }

  if (!viewer) return null;

  if (profileQuery.isLoading && !profile) {
    return (
      <AppShell layout="profile" title="Profile">
        <Spinner label="Loading profile" />
      </AppShell>
    );
  }

  if (profileQuery.error || !profile || !data) {
    return (
      <AppShell layout="profile" title="Profile">
        <Card>
          <EmptyState
            icon="users"
            title="This content isn't available right now"
            description="The person may have blocked you, or the profile no longer exists."
          />
        </Card>
      </AppShell>
    );
  }

  const friends = friendsQuery.data ?? [];
  const albums = albumsQuery.data ?? [];
  const requestId = data.friendRequestId ?? undefined;

  const moreItems: MenuItem[] = isOwnProfile
    ? [
        { label: 'Create album', icon: 'photo', onClick: () => setDialog('album') },
        { label: 'Activity & pokes', icon: 'poke', onClick: () => navigate('/pokes') },
      ]
    : [
        { label: `Poke ${profile.firstName}`, icon: 'poke', onClick: () => void handlePoke() },
        {
          label: 'Edit friend lists',
          icon: 'list',
          onClick: () => setDialog('lists'),
          hidden: relationship !== 'FRIENDS',
        },
        {
          label: data.following ? 'Unfollow' : 'Follow',
          icon: 'bell',
          onClick: () => void busy(() => socialApi.toggleFollow(profileId)),
          hidden: relationship !== 'FRIENDS',
        },
        { label: 'Find support or report profile', icon: 'alert', onClick: () => setDialog('report'), divider: true },
        { label: 'Block', icon: 'ban', onClick: () => void handleBlock(), destructive: true },
      ];

  return (
    <AppShell layout="profile" title={profile.fullName}>
      <ProfileCover
        profile={profile}
        relationship={isOwnProfile ? 'SELF' : relationship}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAddFriend={() => void handleAddFriend()}
        onUnfriend={() => void handleUnfriend()}
        onMessage={() => void openWith(profileId)}
        onEditProfile={() => setDialog('edit')}
        onAcceptRequest={requestId ? () => void busy(() => friendApi.accept(requestId)).then(() => friendsQuery.reload()) : undefined}
        onDeclineRequest={requestId ? () => void busy(() => friendApi.decline(requestId)) : undefined}
        onCancelRequest={requestId ? () => void busy(() => friendApi.cancelRequest(requestId)) : undefined}
        following={data.following}
        followerCount={data.followerCount}
        onToggleFollow={() => void busy(() => socialApi.toggleFollow(profileId))}
        moreItems={moreItems}
        isOnline={data.online ?? false}
        isBusy={isBusy}
      />

      {toast && <div className={styles.toast}>{toast}</div>}

      <div className={styles.columns}>
        <aside className={styles.aside}>
          <Card title="Intro" className={styles.card}>
            {profile.bio && (
              <div className={styles.infoRow}>
                <Icon name="smiley" size={16} className={styles.infoIcon} />
                <span>{profile.bio}</span>
              </div>
            )}
            {profile.work && (
              <div className={styles.infoRow}>
                <Icon name="briefcase" size={16} className={styles.infoIcon} />
                <span>{profile.work}</span>
              </div>
            )}
            {profile.education && (
              <div className={styles.infoRow}>
                <Icon name="bookmark" size={16} className={styles.infoIcon} />
                <span>Studied at {profile.education}</span>
              </div>
            )}
            {profile.hometown && (
              <div className={styles.infoRow}>
                <Icon name="location" size={16} className={styles.infoIcon} />
                <span>From {profile.hometown}</span>
              </div>
            )}
            {profile.currentCity && (
              <div className={styles.infoRow}>
                <Icon name="pin" size={16} className={styles.infoIcon} />
                <span>Lives in {profile.currentCity}</span>
              </div>
            )}
            {profile.relationshipStatus && (
              <div className={styles.infoRow}>
                <Icon name="heart" size={16} className={styles.infoIcon} />
                <span>{profile.relationshipStatus}</span>
              </div>
            )}
            <div className={styles.infoRow}>
              <Icon name="users" size={16} className={styles.infoIcon} />
              <span>{pluralize(friends.length, 'friend')}</span>
            </div>
            <div className={styles.infoRow}>
              <Icon name="bell" size={16} className={styles.infoIcon} />
              <span>
                Followed by {pluralize(data.followerCount, 'person', 'people')}
                {data.followingCount > 0 && ` · Following ${data.followingCount}`}
              </span>
            </div>
            {!isOwnProfile && profile.lastSeenAt && (
              <div className={styles.infoRow}>
                <Icon name="clock" size={16} className={styles.infoIcon} />
                <span>{presenceLabel(profile.lastSeenAt, data.online)}</span>
              </div>
            )}

            {isOwnProfile && (
              <div className={styles.introAction}>
                <Button size="sm" variant="secondary" fullWidth onClick={() => setDialog('edit')}>
                  Edit Details
                </Button>
              </div>
            )}
          </Card>

          <div className={styles.card}>
            <Highlights ownerId={profileId} isOwn={isOwnProfile} />
          </div>

          {/* Mutual friends only make sense on someone else's profile. */}
          {!isOwnProfile && mutual && mutual.total > 0 && (
            <Card title={`Mutual Friends (${mutual.total})`} className={styles.card}>
              <div className={styles.mutualGrid}>
                {mutual.mutual.slice(0, 6).map((person) => (
                  <Link key={person.id} to={`/profile/${person.id}`} className={styles.mutualTile}>
                    <Avatar src={person.avatarUrl} name={person.fullName} size="md" />
                    <span className={styles.mutualName}>{person.firstName}</span>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {photos.length > 0 && (
            <Card title="Photos" className={styles.card}>
              <div className={styles.photoGrid}>
                {photos.slice(0, 9).map((src, index) => (
                  <button
                    key={src}
                    type="button"
                    className={styles.photoButton}
                    onClick={() => setLightboxIndex(index)}
                    aria-label="View photo"
                  >
                    <img className={styles.photo} src={src} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            </Card>
          )}
        </aside>

        <div className={styles.main}>
          {activeTab === 'timeline' && (
            <>
              {isOwnProfile && <PostComposer author={viewer} onCreate={timeline.createPost} />}
              {!isOwnProfile && relationship === 'FRIENDS' && (
                <PostComposer author={viewer} wallOwner={profile} onCreate={timeline.createPost} />
              )}
              <Feed
                collection={timeline}
                viewer={viewer}
                emptyTitle={
                  isOwnProfile ? 'You have not posted yet' : profile.firstName + ' has not posted yet'
                }
                emptyDescription="Timeline posts will appear here."
              />
            </>
          )}

          {activeTab === 'about' && (
            <Card title="About">
              <div className={styles.infoRow}>
                <Icon name="users" size={16} className={styles.infoIcon} />
                <span>{profile.fullName}</span>
              </div>
              {profile.email && (
                <div className={styles.infoRow}>
                  <Icon name="messenger" size={16} className={styles.infoIcon} />
                  <span>{profile.email}</span>
                </div>
              )}
              {profile.phone && (
                <div className={styles.infoRow}>
                  <Icon name="send" size={16} className={styles.infoIcon} />
                  <span>{profile.phone}</span>
                </div>
              )}
              {profile.website && (
                <div className={styles.infoRow}>
                  <Icon name="globe" size={16} className={styles.infoIcon} />
                  <a href={profile.website} target="_blank" rel="noreferrer noopener">
                    {profile.website}
                  </a>
                </div>
              )}
              {profile.birthDate && (
                <div className={styles.infoRow}>
                  <Icon name="calendar" size={16} className={styles.infoIcon} />
                  <span>
                    Born{' '}
                    {new Date(profile.birthDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              )}
              {profile.hometown && (
                <div className={styles.infoRow}>
                  <Icon name="location" size={16} className={styles.infoIcon} />
                  <span>From {profile.hometown}</span>
                </div>
              )}
              {profile.currentCity && (
                <div className={styles.infoRow}>
                  <Icon name="pin" size={16} className={styles.infoIcon} />
                  <span>Lives in {profile.currentCity}</span>
                </div>
              )}
            </Card>
          )}

          {activeTab === 'friends' && (
            <Card title={'Friends (' + friends.length + ')'}>
              {friendsQuery.isLoading && <Spinner size="sm" />}
              {friends.length === 0 && !friendsQuery.isLoading && (
                <EmptyState icon="friends" title="No friends to show yet" />
              )}
              <div className={styles.friendGrid}>
                {friends.map((friend) => (
                  <FriendTile
                    key={friend.user.id}
                    friend={friend}
                    variant="card"
                    onMessage={(id) => void openWith(id)}
                  />
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'photos' && (
            <>
              <Card
                title={`Albums (${albums.length})`}
                className={styles.card}
                action={
                  isOwnProfile ? (
                    <Button size="sm" onClick={() => setDialog('album')}>
                      <Icon name="plus" size={12} /> Create Album
                    </Button>
                  ) : undefined
                }
              >
                {albums.length === 0 ? (
                  <EmptyState icon="photo" title="No albums yet" />
                ) : (
                  <div className={styles.albumGrid}>
                    {albums.map((album) => (
                      <Link key={album.id} to={`/albums/${album.id}`} className={styles.album}>
                        {album.coverUrl ? (
                          <img className={styles.albumCover} src={album.coverUrl} alt="" loading="lazy" />
                        ) : (
                          <span className={styles.albumBlank}>
                            <Icon name="photo" size={28} />
                          </span>
                        )}
                        <span className={styles.albumTitle}>{album.title}</span>
                        <span className={styles.albumCount}>{pluralize(album.photoCount, 'photo')}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>

              <Card title="Timeline Photos">
                {photos.length === 0 ? (
                  <EmptyState
                    icon="photo"
                    title="No photos yet"
                    description="Photos shared in posts show up here."
                  />
                ) : (
                  <div className={styles.photoGrid}>
                    {photos.map((src, index) => (
                      <button
                        key={src}
                        type="button"
                        className={styles.photoButton}
                        onClick={() => setLightboxIndex(index)}
                        aria-label="View photo"
                      >
                        <img className={styles.photo} src={src} alt="" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>

      {dialog === 'edit' && (
        <EditProfileDialog
          user={profile}
          onClose={() => setDialog(null)}
          onSaved={(updated) => {
            patchUser(updated);
            void profileQuery.reload();
          }}
        />
      )}

      {dialog === 'lists' && (
        <ListMembershipDialog person={profile} onClose={() => setDialog(null)} onChanged={() => void profileQuery.reload()} />
      )}

      {dialog === 'report' && (
        <ReportDialog
          targetType="USER"
          targetId={profile.id}
          targetName={profile.fullName}
          blockName={profile.firstName}
          onBlock={() => socialApi.block(profile.id)}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog === 'album' && (
        <AlbumDialog
          onClose={() => setDialog(null)}
          onSaved={(album) => {
            setDialog(null);
            navigate(`/albums/${album.id}`);
          }}
        />
      )}

      {lightboxIndex !== null && (
        <PhotoLightbox
          images={photos}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </AppShell>
  );
}
