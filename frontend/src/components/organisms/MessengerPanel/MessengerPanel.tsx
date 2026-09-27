import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar, Button, Icon, Input, PresenceDot, Spinner } from '@atoms/index';
import { ConversationRow, EmptyState, MessageBubble } from '@molecules/index';
import { messageApi } from '@/api/endpoints';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { usePolling } from '@/hooks/usePolling';
import { classNames } from '@/utils/format';
import { dayLabel, presenceLabel } from '@/utils/time';
import { NewChatDialog } from './NewChatDialog';
import { PhotoLightbox } from '../PhotoLightbox';
import type { Message, User } from '@/types';
import styles from './MessengerPanel.module.css';

/** The open thread refreshes quickly; the list beside it rides the chat poll. */
const POLL_MS = 3_000;

/**
 * Messenger as a full page: the thread list on the left, the open conversation
 * on the right. The URL carries the open thread (/messages/4) so a conversation
 * can be linked to, and so the browser's back button walks between threads.
 */
export function MessengerPanel() {
  const { user: viewer } = useAuth();
  const { conversations, isLoading, refresh } = useChat();
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState<User[]>([]);
  const [draft, setDraft] = useState('');
  const [filter, setFilter] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const typingSentAt = useRef(0);

  const activeId = conversationId ? Number(conversationId) : conversations[0]?.id;
  const active = conversations.find((conversation) => conversation.id === activeId);

  const loadThread = useCallback(async () => {
    if (!activeId) return;
    try {
      const [thread, typingState] = await Promise.all([
        messageApi.thread(activeId, 0, 60),
        messageApi.typingState(activeId),
      ]);
      setMessages(thread.messages);
      setTyping(typingState.typing);
    } catch {
      /* the next poll will try again */
    } finally {
      setIsThreadLoading(false);
    }
  }, [activeId]);

  // Opening a thread reads it, which clears its unread badge everywhere.
  useEffect(() => {
    if (!activeId) return;
    setIsThreadLoading(true);
    setMessages([]);
    void loadThread();
    void messageApi
      .markRead(activeId)
      .then(refresh)
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  usePolling(() => void loadThread(), POLL_MS, Boolean(activeId));

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages.length, typing.length, activeId]);

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return conversations;
    return conversations.filter((conversation) =>
      conversation.title.toLowerCase().includes(needle),
    );
  }, [conversations, filter]);

  function noteTyping() {
    if (!activeId) return;
    const now = Date.now();
    if (now - typingSentAt.current < 3_000) return;
    typingSentAt.current = now;
    void messageApi.setTyping(activeId, true).catch(() => undefined);
  }

  async function send(content: string, type?: string) {
    const trimmed = content.trim();
    if (!activeId || (!trimmed && type !== 'STICKER') || isSending) return;

    setIsSending(true);
    try {
      const created = await messageApi.send(activeId, trimmed, undefined, type);
      setMessages((current) => [...current, created]);
      setDraft('');
      void refresh();
    } finally {
      setIsSending(false);
    }
  }

  if (!viewer) return null;

  return (
    <div className={styles.panel}>
      <aside className={styles.list}>
        <div className={styles.listHeader}>
          <span className={styles.listTitle}>Messenger</span>
          <Button size="sm" onClick={() => setIsNewChatOpen(true)}>
            <Icon name="plus" size={12} /> New
          </Button>
        </div>

        <div className={styles.listSearch}>
          <Input
            compact
            value={filter}
            placeholder="Search conversations"
            aria-label="Search conversations"
            onChange={(event) => setFilter(event.target.value)}
          />
        </div>

        <div className={styles.listBody}>
          {isLoading && conversations.length === 0 ? (
            <Spinner size="sm" />
          ) : filtered.length === 0 ? (
            <p className={styles.listEmpty}>
              {conversations.length === 0 ? 'No conversations yet.' : 'Nothing matches that search.'}
            </p>
          ) : (
            filtered.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                viewer={viewer}
                isActive={conversation.id === activeId}
                onClick={() => navigate(`/messages/${conversation.id}`)}
              />
            ))
          )}
        </div>
      </aside>

      <section className={styles.thread}>
        {!active ? (
          <div className={styles.threadEmpty}>
            <EmptyState
              icon="messenger"
              title="Pick a conversation"
              description="Choose someone on the left, or start a new chat."
              action={<Button onClick={() => setIsNewChatOpen(true)}>New Message</Button>}
            />
          </div>
        ) : (
          <>
            <header className={styles.threadHeader}>
              <Link
                to={
                  active.type === 'DIRECT' && active.otherUser
                    ? `/profile/${active.otherUser.id}`
                    : `/messages/${active.id}`
                }
                className={styles.threadIdentity}
              >
                <span className={styles.threadAvatar}>
                  <Avatar src={active.pictureUrl} name={active.title} size="md" circle />
                  <PresenceDot online={active.online} corner />
                </span>
                <span className={styles.threadText}>
                  <span className={styles.threadName}>{active.title}</span>
                  <span className={styles.threadSub}>
                    {active.type === 'GROUP'
                      ? active.participants.map((person) => person.firstName).join(', ')
                      : presenceLabel(active.otherUser?.lastSeenAt, active.online)}
                  </span>
                </span>
              </Link>

              <div className={styles.threadTools}>
                <button
                  type="button"
                  className={styles.threadTool}
                  title={active.muted ? 'Unmute conversation' : 'Mute conversation'}
                  onClick={() => {
                    void messageApi
                      .setMuted(active.id, !active.muted)
                      .then(refresh)
                      .catch(() => undefined);
                  }}
                >
                  <Icon name="bell" size={15} />
                </button>
                <button
                  type="button"
                  className={styles.threadTool}
                  title="Leave conversation"
                  onClick={() => {
                    if (!window.confirm('Leave this conversation?')) return;
                    void messageApi
                      .leave(active.id)
                      .then(() => {
                        navigate('/messages');
                        return refresh();
                      })
                      .catch(() => undefined);
                  }}
                >
                  <Icon name="close" size={15} />
                </button>
              </div>
            </header>

            <div className={styles.threadScroll} ref={scrollRef}>
              {isThreadLoading && messages.length === 0 ? (
                <Spinner size="sm" />
              ) : messages.length === 0 ? (
                <p className={styles.threadBlank}>No messages yet. Say hello.</p>
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
                        showSender={active.type === 'GROUP' && (!sameSender || newDay)}
                        onReact={(id, emoji) => {
                          void messageApi
                            .react(id, emoji)
                            .then((updated) =>
                              setMessages((current) =>
                                current.map((m) => (m.id === updated.id ? updated : m)),
                              ),
                            )
                            .catch(() => undefined);
                        }}
                        onUnsend={(id) => {
                          void messageApi.unsend(id).then(loadThread).catch(() => undefined);
                        }}
                        onOpenImage={setLightboxUrl}
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

              <button
                type="button"
                className={styles.sendButton}
                aria-label="Send a thumbs up"
                disabled={isSending}
                onClick={() => void send('', 'STICKER')}
              >
                <Icon name="like" size={17} />
              </button>

              <button
                type="submit"
                className={classNames(styles.sendButton, styles.sendPrimary)}
                aria-label="Send"
                disabled={isSending || !draft.trim()}
              >
                <Icon name="send" size={17} />
              </button>
            </form>
          </>
        )}
      </section>

      {isNewChatOpen && (
        <NewChatDialog
          onClose={() => setIsNewChatOpen(false)}
          onCreated={(id) => {
            setIsNewChatOpen(false);
            void refresh();
            navigate(`/messages/${id}`);
          }}
        />
      )}

      {lightboxUrl && <PhotoLightbox images={[lightboxUrl]} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
}
