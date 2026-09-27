import type { IconName } from '@/components/atoms/Icon';
import type { EmploymentType, Fundraiser, Job, ListingCondition, Privacy, StoryOverlay } from '@/types';
import { formatPrice, humanizeEnum } from './format';

/** Shared display labels, kept out of component files so fast refresh keeps working. */

export const PRIVACY_ICON: Record<Privacy, IconName> = {
  PUBLIC: 'globe',
  FRIENDS: 'friends',
  FRIENDS_EXCEPT: 'friends',
  SPECIFIC: 'users',
  CLOSE_FRIENDS: 'star',
  ONLY_ME: 'lock',
};

export const PRIVACY_LABEL: Record<Privacy, string> = {
  PUBLIC: 'Public',
  FRIENDS: 'Friends',
  FRIENDS_EXCEPT: 'Friends except...',
  SPECIFIC: 'Specific friends',
  CLOSE_FRIENDS: 'Close Friends',
  ONLY_ME: 'Only me',
};

export const CONDITIONS: { value: ListingCondition; label: string }[] = [
  { value: 'NEW', label: 'New' },
  { value: 'USED_LIKE_NEW', label: 'Used - like new' },
  { value: 'USED_GOOD', label: 'Used - good' },
  { value: 'USED_FAIR', label: 'Used - fair' },
];

export const JOB_TYPES: { value: EmploymentType; label: string }[] = [
  { value: 'FULL_TIME', label: 'Full-time' },
  { value: 'PART_TIME', label: 'Part-time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'VOLUNTEER', label: 'Volunteer' },
];

export function jobTypeLabel(type: string): string {
  return JOB_TYPES.find((t) => t.value === type)?.label ?? humanizeEnum(type);
}

export function salaryLabel(job: Job): string | null {
  if (job.salaryMin == null && job.salaryMax == null) return null;
  const min = job.salaryMin != null ? formatPrice(Number(job.salaryMin), job.currency) : null;
  const max = job.salaryMax != null ? formatPrice(Number(job.salaryMax), job.currency) : null;
  return min && max ? `${min} - ${max}` : (min ?? max);
}

/** How far a fundraiser is towards its goal, 0-100. */
export function fundraiserProgress(f: Fundraiser): number {
  return Math.min(100, Math.round((Number(f.raised) / Number(f.goal)) * 100));
}

export function parseOverlays(raw?: string | null): StoryOverlay[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoryOverlay[]) : [];
  } catch {
    return [];
  }
}
