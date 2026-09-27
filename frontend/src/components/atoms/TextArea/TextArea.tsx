import { useEffect, useRef, type TextareaHTMLAttributes } from 'react';
import { classNames } from '@/utils/format';
import styles from './TextArea.module.css';

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  bordered?: boolean;
  /** Grows with its content up to this many pixels, then scrolls. */
  maxHeight?: number;
  /** Floor for the auto-size, so an empty composer is not a thin slot. */
  minHeight?: number;
}

export function TextArea({
  bordered = false,
  maxHeight = 320,
  minHeight = 0,
  className,
  value,
  onChange,
  ...rest
}: TextAreaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-size on every value change so the composer feels like Facebook's.
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.height = 'auto';
    const next = Math.min(Math.max(element.scrollHeight, minHeight), maxHeight);
    element.style.height = `${next}px`;
    element.style.overflowY = element.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [value, maxHeight, minHeight]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      className={classNames(styles.textarea, bordered && styles.bordered, className)}
      {...rest}
    />
  );
}
