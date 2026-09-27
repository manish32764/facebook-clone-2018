import { useState } from 'react';
import { classNames } from '@/utils/format';
import styles from './Avatar.module.css';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  src?: string | null;
  name: string;
  size?: AvatarSize;
  circle?: boolean;
  onClick?: () => void;
  className?: string;
}

/** Falls back to initials when the image is missing or fails to load. */
export function Avatar({ src, name, size = 'md', circle = false, onClick, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  const letters = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');

  return (
    <span
      className={classNames(
        styles.avatar,
        styles[size],
        circle && styles.circle,
        onClick && styles.clickable,
        className,
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      title={name}
    >
      {showImage ? (
        <img className={styles.image} src={src as string} alt={name} onError={() => setFailed(true)} />
      ) : (
        letters
      )}
    </span>
  );
}
