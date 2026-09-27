import { useRef, useState, type ReactNode } from 'react';
import { Icon, type IconName } from '@atoms/index';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { classNames } from '@/utils/format';
import styles from './MenuButton.module.css';

export interface MenuItem {
  label: string;
  icon?: IconName;
  onClick: () => void;
  destructive?: boolean;
  /** Draws a rule above this item. */
  divider?: boolean;
  hidden?: boolean;
}

export interface MenuButtonProps {
  items: MenuItem[];
  /** Custom trigger content; the three-dot glyph by default. */
  trigger?: ReactNode;
  label?: string;
  align?: 'left' | 'right';
  /** A bordered button rather than a bare icon. */
  bordered?: boolean;
}

/** A trigger with a dropdown of actions - the "..." menus on posts and profiles. */
export function MenuButton({ items, trigger, label = 'More options', align = 'right', bordered = false }: MenuButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOnClickOutside(ref, () => setOpen(false), open);

  const visible = items.filter((item) => !item.hidden);
  if (visible.length === 0) return null;

  return (
    <div className={styles.host} ref={ref}>
      <button
        type="button"
        className={classNames(styles.trigger, bordered && styles.bordered)}
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {trigger ?? <Icon name="more" size={18} />}
      </button>

      {open && (
        <div className={classNames(styles.menu, styles[align])} role="menu">
          {visible.map((item) => (
            <div key={item.label}>
              {item.divider && <div className={styles.divider} />}
              <button
                type="button"
                role="menuitem"
                className={classNames(styles.item, item.destructive && styles.destructive)}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
              >
                {item.icon && <Icon name={item.icon} size={14} />}
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
