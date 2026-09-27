import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Icon, PresenceDot, Spinner } from '@atoms/index';
import { MessageBubble } from '@molecules/index';
import { messageApi } from '@/api/endpoints';
import { usePolling } from '@/hooks/usePolling';
import { useAuth } from '@/hooks/useAuth';
import { classNames } from '@/utils/format';
import { dayLabel, presenceLabel } from '@/utils/time';
import type { Conversation, Message, User } from '@/types';
import styles from './ChatDock.module.css';

export interface ChatWindowProps {
  conversation: Conversation;
  minimized: boolean;
  onToggleMinimized: () => void;
  onClose: () => void;
  onActivity: () => void;
  onOpenImage: (url: string) => void;
}

/** An open window polls hard; the thread list behind it polls slowly. */
const POLL_MS = 3_000;

/** One ping every few seconds is enough to hold the other side's indicator open. */
const TYPING_PING_MS = 3_000;

export function ChatWindow({
  conversation,
  minimized,
  onToggleMinimized,
  onClose,
  onActivity,
  onOpenImage,
}: ChatWindowProps) {
  const { user: viewer } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState<User[]>([]);
  const [draft, setDraft] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const typingSentAt = useRef(0);

  const load = useCallback(async () => {
    try {
      const [thread, typingState] = await Promise.all([
        messageApi.thread(conversation.id, 0, 40),
        messageApi.typingState(conversation.id),
      ]);
      setMessages(thread.messages);
      setTyping(typingState.typing);
    } catch {
      /* the next poll will try again */
    } finally {
      setIsLoading(false);
    }
  }, [conversation.id]);

  // Opening a window reads the thread, which is what clears its unread badge.
  useEffect(() => {
    void load();
    if (!minimized) {
      void messageApi
        .markRead(conversation.id)
        .then(onActivity)
        .catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, minimized]);

  usePolling(() => void load(), POLL_MS, !minimized);

  // Stick to the bottom as new messages land, the way a chat window should.
  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages.length, typing.length, minimized]);

  function noteTyping() {
    const now = Date.now();
    if (now - typingSentAt.current < TYPING_PING_MS) return;
    typingSentAt.current = now;
    void messageApi.setTyping(conversation.id, true).catch(() => undefined);
  }

  async function send(content: string, type?: string) {
    const trimmed = content.trim();
    if ((!trimmed && type !== 'STICKER') || isSending) return;

    setIsSending(true);
    try {
      const created = await messageApi.send(conversation.id, trimmed, undefined, type);
      setMessages((current) => [...current, created]);
      setDraft('');
      onActivity();
    } finally {
      setIsSending(false);
    }
  }

  function replaceMessage(updated: Message) {
    setMessages((current) => current.map((m) => (m.id === updated.id ? updated : m)));
  }

  if (!viewer) return null;

  const other = conversation.otherUser;
  const subtitle =
    conversation.type === 'GROUP'
      ? `${conversation.participants.length} people`
      : presenceLabel(other?.lastSeenAt, conversation.online);

  return (
    <section className={classNames(styles.window, minimized && styles.windowMinimized)}>
      <header className={styles.header}>
        <button type="button" className={styles.headerMain} onClick={onToggleMinimized}>
          <span className={styles.headerAvatar}>
            <Avatar src={conversation.pictureUrl} name={conversation.title} size="xs" circle />
            <PresenceDot online={conversation.online} size="sm" corner />
          </span>
          <span className={styles.headerText}>
            <span className={styles.headerTitle}>{conversation.title}</span>
            {subtitle && <span className={styles.headerSub}>{subtitle}</span>}
          </span>
          {conversation.unreadCount > 0 && minimized && (
            <span className={styles.headerBadge}>{conversation.unreadCount}</span>
          )}
        </button>

        <div className={styles.headerTools}>
          <Link
            to={`/messages/${conversation.id}`}
            className={styles.headerTool}
            title="Open in Messenger"
          >
            <Icon name="share" size={12} />
          </Link>
          <button
            type="button"
            className={styles.headerTool}
            onClick={onToggleMinimized}
            aria-label={minimized ? 'Expand chat' : 'Minimise chat'}
          >
            <Icon name={minimized ? 'chevronDown' : 'minus'} size={12} />
          </button>
          <button type="button" className={styles.headerTool} onClick={onClose} aria-label="Close chat">
            <Icon name="close" size={12} />
          </button>
        </div>
      </header>

      {!minimized && (
        <>
          <div className={styles.scroll} ref={scrollRef}>
            {isLoading && messages.length === 0 ? (
              <Spinner size="sm" />
            ) : messages.length === 0 ? (
              <p className={styles.blank}>Say hello to {conversation.title.split(' ')[0]}.</p>
            ) : (
              messages.map((message, index) => {
                const previous = messages[index - 1];
                const sameSender = previous?.sender.id === message.sender.id;
                const newDay =
                  !previous || dayLabel(previous.createdAt) !== dayLabel(message.createdAt);

                return (
                  <div key={message.id}>
                    {newDay && (
                      <div className={styles.dayDivider}>{dayLabel(message.createdAt)}</div>
                    )}
                    <MessageBubble
                      message={message}
                      viewer={viewer}
                      showAvatar={!sameSender || newDay}
                      showSender={conversation.type === 'GROUP' && (!sameSender || newDay)}
                      onReact={(id, emoji) => {
                        void messageApi.react(id, emoji).then(replaceMessage).catch(() => undefined);
                      }}
                      onUnsend={(id) => {
                        void messageApi.unsend(id).then(load).catch(() => undefined);
                      }}
                      onOpenImage={onOpenImage}
                    />
                  </div>
                );
              })
            )}

            {typing.length > 0 && (
              <div className={styles.typing} aria-live="polite">
                <span className={styles.typingDots}>
                  <i />
                  <i />
                  <i />
                </span>
                {typing.map((person) => person.firstName).join(', ')} is typing
              </div>
            )}
          </div>

          <form
            className={styles.composer}
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft);
            }}
          >
            <textarea
              rows={1}
              className={styles.input}
              value={draft}
              placeholder="Type a message&#8230;"
              aria-label="Type a message"
              onChange={(event) => {
                setDraft(event.target.value);
                noteTyping();
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void send(draft);
                }
              }}
            />

            {draft.trim() ? (
              <button
                type="submit"
                className={styles.sendButton}
                disabled={isSending}
                aria-label="Send"
              >
                <Icon name="send" size={15} />
              </button>
            ) : (
              /* An empty press sends the thumbs-up, exactly as Messenger does. */
              <button
                type="button"
                className={styles.sendButton}
                disabled={isSending}
                aria-label="Send a thumbs up"
                onClick={() => void send('', 'STICKER')}
              >
                <Icon name="like" size={15} />
              </button>
            )}
          </form>
        </>
      )}
    </section>
  );
}
