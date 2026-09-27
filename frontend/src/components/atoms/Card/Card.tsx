import type { HTMLAttributes, ReactNode } from 'react';
import { classNames } from '@/utils/format';
import styles from './Card.module.css';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Rendered in the card header strip; a node, not just a tooltip string. */
  title?: ReactNode;
  action?: ReactNode;
  padded?: boolean;
  footer?: ReactNode;
}

/** The white bordered box that every 2018 surface was built from. */
export function Card({ title, action, padded = true, footer, className, children, ...rest }: CardProps) {
  return (
    <div className={classNames(styles.card, className)} {...rest}>
      {title && (
        <div className={styles.header}>
          <span className={styles.headerTitle}>{title}</span>
          {action}
        </div>
      )}
      <div className={padded ? styles.body : styles.flush}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
}
