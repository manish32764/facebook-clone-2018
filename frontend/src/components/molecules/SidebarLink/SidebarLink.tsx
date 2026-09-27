import { NavLink } from 'react-router-dom';
import { Avatar, Icon, type IconName } from '@atoms/index';
import { classNames } from '@/utils/format';
import styles from './SidebarLink.module.css';

export interface SidebarLinkProps {
  to: string;
  label: string;
  icon?: IconName;
  avatarUrl?: string | null;
  count?: number;
  end?: boolean;
}

/** Left-rail row: either an icon link (News Feed, Events) or a person row. */
export function SidebarLink({ to, label, icon, avatarUrl, count, end }: SidebarLinkProps) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => classNames(styles.link, isActive && styles.active)}>
      <span className={styles.icon}>
        {icon ? <Icon name={icon} size={18} /> : <Avatar src={avatarUrl} name={label} size="xs" />}
      </span>
      <span className={styles.label}>{label}</span>
      {typeof count === 'number' && count > 0 && <span className={styles.count}>{count}</span>}
    </NavLink>
  );
}
