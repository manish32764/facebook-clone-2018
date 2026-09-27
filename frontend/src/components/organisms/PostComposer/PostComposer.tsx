import { useState } from 'react';
import { Avatar, Button, Icon, Input, TextArea } from '@atoms/index';
import { ComposerToolbar, ErrorNotice, MediaUpload } from '@molecules/index';
import { toErrorMessage } from '@/api/client';
import { useAsync } from '@/hooks/useAsync';
import { friendApi } from '@/api/endpoints';
import { classNames } from '@/utils/format';
import { AudiencePicker } from '../SocialDialogs';
import type { CreatePostPayload, PageRef, Post, Privacy, User } from '@/types';
import styles from './PostComposer.module.css';

export interface PostComposerProps {
  author: User;
  onCreate: (payload: CreatePostPayload) => Promise<Post>;
  /** Set on a group page so the post lands in the group, not on a timeline. */
  groupId?: number;
  /** Set on a friend's profile: the post is written on their timeline. */
  wallOwner?: User;
  /** Set on a Page you own: the post is published as the Page. */
  page?: PageRef;
  placeholder?: string;
}

type Panel = 'photo' | 'video' | 'feeling' | 'location' | 'tag';

const TABS = [
  { key: 'status' as const, icon: 'pencil' as const, label: 'Update Status', panel: null },
  { key: 'photo' as const, icon: 'photo' as const, label: 'Photo/Video', panel: 'photo' as Panel },
  { key: 'feeling' as const, icon: 'smiley' as const, label: 'Feeling/Activity', panel: 'feeling' as Panel },
];

