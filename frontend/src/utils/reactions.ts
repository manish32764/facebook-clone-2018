import type { ReactionName } from '@/types';

export interface ReactionMeta {
  name: ReactionName;
  label: string;
  emoji: string;
  /** Colour of the verb under a post once you have picked this reaction. */
  color: string;
}

/**
 * The six reactions in picker order. Emoji stand in for Facebook's animated
 * sprites, which keeps the app free of image assets while reading the same.
 */
export const REACTIONS: ReactionMeta[] = [
  { name: 'LIKE', label: 'Like', emoji: '\u{1F44D}', color: '#4267b2' },
  { name: 'LOVE', label: 'Love', emoji: '\u2764\uFE0F', color: '#f3425f' },
  { name: 'HAHA', label: 'Haha', emoji: '\u{1F606}', color: '#f7b125' },
  { name: 'WOW', label: 'Wow', emoji: '\u{1F62E}', color: '#f7b125' },
  { name: 'SAD', label: 'Sad', emoji: '\u{1F622}', color: '#f7b125' },
  { name: 'ANGRY', label: 'Angry', emoji: '\u{1F621}', color: '#e9710f' },
];

const BY_NAME = new Map(REACTIONS.map((reaction) => [reaction.name, reaction]));

export function reactionMeta(name?: ReactionName | null): ReactionMeta {
  return (name && BY_NAME.get(name)) || REACTIONS[0];
}

/** "You and 3 others", "Sarah Connor and 12 others" - the 2018 summary line. */
export function reactionSummaryText(total: number, mine?: ReactionName | null): string {
  if (total === 0) return '';
  if (mine && total === 1) return 'You';
  if (mine) return `You and ${total - 1} ${total - 1 === 1 ? 'other' : 'others'}`;
  return String(total);
}
