import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@atoms/index';
import { classNames } from '@/utils/format';
import styles from './Modal.module.css';

export type ModalWidth = 'sm' | 'md' | 'lg' | 'full';

export interface ModalProps {
  title?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: ModalWidth;
  /** Drops the white chrome so a viewer can fill the screen. */
  bare?: boolean;
}

/**
 * The 2018 dialog: a dark scrim, a white card, a blue title strip. Rendered
 * through a portal so a modal opened from deep inside a card is never clipped by
 * an ancestor's overflow.
 */
export function Modal({ title, onClose, children, footer, width = 'md', bare = false }: ModalProps) {
  // Escape closes, and the page behind must not scroll while a dialog is open.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div className={styles.scrim} onClick={onClose} role="presentation">
      <div
        className={classNames(styles.dialog, styles[width], bare && styles.bare)}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        {bare ? (
          <button type="button" className={styles.bareClose} onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        ) : (
          <div className={styles.header}>
            <span className={styles.title}>{title}</span>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
              <Icon name="close" size={14} />
            </button>
          </div>
        )}

        <div className={bare ? styles.bareBody : styles.body}>{children}</div>

        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
