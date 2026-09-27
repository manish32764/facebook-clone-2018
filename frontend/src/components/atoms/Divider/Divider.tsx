import { classNames } from '@/utils/format';
import styles from './Divider.module.css';

export interface DividerProps {
  label?: string;
  flush?: boolean;
  className?: string;
}

export function Divider({ label, flush = false, className }: DividerProps) {
  if (label) {
    return <div className={classNames(styles.labelled, className)}>{label}</div>;
  }
  return <hr className={classNames(styles.divider, flush && styles.flush, className)} />;
}
