import { Avatar, Icon, Link } from '@atoms/index';
import { MenuButton, type MenuItem } from '../MenuButton';
import { timeAgo, fullTimestamp } from '@/utils/time';
import { joinNames } from '@/utils/format';
import { PRIVACY_ICON, PRIVACY_LABEL } from '@/utils/labels';
import type { Post } from '@/types';
import styles from './PostHeader.module.css';

export interface PostHeaderProps {
  post: Post;
  /** The "..." menu; the card decides what the viewer is allowed to do. */
  menuItems: MenuItem[];
}

export function PostHeader({ post, menuItems }: PostHeaderProps) {
  const { author, feeling, location, privacy, createdAt, editedAt, group, taggedUsers, page, wallOwner } = post;
  const tagged = taggedUsers ?? [];

  // A Page post is shown as the Page, the way Facebook presents it.
  const name = page ? page.name : author.fullName;
  const avatar = page ? page.avatarUrl : author.avatarUrl;
  const href = page ? `/pages/${page.id}` : `/profile/${author.id}`;

  const audienceLabel = privacy === 'SPECIFIC' || privacy === 'FRIENDS_EXCEPT'
    ? `${PRIVACY_LABEL[privacy]}${post.audience && post.audience.length > 0
        ? `: ${joinNames(post.audience.map((u) => u.fullName), 3)}` : ''}`
    : PRIVACY_LABEL[privacy];

  return (
    <div className={styles.header}>
      <Link to={href} className={styles.avatarLink}>
        <Avatar src={avatar} name={name} size="md" />
      </Link>

      <div className={styles.body}>
        <div className={styles.nameRow}>
          <Link to={href} className={styles.author}>
            {name}
          </Link>

          {/* A group post reads "Name > Group"; a wall post reads "Name > Friend". */}
          {group && (
            <>
              <span className={styles.chevron}>
                <Icon name="chevronRight" size={12} />
              </span>
              <Link to={`/groups/${group.id}`} className={styles.author}>
                {group.name}
              </Link>
            </>
          )}
          {wallOwner && (
            <>
              <span className={styles.chevron}>
                <Icon name="chevronRight" size={12} />
              </span>
              <Link to={`/profile/${wallOwner.id}`} className={styles.author}>
                {wallOwner.fullName}
              </Link>
            </>
          )}

          {feeling && <span> is {feeling}</span>}

          {tagged.length > 0 && (
            <span>
              {' '}
              &mdash; with{' '}
              <strong>{joinNames(tagged.map((person) => person.fullName))}</strong>
            </span>
          )}

          {location && (
            <span>
              {' '}
              &mdash; at <strong>{location}</strong>
            </span>
          )}
        </div>

        <div className={styles.meta}>
          {post.pinned && (
            <>
              <span className={styles.pinned}>
                <Icon name="pin" size={11} /> Pinned
              </span>
              <span className={styles.dot}>&middot;</span>
            </>
          )}
          {page && (
            <>
              <span>{page.category}</span>
              <span className={styles.dot}>&middot;</span>
            </>
          )}
          <Link to={`/posts/${post.id}`} className={styles.time} title={fullTimestamp(createdAt)}>
            {timeAgo(createdAt)}
          </Link>
          {editedAt && (
            <>
              <span className={styles.dot}>&middot;</span>
              <span title={fullTimestamp(editedAt)}>Edited</span>
            </>
          )}
          <span className={styles.dot}>&middot;</span>
          <Icon name={PRIVACY_ICON[privacy] ?? 'globe'} size={12} title={audienceLabel} />
        </div>
      </div>

      <div className={styles.menu}>
        <MenuButton items={menuItems} label="Post options" />
      </div>
    </div>
  );
}
