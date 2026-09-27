import { classNames } from '@/utils/format';
import styles from './Tabs.module.css';

export interface TabItem<T extends string> {
  key: T;
  label: string;
  count?: number;
}

export interface TabsProps<T extends string> {
  items: TabItem<T>[];
  active: T;
  onChange: (key: T) => void;
  /** The white strip used on list pages, rather than the blue profile bar. */
  variant?: 'panel' | 'plain';
}

/** One horizontal tab strip, reused by Friends, Search, Groups and Events. */
export function Tabs<T extends string>({ items, active, onChange, variant = 'panel' }: TabsProps<T>) {
  return (
    <div className={classNames(styles.tabs, styles[variant])} role="tablist">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={item.key === active}
          className={classNames(styles.tab, item.key === active && styles.active)}
          onClick={() => onChange(item.key)}
        >
          {item.label}
          {item.count !== undefined && item.count > 0 && (
            <span className={styles.count}>{item.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
