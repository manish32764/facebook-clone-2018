import { classNames } from '@/utils/format';
import styles from './ProfileTab.module.css';

export interface ProfileTabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export function ProfileTab({ label, isActive, onClick }: ProfileTabProps) {
  return (
    <button
      type="button"
      className={classNames(styles.tab, isActive && styles.active)}
      aria-current={isActive ? 'page' : undefined}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
