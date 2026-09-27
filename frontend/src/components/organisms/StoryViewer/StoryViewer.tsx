import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Icon } from '@atoms/index';
import { MenuButton, Modal } from '@molecules/index';
import { storyApi } from '@/api/endpoints';
import { toErrorMessage } from '@/api/client';
import { useAuth } from '@/hooks/useAuth';
import { timeAgo } from '@/utils/time';
import { classNames } from '@/utils/format';
import { ReportDialog } from '../SocialDialogs';
import { StoryFace } from './StoryFace';
import type { StoryReel, StoryViewerRow } from '@/types';
import styles from './StoryViewer.module.css';

export interface StoryViewerProps {
  reels: StoryReel[];
  /** Which author's reel to start on. */
  startReel: number;
  onClose: () => void;
  /** Lets the rail redraw its seen rings once the viewer closes. */
  onSeen: () => void;
  /** Highlights: nothing is marked seen and nothing can be deleted. */
  readOnly?: boolean;
}

/** How long each card is held before advancing, matching the app's pacing. */
const CARD_MS = 5_000;

const TICK_MS = 50;

const QUICK_REACTIONS = ['\u{1F44D}', '❤️', '\u{1F606}', '\u{1F62E}', '\u{1F622}', '\u{1F621}'];

/**
 * The full-screen story player: one reel per author, a progress bar per card,
 * and automatic advance. Other people's stories take a reply (sent to
 * Messenger) or a quick reaction; your own show who viewed them.
 */
