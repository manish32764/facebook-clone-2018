import { useState } from 'react';
import { Button, Card, Icon, Input, Spinner } from '@atoms/index';
import { ErrorNotice, Modal } from '@molecules/index';
import { useAsync } from '@/hooks/useAsync';
import { storyApi } from '@/api/endpoints';
import { toErrorMessage } from '@/api/client';
import { classNames } from '@/utils/format';
import { StoryViewer } from '../StoryViewer';
import { StoryFace } from '../StoryViewer/StoryFace';
import type { Highlight } from '@/types';
import styles from './Highlights.module.css';

export interface HighlightsProps {
  ownerId: number;
  isOwn: boolean;
}

/** The row of story highlights on a profile, with "New" for the owner. */
export function Highlights({ ownerId, isOwn }: HighlightsProps) {
  const highlightsQuery = useAsync(() => storyApi.highlights(ownerId), [ownerId]);
  const [open, setOpen] = useState<Highlight | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const highlights = highlightsQuery.data ?? [];
  if (!isOwn && highlights.length === 0) return null;

  async function remove(highlight: Highlight) {
    if (!window.confirm(`Delete the highlight "${highlight.title}"?`)) return;
    await storyApi.deleteHighlight(highlight.id);
    void highlightsQuery.reload();
  }

  return (
    <Card title="Highlights">
      <div className={styles.row}>
        {isOwn && (
          <button type="button" className={styles.item} onClick={() => setIsCreating(true)}>
            <span className={classNames(styles.circle, styles.newCircle)}>
              <Icon name="plus" size={20} />
            </span>
            <span className={styles.label}>New</span>
          </button>
        )}
        {highlights.map((highlight) => (
          <div key={highlight.id} className={styles.itemHost}>
            <button type="button" className={styles.item} onClick={() => setOpen(highlight)}>
              <span className={styles.circle}>
                {highlight.stories[0] && <StoryFace story={highlight.stories[0]} small />}
              </span>
              <span className={styles.label}>{highlight.title}</span>
            </button>
            {isOwn && (
              <button
                type="button"
                className={styles.remove}
                aria-label={`Delete ${highlight.title}`}
                onClick={() => void remove(highlight)}
              >
                <Icon name="close" size={10} />
              </button>
            )}
          </div>
        ))}
        {highlightsQuery.isLoading && <Spinner size="sm" />}
      </div>

      {open && (
        <StoryViewer
          reels={[{ author: open.owner, stories: open.stories, allSeen: true }]}
          startReel={0}
          onClose={() => setOpen(null)}
          onSeen={() => undefined}
          readOnly
        />
      )}

      {isCreating && (
        <CreateHighlightDialog
          onClose={() => setIsCreating(false)}
          onCreated={() => {
            setIsCreating(false);
            void highlightsQuery.reload();
          }}
        />
      )}
    </Card>
  );
}

interface CreateHighlightDialogProps {
  onClose: () => void;
  onCreated: () => void;
}

/** Pick stories from your archive - expired ones included - and name the highlight. */
function CreateHighlightDialog({ onClose, onCreated }: CreateHighlightDialogProps) {
  const archiveQuery = useAsync(() => storyApi.archive(), []);
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: number) {
    setSelected((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  async function save() {
    setIsSaving(true);
    setError(null);
    try {
      await storyApi.createHighlight(title.trim() || 'Highlights', selected);
      onCreated();
    } catch (err) {
      setError(toErrorMessage(err, 'That highlight could not be saved'));
    } finally {
      setIsSaving(false);
    }
  }

  const archive = archiveQuery.data ?? [];

  return (
    <Modal
      title="New highlight"
      width="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={selected.length === 0 || isSaving}>
            {isSaving ? 'Saving…' : `Add ${selected.length || ''} to highlight`}
          </Button>
        </>
      }
    >
      <Input compact label="Title" placeholder="Summer 2018" value={title} onChange={(e) => setTitle(e.target.value)} />
      <p className={styles.hint}>Pick from every story you have posted, including ones that have expired.</p>
      {archiveQuery.isLoading ? (
        <Spinner size="sm" />
      ) : archive.length === 0 ? (
        <p className={styles.hint}>You have not posted any stories yet.</p>
      ) : (
        <div className={styles.archive}>
          {archive.map((story) => (
            <button
              key={story.id}
              type="button"
              className={classNames(styles.archiveItem, selected.includes(story.id) && styles.archiveItemOn)}
              onClick={() => toggle(story.id)}
              aria-pressed={selected.includes(story.id)}
            >
              <StoryFace story={story} small />
              {selected.includes(story.id) && (
                <span className={styles.tick}>
                  <Icon name="check" size={12} />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {error && <ErrorNotice message={error} />}
    </Modal>
  );
}
