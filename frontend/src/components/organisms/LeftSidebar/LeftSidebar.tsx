import { SidebarLink } from '@molecules/index';
import { useAuth } from '@/hooks/useAuth';
import type { Friend } from '@/types';
import styles from './LeftSidebar.module.css';

export interface LeftSidebarProps {
  friends: Friend[];
  friendRequestCount: number;
}

/** The left rail: your identity, the shortcut groups, and a slice of your friends. */
export function LeftSidebar({ friends, friendRequestCount }: LeftSidebarProps) {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <aside className={styles.sidebar} aria-label="Shortcuts">
      <div className={styles.group}>
        <SidebarLink to={`/profile/${user.id}`} label={user.fullName} avatarUrl={user.avatarUrl} />
      </div>

      <div className={styles.group}>
        <span className={styles.groupTitle}>Favourites</span>
        <SidebarLink to="/" label="News Feed" icon="home" end />
        <SidebarLink to="/friends" label="Friends" icon="friends" count={friendRequestCount} />
        <SidebarLink to="/messages" label="Messenger" icon="messenger" />
        <SidebarLink to="/watch" label="Watch" icon="play" />
        <SidebarLink to="/marketplace" label="Marketplace" icon="store" />
      </div>

      <div className={styles.group}>
        <span className={styles.groupTitle}>Explore</span>
        <SidebarLink to="/events" label="Events" icon="calendar" />
        <SidebarLink to="/groups" label="Groups" icon="users" />
        <SidebarLink to="/pages" label="Pages" icon="flag" />
        <SidebarLink to="/saved" label="Saved" icon="bookmark" />
        <SidebarLink to="/memories" label="Memories" icon="clock" />
        <SidebarLink to="/fundraisers" label="Fundraisers" icon="money" />
        <SidebarLink to="/gaming" label="Gaming" icon="gamepad" />
        <SidebarLink to="/jobs" label="Jobs" icon="briefcase" />
        <SidebarLink to="/dating" label="Dating" icon="heart" />
        <SidebarLink to="/pokes" label="Pokes" icon="poke" />
        <SidebarLink to="/ads" label="Ads Manager" icon="megaphone" />
      </div>

      {friends.length > 0 && (
        <div className={`${styles.group} ${styles.friendsGroup}`}>
          <span className={styles.groupTitle}>Friends</span>
          {friends.slice(0, 6).map(({ user: friend }) => (
            <SidebarLink
              key={friend.id}
              to={`/profile/${friend.id}`}
              label={friend.fullName}
              avatarUrl={friend.avatarUrl}
            />
          ))}
        </div>
      )}

      <div className={styles.footer}>
        Privacy &middot; Terms &middot; Advertising &middot; Cookies &middot; More
        <span className={styles.copyright}>Facebook Clone &copy; {new Date().getFullYear()}</span>
      </div>
    </aside>
  );
}
