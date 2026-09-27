import { NavLink } from 'react-router-dom';
import { Badge, Icon, type IconName } from '@atoms/index';
import { classNames } from '@/utils/format';
import styles from './ChromeNavItem.module.css';

export interface ChromeNavItemProps {
  icon: IconName;
  /** Always supplied — used as the accessible name even when only the icon shows. */
  label: string;
  to?: string;
  badgeCount?: number;
  onClick?: () => void;
  isActive?: boolean;
  /** Render as a square icon chip and keep the label for screen readers only. */
  iconOnly?: boolean;
  end?: boolean;
}

/** One entry in the blue top bar — renders as a router link or a plain button. */
export function ChromeNavItem({
  icon,
  label,
  to,
  badgeCount = 0,
  onClick,
  isActive,
  iconOnly = false,
  end = false,
}: ChromeNavItemProps) {
  const content = (
    <>
      <Icon name={icon} size={16} />
      {iconOnly ? (
        <span className="visually-hidden">{label}</span>
      ) : (
        <span className={styles.label}>{label}</span>
      )}
      <Badge count={badgeCount} floating={iconOnly} />
    </>
  );

  if (to) {
    return (
      <NavLink
        to={to}
        end={end}
        title={label}
        className={({ isActive: routeActive }) =>
          classNames(styles.item, iconOnly && styles.iconOnly, (isActive ?? routeActive) && styles.active)
        }
      >
        {content}
      </NavLink>
    );
  }

  return (
    <button
      type="button"
      title={label}
      aria-label={iconOnly ? label : undefined}
      onClick={onClick}
      className={classNames(styles.item, iconOnly && styles.iconOnly, isActive && styles.active)}
    >
      {content}
    </button>
  );
}
