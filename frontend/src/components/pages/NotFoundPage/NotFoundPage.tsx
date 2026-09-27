import { Link } from '@atoms/index';
import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <span className={styles.code}>404</span>
      <span className={styles.title}>This page isn&apos;t available</span>
      <p className={styles.body}>
        The link may be broken, or the page may have been removed. Check to see if the link you are
        trying to open is correct.
      </p>
      <Link to="/" bold>
        Go back to News Feed
      </Link>
    </div>
  );
}
