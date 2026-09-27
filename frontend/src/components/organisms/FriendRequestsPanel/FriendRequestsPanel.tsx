import { useState } from 'react';
import { Card, Spinner } from '@atoms/index';
import { ErrorNotice, FriendRequestTile } from '@molecules/index';
import type { FriendRequest } from '@/types';
import styles from './FriendRequestsPanel.module.css';

export interface FriendRequestsPanelProps {
  requests: FriendRequest[];
  isLoading: boolean;
  error: string | null;
  onRespond: (requestId: number, accept: boolean) => Promise<void>;
  onRetry: () => void;
}

export function FriendRequestsPanel({
  requests,
  isLoading,
  error,
  onRespond,
  onRetry,
}: FriendRequestsPanelProps) {
  const [busyId, setBusyId] = useState<number | null>(null);

  async function respond(requestId: number, accept: boolean) {
    setBusyId(requestId);
    try {
      await onRespond(requestId, accept);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card title={`Friend Requests${requests.length ? ` (${requests.length})` : ''}`} padded={false} className={styles.panel}>
      {isLoading && <Spinner size="sm" />}
      {error && <ErrorNotice message={error} onRetry={onRetry} />}

      {!isLoading && !error && requests.length === 0 && (
        <p className={styles.empty}>You have no pending friend requests.</p>
      )}

      {requests.map((request) => (
        <FriendRequestTile
          key={request.requestId}
          request={request}
          isBusy={busyId === request.requestId}
          onAccept={(id) => void respond(id, true)}
          onDecline={(id) => void respond(id, false)}
        />
      ))}
    </Card>
  );
}
