import { useRef, useState, type PointerEvent } from 'react';
import { Button, Icon, Input, Select, TextArea } from '@atoms/index';
import { ErrorNotice, MediaUpload, Modal } from '@molecules/index';
import { toErrorMessage } from '@/api/client';
import { storyApi } from '@/api/endpoints';
import { classNames } from '@/utils/format';
import { StoryFace } from './StoryFace';
import type { StoryAudience, StoryOverlay } from '@/types';
import styles from './StoryComposer.module.css';

export interface StoryComposerProps {
  onClose: () => void;
  onCreated: () => void;
}

/** The background palette the app offers for a text-only story. */
const COLOURS = ['#4267b2', '#365899', '#1d2129', '#e74c3c', '#f7b125', '#42b72a', '#8e44ad'];

const TEXT_COLOURS = ['#ffffff', '#1d2129', '#f7b125', '#e74c3c', '#42b72a', '#4267b2'];

const STICKERS = ['\u{1F60D}', '\u{1F602}', '\u{1F389}', '\u{1F525}', '❤️', '\u{1F44D}', '☀️', '\u{1F334}',
  '\u{1F382}', '\u{1F355}', '☕', '\u{1F4F8}', '\u{1F3B6}', '✨', '\u{1F308}', '\u{1F436}'];

/**
 * "Add to Story": a photo (uploaded or linked) or a colour, with text and
 * sticker layers you drag into place on the live preview, and a choice of
 * who can see it.
 */
