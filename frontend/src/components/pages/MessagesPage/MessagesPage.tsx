import { AppShell } from '@templates/index';
import { MessengerPanel } from '@organisms/index';
import { useChat } from '@/hooks/useChat';

/** Messenger as a page. The panel reads the open thread from the URL. */
export function MessagesPage() {
  const { totalUnread } = useChat();

  return (
    <AppShell layout="full" title={totalUnread > 0 ? 'Messenger' : 'Messenger'}>
      <MessengerPanel />
    </AppShell>
  );
}
