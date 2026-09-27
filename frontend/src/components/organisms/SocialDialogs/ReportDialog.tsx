import { useState } from 'react';
import { Button, TextArea } from '@atoms/index';
import { ErrorNotice, Modal } from '@molecules/index';
import { toErrorMessage } from '@/api/client';
import { socialApi } from '@/api/endpoints';
import { classNames } from '@/utils/format';
import type { ReportTarget } from '@/types';
import styles from './SocialDialogs.module.css';

export interface ReportDialogProps {
  targetType: ReportTarget;
  targetId: number;
  /** "this post", "Sarah Connor" - used in the heading. */
  targetName: string;
  onClose: () => void;
  /** Offered after reporting a person or their content. */
  onBlock?: () => Promise<unknown> | void;
  blockName?: string;
}

const REASONS = [
  'Nudity',
  'Violence',
  'Harassment',
  'Suicide or self-injury',
  'False information',
  'Spam',
  'Unauthorised sales',
  'Hate speech',
  'Terrorism',
  'Pretending to be someone',
  'Something else',
];

/** "Find support or report": pick a reason, add detail, and optionally block. */
export function ReportDialog({ targetType, targetId, targetName, onClose, onBlock, blockName }: ReportDialogProps) {
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!reason) return;
    setIsSending(true);
    setError(null);
    try {
      await socialApi.report({ targetType, targetId, reason, details: details.trim() || undefined });
      setSent(true);
    } catch (err) {
      setError(toErrorMessage(err, 'Your report could not be sent'));
    } finally {
      setIsSending(false);
    }
  }

  async function block() {
    if (!onBlock) return;
    await onBlock();
    setBlocked(true);
  }

  return (
    <Modal
      title={sent ? 'Thanks for letting us know' : `Report ${targetName}`}
      onClose={onClose}
      footer={
        sent ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={!reason || isSending}>
              {isSending ? 'Sending…' : 'Send Report'}
            </Button>
          </>
        )
      }
    >
      {sent ? (
        <div className={styles.sent}>
          <p>
            Your report was received. You can follow its status in <strong>Settings &rsaquo; Support Inbox</strong>.
          </p>
          {onBlock && blockName && (
            <div className={styles.sentBlock}>
              <p>Other steps you can take:</p>
              <Button variant="secondary" onClick={() => void block()} disabled={blocked}>
                {blocked ? `${blockName} is blocked` : `Block ${blockName}`}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <>
          <p className={styles.hint}>Please select a problem to continue.</p>
          <div className={styles.reasons}>
            {REASONS.map((item) => (
              <button
                key={item}
                type="button"
                className={classNames(styles.reason, reason === item && styles.reasonOn)}
                onClick={() => setReason(item)}
              >
                {item}
              </button>
            ))}
          </div>
          {reason && (
            <TextArea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="Tell us more (optional)"
              aria-label="Details"
              bordered
              rows={3}
              minHeight={70}
            />
          )}
          {error && <ErrorNotice message={error} />}
        </>
      )}
    </Modal>
  );
}
