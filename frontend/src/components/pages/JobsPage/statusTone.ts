import type { JobApplication } from '@/types';
import styles from '@/styles/Feature.module.css';

/** Pill colour for each application status. */
export const STATUS_TONE: Record<JobApplication['status'], string> = {
  SUBMITTED: styles.pillBlue,
  REVIEWED: styles.pill,
  INTERVIEW: styles.pillWarn,
  REJECTED: styles.pillRed,
  HIRED: styles.pillGreen,
};
