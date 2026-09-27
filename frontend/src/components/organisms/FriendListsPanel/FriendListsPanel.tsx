import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Button, Card, Icon, Input, Spinner } from '@atoms/index';
import { EmptyState, MenuButton } from '@molecules/index';
import { useAsync } from '@/hooks/useAsync';
import { socialApi } from '@/api/endpoints';
import { FriendPicker } from '../SocialDialogs';
import type { FriendList } from '@/types';
import styles from '@/styles/Feature.module.css';

const HINT: Record<FriendList['kind'], string> = {
  CLOSE_FRIENDS: 'Their posts rank higher in your News Feed, and you can share posts and stories with just them.',
  ACQUAINTANCES: 'Their posts show up less often in your News Feed.',
  CUSTOM: 'A list you made.',
};

/** Close Friends, Acquaintances and your own lists, with members you can add and remove. */
export function FriendListsPanel() {
  const listsQuery = useAsync(() => socialApi.lists(), []);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState<FriendList | null>(null);

  const lists = listsQuery.data ?? [];

  function replace(updated: FriendList) {
    listsQuery.setData((current) => (current ?? []).map((l) => (l.id === updated.id ? updated : l)));
  }

  async function create() {
    if (!name.trim()) return;
    await socialApi.createList(name.trim());
    setName('');
    void listsQuery.reload();
  }

  async function rename(list: FriendList) {
    const next = window.prompt('Rename list', list.name);
    if (!next || !next.trim()) return;
    replace(await socialApi.renameList(list.id, next.trim()));
  }

  async function remove(list: FriendList) {
    if (!window.confirm(`Delete the list "${list.name}"? Nobody is unfriended.`)) return;
    await socialApi.deleteList(list.id);
    void listsQuery.reload();
  }

  async function addMembers(list: FriendList, ids: number[]) {
    const current = new Set(list.members.map((m) => m.id));
    let latest = list;
    for (const id of ids) {
      if (!current.has(id)) latest = await socialApi.addToList(list.id, id);
    }
    for (const member of list.members) {
      if (!ids.includes(member.id)) latest = await socialApi.removeFromList(list.id, member.id);
    }
    replace(latest);
  }

  if (listsQuery.isLoading && lists.length === 0) return <Spinner label="Loading lists" />;

  return (
    <div className={styles.stack}>
      <Card title="Create a list">
        <div className={styles.row}>
          <Input compact placeholder="e.g. Hiking Crew" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={() => void create()} disabled={!name.trim()}>
            Create
          </Button>
        </div>
      </Card>

      {lists.map((list) => (
        <Card
          key={list.id}
          title={
            <span className={styles.row}>
              <Icon name={list.kind === 'CLOSE_FRIENDS' ? 'star' : 'list'} size={14} /> {list.name} ({list.members.length})
            </span>
          }
          action={
            <span className={styles.rowWrap}>
              <Button size="sm" variant="secondary" onClick={() => setAdding(list)}>
                <Icon name="plus" size={11} /> Add friends
              </Button>
              {list.kind === 'CUSTOM' && (
                <MenuButton
                  items={[
                    { label: 'Rename list', icon: 'pencil', onClick: () => void rename(list) },
                    { label: 'Delete list', icon: 'trash', destructive: true, onClick: () => void remove(list) },
                  ]}
                />
              )}
            </span>
          }
        >
          <p className={styles.muted}>{HINT[list.kind]}</p>
          {list.members.length === 0 ? (
            <EmptyState icon="friends" title="Nobody on this list yet" />
          ) : (
            <div className={styles.list}>
              {list.members.map((member) => (
                <div key={member.id} className={styles.listRow}>
                  <Avatar src={member.avatarUrl} name={member.fullName} size="sm" />
                  <Link to={`/profile/${member.id}`} className={styles.listName}>
                    {member.fullName}
                  </Link>
                  <span className={styles.spacer} />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void socialApi.removeFromList(list.id, member.id).then(replace)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}

      {adding && (
        <FriendPicker
          title={`Add friends to ${adding.name}`}
          initialSelected={adding.members.map((m) => m.id)}
          confirmLabel="Save"
          onClose={() => setAdding(null)}
          onConfirm={(ids) => addMembers(adding, ids)}
        />
      )}
    </div>
  );
}
