import { Avatar, PresenceDot } from '@atoms/index';
import { classNames } from '@/utils/format';
import { timeAgo } from '@/utils/time';
import type { Conversation, User } from '@/types';
import styles from './ConversationRow.module.css';

export interface ConversationRowProps {
  conversation: Conversation;
  viewer: User;
  isActive?: boolean;
  onClick: () => void;
}

/** One line in the Messenger list: avatar, name, preview, time, unread dot. */
export function ConversationRow({ conversation, viewer, isActive, onClick }: ConversationRowProps) {
  const { title, pictureUrl, lastMessage, unreadCount, online, lastMessageAt } = conversation;
  const isUnread = unreadCount > 0;

  const preview = (() => {
    if (!lastMessage) return 'No messages yet';
    if (lastMessage.deleted) return 'Message removed';
    if (lastMessage.type === 'IMAGE' && !lastMessage.content) return 'Sent a photo';
    if (lastMessage.type === 'STICKER') return 'Sent a sticker';

    const mine = lastMessage.sender.id === viewer.id;
    const prefix = mine ? 'You: ' : conversation.type === 'GROUP' ? `${lastMessage.sender.firstName}: ` : '';
    return prefix + (lastMessage.content ?? '');
  })();

  return (
    <button
      type="button"
      className={classNames(styles.row, isActive && styles.active, isUnread && styles.unread)}
      onClick={onClick}
    >
      <span className={styles.avatarWrap}>
        <Avatar src={pictureUrl} name={title} size="md" circle />
        <PresenceDot online={online} corner />
      </span>

      <span className={styles.body}>
        <span className={styles.titleRow}>
          <span className={styles.title}>{title}</span>
          {lastMessageAt && <span className={styles.time}>{timeAgo(lastMessageAt)}</span>}
        </span>
        <span className={styles.preview}>{preview}</span>
      </span>

      {isUnread && <span className={styles.badge} aria-label={`${unreadCount} unread`} />}
    </button>
  );
}
