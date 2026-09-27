import type { User } from '@/types';

export function initials(user: Pick<User, 'firstName' | 'lastName'>): string {
  return `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase();
}

/** "Sarah likes this", "Sarah and 3 others like this" - the 2018 like summary line. */
export function likeSummary(count: number, likedByMe: boolean): string {
  if (count === 0) return '';
  if (likedByMe && count === 1) return 'You like this';
  if (likedByMe) return `You and ${count - 1} ${count - 1 === 1 ? 'other' : 'others'}`;
  return String(count);
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

/** "$245", "$1,250.50", "Free" - Marketplace prices. */
export function formatPrice(price: number, currency = 'USD'): string {
  if (price === 0) return 'Free';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(price);
  } catch {
    return `${currency} ${price}`;
  }
}

/** USED_LIKE_NEW to "Used - like new", the way a listing reads it out. */
export function humanizeEnum(value?: string | null): string {
  if (!value) return '';
  const words = value.toLowerCase().split('_');
  const first = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  return words.length === 1 ? first : `${first} - ${words.slice(1).join(' ')}`;
}

/** "and 2 others" for the tagged-people line in a post header. */
export function joinNames(names: string[], max = 2): string {
  if (names.length === 0) return '';
  if (names.length <= max) {
    return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  }
  const rest = names.length - max;
  return `${names.slice(0, max).join(', ')} and ${rest} ${rest === 1 ? 'other' : 'others'}`;
}
