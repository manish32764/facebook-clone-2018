import { createContext } from 'react';
import type { Conversation } from '@/types';

export interface ChatWindowState {
  conversationId: number;
  minimized: boolean;
}

export interface ChatContextValue {
  /** Every thread you are in, refreshed on a poll. */
  conversations: Conversation[];
  windows: ChatWindowState[];
  totalUnread: number;
  isLoading: boolean;
  /** Opens (or focuses) the direct thread with one person. */
  openWith: (userId: number) => Promise<void>;
  openConversation: (conversationId: number) => void;
  closeWindow: (conversationId: number) => void;
  toggleMinimized: (conversationId: number) => void;
  refresh: () => Promise<void>;
}

/**
 * Lives apart from the provider component so the provider file exports only
 * components, which is what keeps Fast Refresh working during development.
 */
export const ChatContext = createContext<ChatContextValue | undefined>(undefined);
