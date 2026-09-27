import type { ReactNode } from 'react';
import { Icon, type IconName } from '@atoms/index';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = 'users', title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <span className={styles.iconRing}>
        <Icon name={icon} size={34} />
      </span>
      <span className={styles.title}>{title}</span>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