/** "What's on your mind?" - the status composer at the top of the feed. */
export function PostComposer({ author, onCreate, groupId, wallOwner, page, placeholder }: PostComposerProps) {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [feeling, setFeeling] = useState('');
  const [location, setLocation] = useState('');
  const [privacy, setPrivacy] = useState<Privacy>(wallOwner ? 'FRIENDS' : 'PUBLIC');
  const [audienceIds, setAudienceIds] = useState<number[]>([]);
  const [tagIds, setTagIds] = useState<number[]>([]);
  const [activePanel, setActivePanel] = useState<Panel | null>(null);
  const [showLinks, setShowLinks] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Only loaded when the tag panel is opened for the first time.
  const { data: friends } = useAsync(
    () => (activePanel === 'tag' ? friendApi.mine() : Promise.resolve([])),
    [activePanel === 'tag'],
  );

  const canPost =
    (content.trim().length > 0 || imageUrl.trim().length > 0 || videoUrl.trim().length > 0) && !isPosting;

  // A group, a Page or a friend's wall decides who sees the post, not the picker.
  const fixedAudience = Boolean(groupId || page);

  function reset() {
    setContent('');
    setImageUrl('');
    setVideoUrl('');
    setFeeling('');
    setLocation('');
    setPrivacy(wallOwner ? 'FRIENDS' : 'PUBLIC');
    setAudienceIds([]);
    setTagIds([]);
    setActivePanel(null);
    setShowLinks(false);
  }

  async function handleSubmit() {
    if (!canPost) return;

    setIsPosting(true);
    setError(null);
    setNotice(null);
    try {
      const created = await onCreate({
        content: content.trim(),
        imageUrl: imageUrl.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
        feeling: feeling.trim() || undefined,
        location: location.trim() || undefined,
        privacy: fixedAudience ? undefined : privacy,
        audienceUserIds: audienceIds.length > 0 ? audienceIds : undefined,
        groupId,
        pageId: page?.id,
        wallOwnerId: wallOwner?.id,
        tagUserIds: tagIds.length > 0 ? tagIds : undefined,
      });
      if (created.pending) setNotice('Your post was sent to the group admins for approval.');
      reset();
    } catch (err) {
      setError(toErrorMessage(err, 'Your post could not be shared'));
    } finally {
      setIsPosting(false);
    }
  }

  function togglePanel(panel: Panel) {
    setActivePanel((current) => (current === panel ? null : panel));
  }

  function toggleTag(userId: number) {
    setTagIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  }

  function attach(url: string, contentType: string) {
    if (contentType.startsWith('video/')) {
      setVideoUrl(url);
    } else {
      setImageUrl(url);
    }
  }

  const taggedNames = (friends ?? [])
    .filter((friend) => tagIds.includes(friend.user.id))
    .map((friend) => friend.user.fullName);

  const avatarSrc = page ? page.avatarUrl : author.avatarUrl;
  const avatarName = page ? page.name : author.fullName;
  const defaultPlaceholder = wallOwner
    ? `Write something to ${wallOwner.firstName}...`
    : page
      ? `Write a post as ${page.name}...`
      : `What's on your mind, ${author.firstName}?`;

  return (
    <section className={styles.card} aria-label="Create a post">
      <div className={styles.tabs} role="tablist">
        {TABS.map((tab) => {
          const isActive = tab.panel === null ? activePanel === null : activePanel === tab.panel;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              title={tab.label}
              className={classNames(styles.tab, isActive && styles.tabActive)}
              onClick={() => (tab.panel === null ? setActivePanel(null) : togglePanel(tab.panel))}
            >
              <Icon name={tab.icon} size={15} />
              <span className={styles.tabLabel}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.body}>
        <div className={styles.row}>
          <Avatar src={avatarSrc} name={avatarName} size="md" />
          <div className={styles.composerField}>
            <TextArea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={placeholder ?? defaultPlaceholder}
              aria-label="What's on your mind?"
              rows={2}
              minHeight={46}
            />
          </div>
        </div>

        {activePanel === 'photo' && (
          <div className={styles.panel}>
            <div className={styles.uploadRow}>
              <MediaUpload
                accept="image/*,video/*"
                label="Upload photo or video"
                onUploaded={attach}
              />
              <button type="button" className={styles.linkToggle} onClick={() => setShowLinks((v) => !v)}>
                {showLinks ? 'Hide links' : 'or paste a link'}
              </button>
            </div>
            {showLinks && (
              <>
                <Input
                  compact
                  label="Image URL"
                  placeholder="https://example.com/photo.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <Input
                  compact
                  label="Video URL"
                  placeholder="https://example.com/clip.mp4"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  hint="A post with a video also appears in Watch."
                />
              </>
            )}
          </div>
        )}

        {activePanel === 'feeling' && (
          <div className={styles.panel}>
            <Input
              compact
              label="How are you feeling?"
              placeholder="feeling nostalgic"
              value={feeling}
              onChange={(e) => setFeeling(e.target.value)}
            />
          </div>
        )}

        {activePanel === 'location' && (
          <div className={styles.panel}>
            <Input
              compact
              label="Where are you?"
              placeholder="Mumbai, India"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
        )}

        {activePanel === 'tag' && (
          <div className={styles.panel}>
            <span className={styles.panelLabel}>Tag friends in this post</span>
            <div className={styles.tagList}>
              {(friends ?? []).length === 0 ? (
                <p className={styles.tagEmpty}>Add some friends first.</p>
              ) : (
                (friends ?? []).map(({ user }) => (
                  <button
                    key={user.id}
                    type="button"
                    className={classNames(styles.tagChip, tagIds.includes(user.id) && styles.tagChipOn)}
                    aria-pressed={tagIds.includes(user.id)}
                    onClick={() => toggleTag(user.id)}
                  >
                    <Avatar src={user.avatarUrl} name={user.fullName} size="xs" circle />
                    {user.firstName}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {taggedNames.length > 0 && (
          <p className={styles.taggedLine}>
            <Icon name="tag" size={12} /> with {taggedNames.join(', ')}
          </p>
        )}

        {imageUrl.trim() && (
          <div className={styles.preview}>
            <img className={styles.previewImage} src={imageUrl} alt="Post preview" />
            <button
              type="button"
              className={styles.removeImage}
              aria-label="Remove image"
              onClick={() => setImageUrl('')}
            >
              <Icon name="close" size={12} />
            </button>
          </div>
        )}

        {videoUrl.trim() && (
          <div className={styles.preview}>
            <video className={styles.previewImage} src={videoUrl} controls preload="metadata" />
            <button
              type="button"
              className={styles.removeImage}
              aria-label="Remove video"
              onClick={() => setVideoUrl('')}
            >
              <Icon name="close" size={12} />
            </button>
          </div>
        )}

        {error && (
          <div className={styles.error}>
            <ErrorNotice message={error} />
          </div>
        )}
        {notice && <p className={styles.notice}>{notice}</p>}
      </div>

      <div className={styles.footer}>
        <ComposerToolbar activePanel={activePanel} onTogglePanel={togglePanel} />

        <span className={styles.footerSpacer} />

        <div className={styles.footerActions}>
          {!fixedAudience && (
            <AudiencePicker
              privacy={privacy}
              audienceIds={audienceIds}
              onChange={(next, ids) => {
                setPrivacy(next);
                setAudienceIds(ids);
              }}
            />
          )}
          <Button onClick={handleSubmit} disabled={!canPost}>
            {isPosting ? 'Posting…' : 'Post'}
          </Button>
        </div>
      </div>
    </section>
  );
}
