import { classNames } from '@/utils/format';
import styles from './PresenceDot.module.css';

export interface PresenceDotProps {
  online?: boolean;
  size?: 'sm' | 'md';
  /** Sits the dot in the corner of whatever it is placed inside. */
  corner?: boolean;
  className?: string;
}

/** The green dot beside a name. Renders nothing when the person is offline. */
export function PresenceDot({ online = false, size = 'md', corner = false, className }: PresenceDotProps) {
  if (!online) return null;

  return (
    <span
      className={classNames(styles.dot, styles[size], corner && styles.corner, className)}
      title="Active now"
      aria-label="Active now"
    />
  );
}
