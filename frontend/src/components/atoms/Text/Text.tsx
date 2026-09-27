import type { ElementType, ReactNode } from 'react';
import { classNames } from '@/utils/format';
import styles from './Text.module.css';

export type TextSize = 'xs' | 'sm' | 'base' | 'md' | 'lg' | 'xl' | 'xxl';
export type TextTone = 'primary' | 'secondary' | 'muted' | 'meta' | 'link' | 'onBrand' | 'danger';
export type TextWeight = 'normal' | 'medium' | 'bold';

export interface TextProps {
  as?: ElementType;
  size?: TextSize;
  tone?: TextTone;
  weight?: TextWeight;
  truncate?: boolean;
  preserveBreaks?: boolean;
  className?: string;
  children: ReactNode;
  title?: string;
}

export function Text({
  as: Component = 'span',
  size = 'base',
  tone = 'primary',
  weight = 'normal',
  truncate = false,
  preserveBreaks = false,
  className,
  children,
  ...rest
}: TextProps) {
  return (
    <Component
      className={classNames(
        styles.text,
        styles[size === 'xxl' ? 'xxl' : size],
        styles[tone],
        styles[weight],
        truncate && styles.truncate,
        preserveBreaks && styles.preserveBreaks,
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}
