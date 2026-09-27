import { Avatar, Button, Icon, PresenceDot } from '@atoms/index';
import { MenuButton, ProfileTab, type MenuItem } from '@molecules/index';
import { pluralize } from '@/utils/format';
import type { Relationship, User } from '@/types';
import styles from './ProfileCover.module.css';

export type ProfileTabKey = 'timeline' | 'about' | 'friends' | 'photos';

export interface ProfileCoverProps {
  profile: User;
  relationship: Relationship;
  activeTab: ProfileTabKey;
  onTabChange: (tab: ProfileTabKey) => void;
  onAddFriend: () => void;
  onUnfriend: () => void;
  onMessage: () => void;
  /** Own profile only: opens the edit dialog from the cover. */
  onEditProfile?: () => void;
  /** Answer or withdraw a pending request right from the cover. */
  onAcceptRequest?: () => void;
  onDeclineRequest?: () => void;
  onCancelRequest?: () => void;
  following?: boolean;
  followerCount?: number;
  onToggleFollow?: () => void;
  /** Items for the "..." menu: poke, lists, block, report. */
  moreItems?: MenuItem[];
  isOnline?: boolean;
  isBusy?: boolean;
}

const TABS: Array<{ key: ProfileTabKey; label: string }> = [
  { key: 'timeline', label: 'Timeline' },
  { key: 'about', label: 'About' },
  { key: 'friends', label: 'Friends' },
  { key: 'photos', label: 'Photos' },
];

export function ProfileCover({
  profile,
  relationship,
  activeTab,
  onTabChange,
  onAddFriend,
  onUnfriend,
  onMessage,
  onEditProfile,
  onAcceptRequest,
  onDeclineRequest,
  onCancelRequest,
  following = false,
  followerCount = 0,
  onToggleFollow,
  moreItems = [],
  isOnline = false,
  isBusy,
}: ProfileCoverProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.cover}>
        {profile.coverUrl && <img className={styles.coverImage} src={profile.coverUrl} alt="" />}
        <div className={styles.coverScrim} />

        <div className={styles.nameBlock}>
          <span className={styles.name}>{profile.fullName}</span>
          {profile.bio && <span className={styles.tagline}>{profile.bio}</span>}
          {followerCount > 0 && (
            <span className={styles.tagline}>{pluralize(followerCount, 'follower')}</span>
          )}
        </div>

        <div className={styles.actions}>
          {relationship === 'NONE' && (
            <Button leadingIcon={<Icon name="plus" size={14} />} disabled={isBusy} onClick={onAddFriend}>
              Add Friend
            </Button>
          )}
          {relationship === 'REQUEST_SENT' && (
            <Button variant="secondary" disabled={isBusy} onClick={onCancelRequest}>
              Cancel Request
            </Button>
          )}
          {relationship === 'REQUEST_RECEIVED' && (
            <>
              <Button disabled={isBusy} onClick={onAcceptRequest}>
                Confirm Request
              </Button>
              <Button variant="secondary" disabled={isBusy} onClick={onDeclineRequest}>
                Delete Request
              </Button>
            </>
          )}
          {relationship === 'FRIENDS' && (
            <Button
              variant="secondary"
              leadingIcon={<Icon name="check" size={14} />}
              disabled={isBusy}
              onClick={onUnfriend}
              title="Unfriend"
            >
              Friends
            </Button>
          )}
          {relationship !== 'SELF' && relationship !== 'FRIENDS' && onToggleFollow && (
            <Button
              variant="secondary"
              leadingIcon={<Icon name={following ? 'check' : 'bell'} size={14} />}
              disabled={isBusy}
              onClick={onToggleFollow}
            >
              {following ? 'Following' : 'Follow'}
            </Button>
          )}
          {relationship !== 'SELF' && (
            <Button
              variant="secondary"
              leadingIcon={<Icon name="messenger" size={14} />}
              onClick={onMessage}
            >
              Message
            </Button>
          )}
          {relationship === 'SELF' && onEditProfile && (
            <Button
              variant="secondary"
              leadingIcon={<Icon name="pencil" size={14} />}
              onClick={onEditProfile}
            >
              Edit Profile
            </Button>
          )}
          {moreItems.length > 0 && <MenuButton items={moreItems} bordered label="More" />}
        </div>
      </div>

      <div className={styles.avatarSlot}>
        <Avatar src={profile.avatarUrl} name={profile.fullName} size="xl" />
        <PresenceDot online={isOnline} className={styles.presence} />
      </div>

      <nav className={styles.tabs} aria-label="Profile sections">
        {TABS.map((tab) => (
          <ProfileTab
            key={tab.key}
            label={tab.label}
            isActive={activeTab === tab.key}
            onClick={() => onTabChange(tab.key)}
          />
        ))}
        <span className={styles.tabsSpacer} />
      </nav>
    </div>
  );
}