export function StoryComposer({ onClose, onCreated }: StoryComposerProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [text, setText] = useState('');
  const [backgroundColor, setBackgroundColor] = useState(COLOURS[0]);
  const [layers, setLayers] = useState<StoryOverlay[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [layerText, setLayerText] = useState('');
  const [layerColour, setLayerColour] = useState(TEXT_COLOURS[0]);
  const [audience, setAudience] = useState<StoryAudience>('FRIENDS');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<number | null>(null);

  const canPost = Boolean(imageUrl.trim() || text.trim() || layers.length > 0) && !isSaving;

  function addText() {
    const value = layerText.trim();
    if (!value) return;
    setLayers((current) => [...current, { kind: 'text', value, x: 0.5, y: 0.35 + current.length * 0.08, color: layerColour, size: 28 }]);
    setSelected(layers.length);
    setLayerText('');
  }

  function addSticker(emoji: string) {
    setLayers((current) => [...current, { kind: 'sticker', value: emoji, x: 0.3 + Math.random() * 0.4, y: 0.6, size: 56 }]);
    setSelected(layers.length);
  }

  function updateSelected(patch: Partial<StoryOverlay>) {
    if (selected === null) return;
    setLayers((current) => current.map((layer, index) => (index === selected ? { ...layer, ...patch } : layer)));
  }

  function removeSelected() {
    if (selected === null) return;
    setLayers((current) => current.filter((_, index) => index !== selected));
    setSelected(null);
  }

  function onPointerDown(index: number, event: PointerEvent<HTMLSpanElement>) {
    event.preventDefault();
    dragging.current = index;
    setSelected(index);
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const index = dragging.current;
    const box = previewRef.current?.getBoundingClientRect();
    if (index === null || !box) return;
    const x = Math.min(0.95, Math.max(0.05, (event.clientX - box.left) / box.width));
    const y = Math.min(0.95, Math.max(0.05, (event.clientY - box.top) / box.height));
    setLayers((current) => current.map((layer, i) => (i === index ? { ...layer, x, y } : layer)));
  }

  async function submit() {
    if (!canPost) return;
    setIsSaving(true);
    setError(null);
    try {
      await storyApi.create({
        imageUrl: imageUrl.trim() || undefined,
        text: text.trim() || undefined,
        backgroundColor,
        overlays: layers.length > 0 ? JSON.stringify(layers) : undefined,
        audience,
      });
      onCreated();
    } catch (err) {
      setError(toErrorMessage(err, 'Your story could not be posted'));
    } finally {
      setIsSaving(false);
    }
  }

  const selectedLayer = selected !== null ? layers[selected] : null;

  return (
    <Modal
      title="Add to your story"
      width="lg"
      onClose={onClose}
      footer={
        <>
          <span className={styles.expiry}>Stories disappear after 24 hours.</span>
          <Select
            compact
            aria-label="Who can see your story"
            value={audience}
            onChange={(event) => setAudience(event.target.value as StoryAudience)}
            options={[
              { value: 'PUBLIC', label: 'Public' },
              { value: 'FRIENDS', label: 'Friends' },
              { value: 'CLOSE_FRIENDS', label: 'Close Friends' },
            ]}
          />
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={!canPost}>
            {isSaving ? 'Posting…' : 'Share to Story'}
          </Button>
        </>
      }
    >
      <div className={styles.grid}>
        <div className={styles.fields}>
          <div className={styles.uploadRow}>
            <MediaUpload label="Upload photo" onUploaded={(url) => setImageUrl(url)} />
            {imageUrl && (
              <button type="button" className={styles.clear} onClick={() => setImageUrl('')}>
                Remove photo
              </button>
            )}
          </div>
          <Input
            compact
            label="or paste a photo link"
            placeholder="https://example.com/photo.jpg"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
          />

          <TextArea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={imageUrl ? 'Add a caption…' : 'Say something…'}
            aria-label="Story text"
            rows={2}
            minHeight={54}
          />

          {!imageUrl.trim() && (
            <div className={styles.palette}>
              <span className={styles.paletteLabel}>Background</span>
              <div className={styles.swatches}>
                {COLOURS.map((colour) => (
                  <button
                    key={colour}
                    type="button"
                    className={classNames(styles.swatch, backgroundColor === colour && styles.swatchActive)}
                    style={{ background: colour }}
                    aria-label={`Background ${colour}`}
                    onClick={() => setBackgroundColor(colour)}
                  />
                ))}
              </div>
            </div>
          )}

          <div className={styles.palette}>
            <span className={styles.paletteLabel}>Text on the story</span>
            <div className={styles.addText}>
              <input
                className={styles.layerInput}
                value={layerText}
                placeholder="Type, then Add"
                onChange={(event) => setLayerText(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && (event.preventDefault(), addText())}
              />
              <Button size="sm" variant="secondary" onClick={addText} disabled={!layerText.trim()}>
                Add
              </Button>
            </div>
            <div className={styles.swatches}>
              {TEXT_COLOURS.map((colour) => (
                <button
                  key={colour}
                  type="button"
                  className={classNames(styles.swatch, styles.swatchSmall, layerColour === colour && styles.swatchActive)}
                  style={{ background: colour }}
                  aria-label={`Text colour ${colour}`}
                  onClick={() => {
                    setLayerColour(colour);
                    if (selectedLayer?.kind === 'text') updateSelected({ color: colour });
                  }}
                />
              ))}
            </div>
          </div>

          <div className={styles.palette}>
            <span className={styles.paletteLabel}>Stickers</span>
            <div className={styles.stickers}>
              {STICKERS.map((emoji) => (
                <button key={emoji} type="button" className={styles.stickerButton} onClick={() => addSticker(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {selectedLayer && (
            <div className={styles.layerTools}>
              <span className={styles.paletteLabel}>Selected layer</span>
              <button type="button" className={styles.clear} onClick={() => updateSelected({ size: (selectedLayer.size ?? 28) * 1.2 })}>
                Bigger
              </button>
              <button type="button" className={styles.clear} onClick={() => updateSelected({ size: (selectedLayer.size ?? 28) / 1.2 })}>
                Smaller
              </button>
              <button type="button" className={styles.clear} onClick={removeSelected}>
                <Icon name="trash" size={12} /> Remove
              </button>
            </div>
          )}

          {error && <ErrorNotice message={error} />}
        </div>

        {/* A live preview at the real story aspect ratio; drag layers to place them. */}
        <div className={styles.previewHost}>
          <div
            ref={previewRef}
            className={styles.preview}
            onPointerMove={onPointerMove}
            onPointerUp={() => (dragging.current = null)}
            onPointerLeave={() => (dragging.current = null)}
          >
            <StoryFace story={{ imageUrl: imageUrl.trim() || null, text: layers.length ? null : text, backgroundColor, overlays: null }} small />
            {layers.map((layer, index) => (
              <span
                key={index}
                className={classNames(styles.layer, selected === index && styles.layerSelected)}
                style={{
                  left: `${layer.x * 100}%`,
                  top: `${layer.y * 100}%`,
                  color: layer.color ?? '#fff',
                  fontSize: `${(layer.size ?? 28) * 0.5}px`,
                  fontWeight: layer.kind === 'text' ? 700 : 400,
                }}
                onPointerDown={(event) => onPointerDown(index, event)}
              >
                {layer.value}
              </span>
            ))}
          </div>
          <span className={styles.previewHint}>Drag text and stickers to move them</span>
        </div>
      </div>
    </Modal>
  );
}
