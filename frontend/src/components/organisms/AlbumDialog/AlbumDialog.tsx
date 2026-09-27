import { useState } from 'react';
import { Button, Icon, Input, TextArea } from '@atoms/index';
import { ErrorNotice, MediaUpload, Modal } from '@molecules/index';
import { toErrorMessage } from '@/api/client';
import { albumApi } from '@/api/endpoints';
import type { Album } from '@/types';
import styles from './AlbumDialog.module.css';

export interface AlbumDialogProps {
  /** Add to this album; create a new one when absent. */
  album?: Album;
  onClose: () => void;
  onSaved: (album: Album) => void;
}

/** Create an album, or add photos to one, uploading several files at once. */
export function AlbumDialog({ album, onClose, onSaved }: AlbumDialogProps) {
  const [title, setTitle] = useState(album?.title ?? '');
  const [description, setDescription] = useState(album?.description ?? '');
  const [urls, setUrls] = useState<string[]>([]);
  const [link, setLink] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNew = !album;
  const canSave = (isNew ? title.trim().length > 0 : urls.length > 0) && !isSaving;

  function addLink() {
    if (!link.trim()) return;
    setUrls((current) => [...current, link.trim()]);
    setLink('');
  }

  async function save() {
    setIsSaving(true);
    setError(null);
    try {
      const saved = isNew
        ? await albumApi.create({ title: title.trim(), description: description.trim() || undefined, photoUrls: urls })
        : await albumApi.addPhotos(album.id, urls);
      onSaved(saved);
    } catch (err) {
      setError(toErrorMessage(err, 'The album could not be saved'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      title={isNew ? 'Create album' : `Add photos to ${album.title}`}
      width="lg"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={!canSave}>
            {isSaving ? 'Saving…' : isNew ? 'Create Album' : `Add ${urls.length} photos`}
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        {isNew && (
          <>
            <Input compact label="Album name" placeholder="Summer 2018" value={title} onChange={(e) => setTitle(e.target.value)} />
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Say something about this album…"
              aria-label="Album description"
              bordered
              rows={2}
              minHeight={54}
            />
          </>
        )}

        <MediaUpload
          variant="tile"
          multiple
          label="Upload photos (you can pick several)"
          onUploaded={(url) => setUrls((current) => [...current, url])}
        />

        <div className={styles.linkRow}>
          <Input compact placeholder="…or paste a photo link" value={link} onChange={(e) => setLink(e.target.value)} />
          <Button size="sm" variant="secondary" onClick={addLink} disabled={!link.trim()}>
            Add link
          </Button>
        </div>

        {urls.length > 0 && (
          <div className={styles.thumbs}>
            {urls.map((url, index) => (
              <span key={`${url}-${index}`} className={styles.thumb}>
                <img src={url} alt="" />
                <button
                  type="button"
                  className={styles.remove}
                  aria-label="Remove photo"
                  onClick={() => setUrls((current) => current.filter((_, i) => i !== index))}
                >
                  <Icon name="close" size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        {error && <ErrorNotice message={error} />}
      </div>
    </Modal>
  );
}
