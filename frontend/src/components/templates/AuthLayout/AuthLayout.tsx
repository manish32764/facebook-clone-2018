import type { ReactNode } from 'react';
import { Icon, type IconName } from '@atoms/index';
import styles from './AuthLayout.module.css';

export interface AuthLayoutProps {
  headline: string;
  subhead: string;
  children: ReactNode;
}

const POINTS: Array<{ icon: IconName; title: string; body: string }> = [
  { icon: 'home', title: 'A real News Feed', body: 'Posts from you and your friends, newest first.' },
  { icon: 'friends', title: 'Friends and requests', body: 'Send, accept, and see who you have in common.' },
  { icon: 'comment', title: 'Likes and comments', body: 'React and reply, exactly like it worked in 2018.' },
];

/** The signed-out splash: blue banner, pitch on the left, form on the right. */
export function AuthLayout({ headline, subhead, children }: AuthLayoutProps) {
  return (
    <div className={styles.page}>
      <header className={styles.banner}>
        <div className={styles.bannerInner}>
          <span className={styles.wordmark}>facebook</span>
        </div>
      </header>

      <div className={styles.body}>
        <section className={styles.pitch}>
          <h1 className={styles.headline}>{headline}</h1>
          <p className={styles.subhead}>{subhead}</p>

          <ul className={styles.points}>
            {POINTS.map((point) => (
              <li key={point.title} className={styles.point}>
                <span className={styles.pointIcon}>
                  <Icon name={point.icon} size={17} />
                </span>
                <span>
                  <span className={styles.pointTitle}>{point.title}</span>
                  {point.body}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.form}>{children}</section>
      </div>

      <footer className={styles.footer}>
        English (UK) &middot; हिन्दी &middot; Español &middot; Français &middot; Deutsch
        <br />
        Facebook Clone &mdash; a React + Spring Boot learning project. Not affiliated with Meta.
      </footer>
    </div>
  );
}
