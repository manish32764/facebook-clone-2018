import { useNavigate } from 'react-router-dom';
import { Spinner } from '@atoms/index';
import { ConversationRow, EmptyState } from '@molecules/index';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import panel from '../NotificationsDropdown/NotificationsDropdown.module.css';

export interface MessagesDropdownProps {
  onClose: () => void;
}

/**
 * The envelope panel in the blue bar. Picking a thread opens it as a chat head
 * in the dock rather than navigating away, which is what the real chrome does.
 */
export function MessagesDropdown({ onClose }: MessagesDropdownProps) {
  const { user: viewer } = useAuth();
  const { conversations, isLoading, openConversation } = useChat();
  const navigate = useNavigate();

  if (!viewer) return null;

  return (
    <div className={panel.panel} role="menu" aria-label="Messages">
      <div className={panel.header}>
        <span className={panel.title}>Messages</span>
        <button
          type="button"
          className={panel.action}
          onClick={() => {
            onClose();
            navigate('/messages');
          }}
        >
          Open Messenger
        </button>
      </div>

      <div className={panel.body}>
        {isLoading && conversations.length === 0 ? (
          <Spinner size="sm" />
        ) : conversations.length === 0 ? (
          <EmptyState
            icon="messenger"
            title="No messages yet"
            description="Start a conversation from anyone's profile."
          />
        ) : (
          conversations.slice(0, 8).map((conversation) => (
            <ConversationRow
              key={conversation.id}
              conversation={conversation}
              viewer={viewer}
              onClick={() => {
                onClose();
                openConversation(conversation.id);
              }}
            />
          ))
        )}
      </div>

      <button
        type="button"
        className={panel.footer}
        onClick={() => {
          onClose();
          navigate('/messages');
        }}
      >
        See All in Messenger
      </button>
    </div>
  );
}
