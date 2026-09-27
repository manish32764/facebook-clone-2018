import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { messageApi } from '@/api/endpoints';
import { usePolling } from '@/hooks/usePolling';
import { useAuth } from '@/hooks/useAuth';
import { ChatContext, type ChatContextValue, type ChatWindowState } from './chat-context';
import type { Conversation } from '@/types';

/** Three windows is what fits across the bottom of a 1280px screen. */
const MAX_OPEN_WINDOWS = 3;

const POLL_MS = 8_000;

/**
 * Owns the Messenger dock: which chat windows are open, and the thread list they
 * read from. It sits above the router so a Message button on any page - a
 * profile, a Marketplace listing, the contacts rail - can open a chat head
 * without that page knowing anything about Messenger.
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [windows, setWindows] = useState<ChatWindowState[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setConversations(await messageApi.conversations());
    } catch {
      /* a failed poll is not worth surfacing */
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  usePolling(() => void refresh(), POLL_MS, isAuthenticated);

  const openConversation = useCallback((conversationId: number) => {
    setWindows((current) => {
      const existing = current.find((w) => w.conversationId === conversationId);
      if (existing) {
        // Already open: un-minimise rather than stacking a second window.
        return current.map((w) =>
          w.conversationId === conversationId ? { ...w, minimized: false } : w,
        );
      }
      const next = [...current, { conversationId, minimized: false }];
      return next.slice(Math.max(0, next.length - MAX_OPEN_WINDOWS));
    });
  }, []);

  const openWith = useCallback(
    async (userId: number) => {
      const conversation = await messageApi.openWith(userId);
      setConversations((current) =>
        current.some((c) => c.id === conversation.id) ? current : [conversation, ...current],
      );
      openConversation(conversation.id);
      void refresh();
    },
    [openConversation, refresh],
  );

  const closeWindow = useCallback((conversationId: number) => {
    setWindows((current) => current.filter((w) => w.conversationId !== conversationId));
  }, []);

  const toggleMinimized = useCallback((conversationId: number) => {
    setWindows((current) =>
      current.map((w) =>
        w.conversationId === conversationId ? { ...w, minimized: !w.minimized } : w,
      ),
    );
  }, []);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [conversations],
  );

  const value = useMemo<ChatContextValue>(
    () => ({
      conversations,
      windows,
      totalUnread,
      isLoading,
      openWith,
      openConversation,
      closeWindow,
      toggleMinimized,
      refresh,
    }),
    [conversations, windows, totalUnread, isLoading, openWith, openConversation, closeWindow, toggleMinimized, refresh],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
