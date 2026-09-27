import { ICON_PATHS, type IconName } from './paths';

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  className?: string;
  title?: string;
}

export function Icon({ name, size = 16, color = 'currentColor', className, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={color}
      /* Several glyphs carry a hole (clock face, calendar body). */
      fillRule="evenodd"
      clipRule="evenodd"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
      style={{ flex: 'none', display: 'block' }}
    >
      {title && <title>{title}</title>}
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
