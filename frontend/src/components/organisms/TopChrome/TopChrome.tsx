import { useRef, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Avatar, Icon } from '@atoms/index';
import { ChromeNavItem, SearchBar } from '@molecules/index';
import { useAuth } from '@/hooks/useAuth';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { MessagesDropdown } from '../MessagesDropdown';
import { NotificationsDropdown } from '../NotificationsDropdown';
import styles from './TopChrome.module.css';

export interface TopChromeProps {
  pendingRequestCount?: number;
  messageCount?: number;
  notificationCount?: number;
  /** Lets a badge drop the moment its panel is read. */
  onCountsChanged?: () => void;
}

type OpenPanel = 'account' | 'messages' | 'notifications' | null;

/** The fixed blue bar: logo, search, primary nav, and the utility panels. */
export function TopChrome({
  pendingRequestCount = 0,
  messageCount = 0,
  notificationCount = 0,
  onCountsChanged,
}: TopChromeProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<OpenPanel>(null);
  const utilityRef = useRef<HTMLDivElement>(null);

  // One outside-click handler for all three panels: only one is ever open.
  useOnClickOutside(utilityRef, () => setPanel(null), panel !== null);

  if (!user) return null;

  function toggle(next: Exclude<OpenPanel, null>) {
    setPanel((current) => (current === next ? null : next));
  }

  function handleLogout() {
    setPanel(null);
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className={styles.chrome}>
      <div className={styles.inner}>
        <RouterLink to="/" className={styles.logo} aria-label="Facebook home">
          f
        </RouterLink>

        <div className={styles.search}>
          <SearchBar />
        </div>

        <div className={styles.primary}>
          <RouterLink to={`/profile/${user.id}`} className={styles.identity}>
            <Avatar src={user.avatarUrl} name={user.fullName} size="xs" />
            <span className={styles.identityName}>{user.firstName}</span>
          </RouterLink>

          <ChromeNavItem icon="home" label="Home" to="/" end />
        </div>

        <span className={styles.spacer} />

        <div className={styles.utility} ref={utilityRef}>
          <ChromeNavItem
            icon="friends"
            label="Friend requests"
            iconOnly
            to="/friends"
            badgeCount={pendingRequestCount}
          />

          <div className={styles.panelHost}>
            <ChromeNavItem
              icon="messenger"
              label="Messages"
              iconOnly
              badgeCount={messageCount}
              isActive={panel === 'messages'}
              onClick={() => toggle('messages')}
            />
            {panel === 'messages' && <MessagesDropdown onClose={() => setPanel(null)} />}
          </div>

          <div className={styles.panelHost}>
            <ChromeNavItem
              icon="bell"
              label="Notifications"
              iconOnly
              badgeCount={notificationCount}
              isActive={panel === 'notifications'}
              onClick={() => toggle('notifications')}
            />
            {panel === 'notifications' && (
              <NotificationsDropdown
                onClose={() => setPanel(null)}
                onCountsChanged={() => onCountsChanged?.()}
              />
            )}
          </div>

          <span className={styles.rule} />

          <div className={styles.panelHost}>
            <ChromeNavItem
              icon="chevronDown"
              label="Account"
              iconOnly
              isActive={panel === 'account'}
              onClick={() => toggle('account')}
            />

            {panel === 'account' && (
              <div className={styles.dropdown} role="menu">
                <RouterLink
                  to={`/profile/${user.id}`}
                  className={`${styles.dropdownItem} ${styles.dropdownIdentity}`}
                  onClick={() => setPanel(null)}
                >
                  <Avatar src={user.avatarUrl} name={user.fullName} size="md" />
                  <span>
                    <span className={styles.dropdownName}>{user.fullName}</span>
                    <span className={styles.dropdownSub}>See your profile</span>
                  </span>
                </RouterLink>

                <div className={styles.dropdownDivider} />

                <RouterLink to="/friends" className={styles.dropdownItem} onClick={() => setPanel(null)}>
                  <Icon name="users" size={16} /> Friends
                </RouterLink>
                <RouterLink to="/groups" className={styles.dropdownItem} onClick={() => setPanel(null)}>
                  <Icon name="users" size={16} /> Groups
                </RouterLink>
                <RouterLink to="/pages" className={styles.dropdownItem} onClick={() => setPanel(null)}>
                  <Icon name="flag" size={16} /> Pages
                </RouterLink>
                <RouterLink to="/saved" className={styles.dropdownItem} onClick={() => setPanel(null)}>
                  <Icon name="bookmark" size={16} /> Saved
                </RouterLink>
                <RouterLink to="/ads" className={styles.dropdownItem} onClick={() => setPanel(null)}>
                  <Icon name="megaphone" size={16} /> Ads Manager
                </RouterLink>
                <RouterLink to="/memories" className={styles.dropdownItem} onClick={() => setPanel(null)}>
                  <Icon name="clock" size={16} /> Memories
                </RouterLink>
                <RouterLink to="/settings" className={styles.dropdownItem} onClick={() => setPanel(null)}>
                  <Icon name="gear" size={16} /> Settings &amp; Privacy
                </RouterLink>

                <div className={styles.dropdownDivider} />

                <button type="button" className={styles.dropdownItem} role="menuitem" onClick={handleLogout}>
                  <Icon name="close" size={16} /> Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
