import { classNames } from '@/utils/format';
import styles from './Badge.module.css';

export interface BadgeProps {
  count?: number;
  max?: number;
  dot?: boolean;
  floating?: boolean;
}

export function Badge({ count = 0, max = 99, dot = false, floating = false }: BadgeProps) {
  if (!dot && count <= 0) return null;

  return (
    <span
      className={classNames(styles.badge, dot && styles.dot, floating && styles.floating)}
      aria-label={dot ? 'New activity' : `${count} unread`}
    >
      {!dot && (count > max ? `${max}+` : count)}
    </span>
  );
}
