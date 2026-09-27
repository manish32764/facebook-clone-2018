import { useId, useState, type ChangeEvent } from 'react';
import { Icon } from '@atoms/index';
import { mediaApi } from '@/api/endpoints';
import { toErrorMessage } from '@/api/client';
import { classNames } from '@/utils/format';
import styles from './MediaUpload.module.css';

export interface MediaUploadProps {
  /** Called once per uploaded file with its stored URL. */
  onUploaded: (url: string, contentType: string) => void;
  accept?: string;
  label?: string;
  multiple?: boolean;
  /** A small icon-and-text link rather than a bordered button. */
  variant?: 'button' | 'link' | 'tile';
  disabled?: boolean;
}

/**
 * "Upload Photo": a file picker that sends each chosen file to /api/media and
 * hands back its URL. Progress and errors show inline, next to the control.
 */
export function MediaUpload({
  onUploaded,
  accept = 'image/*',
  label = 'Upload photo',
  multiple = false,
  variant = 'button',
  disabled = false,
}: MediaUploadProps) {
  const inputId = useId();
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    setError(null);
    try {
      for (const file of files) {
        if (file.size > 50 * 1024 * 1024) throw new Error(`${file.name} is larger than 50 MB`);
        setProgress(0);
        const result = await mediaApi.upload(file, setProgress);
        onUploaded(result.url, result.contentType);
      }
    } catch (err) {
      setError(toErrorMessage(err, 'That file could not be uploaded'));
    } finally {
      setProgress(null);
    }
  }

  const busy = progress !== null;

  return (
    <span className={styles.wrapper}>
      <label
        htmlFor={inputId}
        className={classNames(styles.trigger, styles[variant], (busy || disabled) && styles.disabled)}
      >
        <Icon name={variant === 'tile' ? 'camera' : 'upload'} size={variant === 'tile' ? 22 : 14} />
        <span>{busy ? `Uploading… ${progress}%` : label}</span>
      </label>
      <input
        id={inputId}
        type="file"
        className={styles.input}
        accept={accept}
        multiple={multiple}
        disabled={busy || disabled}
        onChange={(event) => void handleChange(event)}
      />
      {error && <span className={styles.error}>{error}</span>}
    </span>
  );
}
