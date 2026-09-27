import { useState } from 'react';
import { Avatar, Badge, Icon, PresenceDot } from '@atoms/index';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { classNames } from '@/utils/format';
import { ChatWindow } from './ChatWindow';
import { PhotoLightbox } from '../PhotoLightbox';
import styles from './ChatDock.module.css';

/**
 * The Messenger dock pinned to the bottom-right of every signed-in page: open
 * chat windows on the left, and the collapsible thread list on the right.
 *
 * It sits inside the app shell rather than inside a page, so a chat you open
 * from a profile stays open while you keep browsing.
 */
export function ChatDock() {
  const { user: viewer } = useAuth();
  const { conversations, windows, totalUnread, openConversation, closeWindow, toggleMinimized, refresh } =
    useChat();
  const [isListOpen, setIsListOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (!viewer) return null;

  const openIds = new Set(windows.map((w) => w.conversationId));

  return (
    <>
      <div className={styles.dock}>
        {windows.map((window) => {
          const conversation = conversations.find((c) => c.id === window.conversationId);
          if (!conversation) return null;

          return (
            <ChatWindow
              key={conversation.id}
              conversation={conversation}
              minimized={window.minimized}
              onToggleMinimized={() => toggleMinimized(conversation.id)}
              onClose={() => closeWindow(conversation.id)}
              onActivity={() => void refresh()}
              onOpenImage={setLightboxUrl}
            />
          );
        })}

        <div className={classNames(styles.list, isListOpen && styles.listOpen)}>
          <button
            type="button"
            className={styles.listHeader}
            onClick={() => setIsListOpen((open) => !open)}
            aria-expanded={isListOpen}
          >
            <Icon name="messenger" size={14} />
            <span className={styles.listTitle}>Chat</span>
            <Badge count={totalUnread} />
            <Icon name={isListOpen ? 'chevronDown' : 'chevronRight'} size={12} />
          </button>

          {isListOpen && (
            <div className={styles.listBody}>
              {conversations.length === 0 ? (
                <p className={styles.listEmpty}>No conversations yet.</p>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className={classNames(
                      styles.listRow,
                      openIds.has(conversation.id) && styles.listRowOpen,
                    )}
                    onClick={() => openConversation(conversation.id)}
                  >
                    <span className={styles.listAvatar}>
                      <Avatar src={conversation.pictureUrl} name={conversation.title} size="xs" circle />
                      <PresenceDot online={conversation.online} size="sm" corner />
                    </span>
                    <span className={styles.listName}>{conversation.title}</span>
                    {conversation.unreadCount > 0 && <span className={styles.listDot} />}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {lightboxUrl && (
        <PhotoLightbox images={[lightboxUrl]} onClose={() => setLightboxUrl(null)} />
      )}
    </>
  );
}
