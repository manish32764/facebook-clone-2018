import { useState } from 'react';
import { ComposerToolbar } from '@molecules/index';
import type { Privacy } from '@/types';
import { FriendPicker } from './FriendPicker';
import styles from './SocialDialogs.module.css';

export interface AudiencePickerProps {
  privacy: Privacy;
  audienceIds: number[];
  onChange: (privacy: Privacy, audienceIds: number[]) => void;
}

/**
 * The audience selector. "Friends except..." and "Specific friends..." open a
 * friend picker; the chosen names are summarised next to the select.
 */
export function AudiencePicker({ privacy, audienceIds, onChange }: AudiencePickerProps) {
  const [picking, setPicking] = useState<Privacy | null>(null);

  function choose(next: Privacy) {
    if (next === 'FRIENDS_EXCEPT' || next === 'SPECIFIC') {
      setPicking(next);
      return;
    }
    onChange(next, []);
  }

  const custom = privacy === 'FRIENDS_EXCEPT' || privacy === 'SPECIFIC';

  return (
    <span className={styles.audience}>
      <ComposerToolbar.Privacy value={privacy} onChange={choose} />
      {custom && (
        <button type="button" className={styles.audienceSummary} onClick={() => setPicking(privacy)}>
          {privacy === 'SPECIFIC' ? `${audienceIds.length} people` : `${audienceIds.length} excluded`}
        </button>
      )}

      {picking && (
        <FriendPicker
          title={picking === 'SPECIFIC' ? 'Specific friends' : 'Friends except...'}
          hint={
            picking === 'SPECIFIC'
              ? 'Only the people you pick will see this.'
              : 'Your friends will see this, apart from the people you pick.'
          }
          initialSelected={picking === privacy ? audienceIds : []}
          onClose={() => setPicking(null)}
          onConfirm={(ids) => {
            if (picking === 'SPECIFIC' && ids.length === 0) return;
            onChange(picking, ids);
          }}
        />
      )}
    </span>
  );
}
