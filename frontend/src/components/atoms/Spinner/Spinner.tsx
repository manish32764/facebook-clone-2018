import { classNames } from '@/utils/format';
import styles from './Spinner.module.css';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function Spinner({ size = 'md', label }: SpinnerProps) {
  return (
    <div className={styles.wrapper} role="status" aria-live="polite">
      <span className={classNames(styles.spinner, size !== 'md' && styles[size])} />
      {label && <span>{label}</span>}
      <span className="visually-hidden">Loading</span>
    </div>
  );
}
