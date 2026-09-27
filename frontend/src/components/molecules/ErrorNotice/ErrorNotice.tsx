import { Icon } from '@atoms/index';
import styles from './ErrorNotice.module.css';

export interface ErrorNoticeProps {
  message: string;
  onRetry?: () => void;
}

/** The pink error strip Facebook used for form and load failures. */
export function ErrorNotice({ message, onRetry }: ErrorNoticeProps) {
  return (
    <div className={styles.notice} role="alert">
      <Icon name="flag" size={16} className={styles.icon} />
      <div className={styles.body}>
        {message}
        {onRetry && (
          <div>
            <button type="button" className={styles.retry} onClick={onRetry}>
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