export function StoryViewer({ reels, startReel, onClose, onSeen, readOnly = false }: StoryViewerProps) {
  const { user } = useAuth();
  const [reelIndex, setReelIndex] = useState(startReel);
  const [cardIndex, setCardIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reply, setReply] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [viewers, setViewers] = useState<StoryViewerRow[] | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [removed, setRemoved] = useState<Set<number>>(new Set());

  const seenRef = useRef(new Set<number>());

  const reel = reels[reelIndex];
  const stories = (reel?.stories ?? []).filter((s) => !removed.has(s.id));
  const story = stories[Math.min(cardIndex, Math.max(0, stories.length - 1))];
  const isOwn = reel?.author.id === user?.id;
  const holding = isPaused || reply.length > 0 || viewers !== null || isReporting;

  const next = useCallback(() => {
    setElapsed(0);
    setCardIndex((card) => {
      if (card + 1 < stories.length) return card + 1;

      // End of this author's reel: move to the next author, or close.
      if (reelIndex + 1 < reels.length) {
        setReelIndex(reelIndex + 1);
        return 0;
      }
      onClose();
      return card;
    });
  }, [reelIndex, reels.length, stories.length, onClose]);

  const previous = useCallback(() => {
    setElapsed(0);
    setCardIndex((card) => {
      if (card > 0) return card - 1;
      if (reelIndex > 0) {
        const previousReel = reels[reelIndex - 1];
        setReelIndex(reelIndex - 1);
        return Math.max(0, previousReel.stories.length - 1);
      }
      return 0;
    });
  }, [reelIndex, reels]);

  // Each card is marked seen once, the first time it is shown.
  useEffect(() => {
    if (readOnly || !story || seenRef.current.has(story.id)) return;
    seenRef.current.add(story.id);
    void storyApi.markSeen(story.id).then(onSeen).catch(() => undefined);
  }, [story, onSeen, readOnly]);

  useEffect(() => {
    if (holding) return;
    const timer = window.setInterval(() => {
      setElapsed((value) => {
        if (value + TICK_MS >= CARD_MS) {
          next();
          return 0;
        }
        return value + TICK_MS;
      });
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [holding, next]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.target as HTMLElement)?.tagName === 'INPUT') return;
      if (event.key === 'ArrowRight') next();
      if (event.key === 'ArrowLeft') previous();
      if (event.key === ' ') setIsPaused((paused) => !paused);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [next, previous]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!reel || !story) return null;
  const current = story;

  async function sendReply(event: FormEvent) {
    event.preventDefault();
    const text = reply.trim();
    if (!text) return;
    try {
      await storyApi.reply(current.id, text);
      setReply('');
      setToast('Reply sent in Messenger');
    } catch (err) {
      setToast(toErrorMessage(err, 'Your reply could not be sent'));
    }
  }

  async function react(emoji: string) {
    try {
      await storyApi.react(current.id, emoji);
      setToast(`You reacted ${emoji}`);
    } catch (err) {
      setToast(toErrorMessage(err, 'That reaction did not send'));
    }
  }

  async function showViewers() {
    setViewers([]);
    try {
      setViewers(await storyApi.viewers(current.id));
    } catch {
      setViewers(null);
    }
  }

  async function remove() {
    if (!window.confirm('Delete this story?')) return;
    await storyApi.remove(current.id);
    setRemoved((set) => new Set(set).add(current.id));
    onSeen();
    if (stories.length <= 1) onClose();
  }

  return (
    <Modal onClose={onClose} bare>
      <div
        className={styles.stage}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <StoryFace story={current} />

        <div className={styles.progress}>
          {stories.map((card, index) => (
            <span key={card.id} className={styles.progressTrack}>
              <span
                className={styles.progressFill}
                style={{
                  width:
                    index < cardIndex
                      ? '100%'
                      : index === cardIndex
                        ? `${(elapsed / CARD_MS) * 100}%`
                        : '0%',
                }}
              />
            </span>
          ))}
        </div>

        <div className={styles.header}>
          <Link to={`/profile/${reel.author.id}`} className={styles.author} onClick={onClose}>
            <Avatar src={reel.author.avatarUrl} name={reel.author.fullName} size="sm" circle />
            <span className={styles.authorText}>
              <span className={styles.authorName}>{reel.author.fullName}</span>
              <span className={styles.authorTime}>
                {timeAgo(current.createdAt)}
                {current.audience === 'CLOSE_FRIENDS' && ' · Close Friends'}
                {current.audience === 'PUBLIC' && ' · Public'}
              </span>
            </span>
          </Link>

          <span className={styles.headerTools} onMouseDown={(e) => e.stopPropagation()}>
            {isOwn && !readOnly && (
              <button type="button" className={styles.viewCount} onClick={() => void showViewers()} title="Viewers">
                <Icon name="eye" size={13} /> {current.viewCount}
                {(current.reactionCount ?? 0) > 0 && (
                  <>
                    <span className={styles.viewSep} />
                    <Icon name="heart" size={12} /> {current.reactionCount}
                  </>
                )}
              </button>
            )}
            <MenuButton
              label="Story options"
              trigger={<Icon name="more" size={18} color="#fff" />}
              items={[
                { label: 'Delete story', icon: 'trash', destructive: true, onClick: () => void remove(), hidden: !isOwn || readOnly },
                { label: 'Report story', icon: 'alert', onClick: () => setIsReporting(true), hidden: isOwn },
                { label: isPaused ? 'Play' : 'Pause', icon: 'play', onClick: () => setIsPaused((p) => !p) },
              ]}
            />
          </span>
        </div>

        <button
          type="button"
          className={classNames(styles.tap, styles.tapLeft)}
          aria-label="Previous story"
          onClick={previous}
        />
        <button
          type="button"
          className={classNames(styles.tap, styles.tapRight)}
          aria-label="Next story"
          onClick={next}
        />

        {!isOwn && (
          <form
            className={styles.replyBar}
            onSubmit={(event) => void sendReply(event)}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <input
              className={styles.replyInput}
              value={reply}
              placeholder={`Reply to ${reel.author.firstName}...`}
              aria-label="Reply to story"
              onChange={(event) => setReply(event.target.value)}
            />
            {reply.trim() ? (
              <button type="submit" className={styles.replySend} aria-label="Send reply">
                <Icon name="send" size={16} />
              </button>
            ) : (
              <span className={styles.quick}>
                {QUICK_REACTIONS.map((emoji) => (
                  <button key={emoji} type="button" className={styles.quickItem} onClick={() => void react(emoji)}>
                    {emoji}
                  </button>
                ))}
              </span>
            )}
          </form>
        )}

        {toast && <div className={styles.toast}>{toast}</div>}

        {viewers !== null && (
          <div className={styles.viewersPanel} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.viewersHeader}>
              <span>Viewers ({viewers.length})</span>
              <button type="button" className={styles.viewersClose} onClick={() => setViewers(null)} aria-label="Close">
                <Icon name="close" size={14} />
              </button>
            </div>
            {viewers.length === 0 ? (
              <p className={styles.viewersEmpty}>No one has seen this yet.</p>
            ) : (
              viewers.map((row) => (
                <div key={row.user.id} className={styles.viewerRow}>
                  <Avatar src={row.user.avatarUrl} name={row.user.fullName} size="sm" circle />
                  <span className={styles.viewerName}>{row.user.fullName}</span>
                  <span className={styles.viewerReactions}>{row.reactions.slice(0, 5).join(' ')}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {isReporting && (
        <ReportDialog
          targetType="STORY"
          targetId={current.id}
          targetName="this story"
          onClose={() => setIsReporting(false)}
        />
      )}
    </Modal>
  );
}
