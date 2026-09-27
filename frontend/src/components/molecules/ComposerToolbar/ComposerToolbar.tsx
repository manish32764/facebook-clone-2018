import { Icon } from '@atoms/index';
import { classNames } from '@/utils/format';
import type { Privacy } from '@/types';
import styles from './ComposerToolbar.module.css';

export type ComposerPanel = 'photo' | 'video' | 'feeling' | 'location' | 'tag';

export interface ComposerToolbarProps {
  activePanel: ComposerPanel | null;
  onTogglePanel: (panel: ComposerPanel) => void;
}

const TOOLS = [
  { panel: 'photo' as const, icon: 'photo' as const, label: 'Photo', tint: styles.photo },
  { panel: 'feeling' as const, icon: 'smiley' as const, label: 'Feeling', tint: styles.feeling },
  { panel: 'location' as const, icon: 'location' as const, label: 'Check in', tint: styles.place },
  { panel: 'tag' as const, icon: 'tag' as const, label: 'Tag friends', tint: styles.tag },
];

export function ComposerToolbar({ activePanel, onTogglePanel }: ComposerToolbarProps) {
  return (
    <div className={styles.toolbar}>
      {TOOLS.map((tool) => (
        <button
          key={tool.panel}
          type="button"
          title={tool.label}
          aria-pressed={activePanel === tool.panel}
          className={classNames(styles.tool, activePanel === tool.panel && styles.active)}
          onClick={() => onTogglePanel(tool.panel)}
        >
          <Icon name={tool.icon} size={16} className={tool.tint} />
          <span className={styles.toolLabel}>{tool.label}</span>
        </button>
      ))}
    </div>
  );
}

export interface PrivacySelectProps {
  value: Privacy;
  onChange: (privacy: Privacy) => void;
}

/** Attached to the toolbar so the composer footer imports one thing, not two. */
function PrivacySelect({ value, onChange }: PrivacySelectProps) {
  return (
    <select
      className={styles.privacy}
      value={value}
      aria-label="Who can see this post"
      onChange={(e) => onChange(e.target.value as Privacy)}
    >
      <option value="PUBLIC">Public</option>
      <option value="FRIENDS">Friends</option>
      <option value="FRIENDS_EXCEPT">Friends except...</option>
      <option value="SPECIFIC">Specific friends...</option>
      <option value="CLOSE_FRIENDS">Close Friends</option>
      <option value="ONLY_ME">Only me</option>
    </select>
  );
}

ComposerToolbar.Privacy = PrivacySelect;
