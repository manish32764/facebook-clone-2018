import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '@templates/index';
import { Avatar, Button, Card, Icon, Input, Select, Spinner, TextArea } from '@atoms/index';
import { EmptyState, ErrorNotice, MediaUpload, Modal, Tabs } from '@molecules/index';
import { useAsync } from '@/hooks/useAsync';
import { useChat } from '@/hooks/useChat';
import { toErrorMessage } from '@/api/client';
import { datingApi } from '@/api/endpoints';
import { classNames } from '@/utils/format';
import type { DatingProfile } from '@/types';
import styles from '@/styles/Feature.module.css';
import local from './DatingPage.module.css';

type TabKey = 'discover' | 'matches' | 'profile';

/**
 * Dating: an opt-in profile kept apart from your timeline, suggestions that
 * never include your friends, and a Messenger thread when two people match.
 */
export function DatingPage() {
  const profileQuery = useAsync(() => datingApi.profile(), []);
  const [tab, setTab] = useState<TabKey>('discover');
  const profile = profileQuery.data;

  if (profileQuery.isLoading && profile === null) {
    return (
      <AppShell layout="wide" title="Dating">
        <Spinner label="Loading Dating" />
      </AppShell>
    );
  }

  return (
    <AppShell layout="wide" title="Dating">
      <Card className={classNames(styles.intro, local.hero)}>
        <span className={local.heroTitle}>
          <Icon name="heart" size={20} /> Dating
        </span>
        <p className={local.heroText}>
          Meet people outside your friends list. Your Dating profile is separate from your Facebook profile and
          friends are never suggested to each other.
        </p>
      </Card>

      {!profile ? (
        <Card title="Create your Dating profile">
          <ProfileForm onSaved={(saved) => profileQuery.setData(() => saved)} />
        </Card>
      ) : (
        <>
          <Tabs
            items={[
              { key: 'discover', label: 'Suggested Matches' },
              { key: 'matches', label: 'Matches' },
              { key: 'profile', label: 'Your Profile' },
            ]}
            active={tab}
            onChange={setTab}
          />
          <div className={styles.body}>
            {tab === 'discover' &&
              (profile.active ? (
                <Discover />
              ) : (
                <Card>
                  <EmptyState
                    icon="heart"
                    title="Your profile is paused"
                    description="Turn it back on to see suggestions again."
                    action={
                      <Button onClick={() => void datingApi.save({ active: true }).then((p) => profileQuery.setData(() => p))}>
                        Resume Dating
                      </Button>
                    }
                  />
                </Card>
              ))}
            {tab === 'matches' && <Matches />}
            {tab === 'profile' && (
              <Card title="Your Dating profile">
                <ProfileForm profile={profile} onSaved={(saved) => profileQuery.setData(() => saved)} />
              </Card>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}

function Discover() {
  const suggestionsQuery = useAsync(() => datingApi.suggestions(), []);
  const [index, setIndex] = useState(0);
  const [photo, setPhoto] = useState(0);
  const [match, setMatch] = useState<DatingProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const queue = suggestionsQuery.data ?? [];
  const current = queue[index];

  useEffect(() => setPhoto(0), [index]);

  async function swipe(liked: boolean) {
    if (!current) return;
    setError(null);
    try {
      const result = await datingApi.swipe(current.user.id, liked);
      if (result.matched && result.match) setMatch(result.match);
      setIndex((i) => i + 1);
    } catch (err) {
      setError(toErrorMessage(err, 'That did not go through'));
    }
  }

  if (suggestionsQuery.isLoading) return <Spinner label="Finding people" />;
  if (suggestionsQuery.error) return <ErrorNotice message={suggestionsQuery.error} onRetry={suggestionsQuery.reload} />;

  return (
    <div className={local.discover}>
      {!current ? (
        <Card>
          <EmptyState
            icon="heart"
            title="You're all caught up"
            description="Check back later for new people, or widen your age range in Your Profile."
            action={<Button onClick={() => { setIndex(0); void suggestionsQuery.reload(); }}>Refresh</Button>}
          />
        </Card>
      ) : (
        <div className={local.card}>
          <div className={local.photoHost}>
            <img className={local.photo} src={current.photoUrls[photo] ?? current.user.avatarUrl ?? ''} alt="" />
            {current.photoUrls.length > 1 && (
              <div className={local.dots}>
                {current.photoUrls.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    className={classNames(local.dot, i === photo && local.dotOn)}
                    aria-label={`Photo ${i + 1}`}
                    onClick={() => setPhoto(i)}
                  />
                ))}
              </div>
            )}
            <div className={local.caption}>
              <span className={local.name}>
                {current.user.firstName}
                {current.age != null && `, ${current.age}`}
              </span>
              {current.city && (
                <span className={local.sub}>
                  <Icon name="location" size={12} /> {current.city}
                </span>
              )}
            </div>
          </div>
          <div className={local.details}>
            {current.bio && <p className={styles.blurb}>{current.bio}</p>}
            {current.work && (
              <div className={styles.infoRow}>
                <Icon name="briefcase" size={14} /> {current.work}
              </div>
            )}
            {current.education && (
              <div className={styles.infoRow}>
                <Icon name="bookmark" size={14} /> {current.education}
              </div>
            )}
          </div>
          <div className={local.choices}>
            <button type="button" className={classNames(local.choice, local.pass)} onClick={() => void swipe(false)} aria-label="Pass">
              <Icon name="close" size={26} />
            </button>
            <button type="button" className={classNames(local.choice, local.like)} onClick={() => void swipe(true)} aria-label="Like">
              <Icon name="heart" size={26} />
            </button>
          </div>
          {error && <ErrorNotice message={error} />}
        </div>
      )}

      {match && <MatchDialog match={match} onClose={() => setMatch(null)} />}
    </div>
  );
}

function MatchDialog({ match, onClose }: { match: DatingProfile; onClose: () => void }) {
  const { openWith } = useChat();
  return (
    <Modal title="It's a match!" onClose={onClose} footer={<Button onClick={onClose}>Keep browsing</Button>}>
      <div className={local.matchBody}>
        <Avatar src={match.photoUrls[0] ?? match.user.avatarUrl} name={match.user.fullName} size="xl" circle />
        <p>
          You and <strong>{match.user.firstName}</strong> like each other. We started a conversation for you.
        </p>
        <Button
          onClick={() => {
            onClose();
            void openWith(match.user.id);
          }}
        >
          <Icon name="messenger" size={13} /> Say hi
        </Button>
      </div>
    </Modal>
  );
}

function Matches() {
  const { openWith } = useChat();
  const matchesQuery = useAsync(() => datingApi.matches(), []);
  const likesQuery = useAsync(() => datingApi.likes(), []);
  const matches = matchesQuery.data ?? [];

  return (
    <Card title={`Matches (${matches.length})`}>
      {(likesQuery.data?.count ?? 0) > 0 && (
        <p className={classNames(styles.notice, local.likes)}>
          <Icon name="heart" size={12} /> {likesQuery.data?.count} people have liked you
        </p>
      )}
      {matchesQuery.isLoading ? (
        <Spinner size="sm" />
      ) : matches.length === 0 ? (
        <EmptyState icon="heart" title="No matches yet" description="When you and someone like each other, they show up here." />
      ) : (
        <div className={styles.list}>
          {matches.map((m) => (
            <div key={m.user.id} className={styles.listRow}>
              <Avatar src={m.photoUrls[0] ?? m.user.avatarUrl} name={m.user.fullName} size="lg" circle />
              <span className={styles.listText}>
                <Link to={`/profile/${m.user.id}`} className={styles.listName}>
                  {m.user.fullName}
                  {m.age != null && `, ${m.age}`}
                </Link>
                <span className={styles.muted}>{m.city}</span>
              </span>
              <Button size="sm" onClick={() => void openWith(m.user.id)}>
                <Icon name="messenger" size={12} /> Message
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ProfileForm({ profile, onSaved }: { profile?: DatingProfile; onSaved: (p: DatingProfile) => void }) {
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [interestedIn, setInterestedIn] = useState<string>(profile?.interestedIn ?? 'EVERYONE');
  const [minAge, setMinAge] = useState(String(profile?.minAge ?? 21));
  const [maxAge, setMaxAge] = useState(String(profile?.maxAge ?? 45));
  const [city, setCity] = useState(profile?.city ?? '');
  const [photos, setPhotos] = useState<string[]>(profile?.photoUrls ?? []);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(active?: boolean) {
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      onSaved(
        await datingApi.save({
          bio: bio.trim(),
          interestedIn,
          minAge: Number(minAge),
          maxAge: Number(maxAge),
          city: city.trim(),
          photoUrls: photos,
          active: active ?? profile?.active ?? true,
        }),
      );
      setSaved(true);
    } catch (err) {
      setError(toErrorMessage(err, 'Your Dating profile could not be saved'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={styles.form}>
      <TextArea
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="Say a little about yourself"
        aria-label="Bio"
        bordered
        rows={3}
        minHeight={70}
      />
      <div className={styles.formRow}>
        <Select
          compact
          label="Interested in"
          value={interestedIn}
          onChange={(e) => setInterestedIn(e.target.value)}
          options={[
            { value: 'EVERYONE', label: 'Everyone' },
            { value: 'WOMEN', label: 'Women' },
            { value: 'MEN', label: 'Men' },
          ]}
        />
        <Input compact label="City" value={city} onChange={(e) => setCity(e.target.value)} />
      </div>
      <div className={styles.formRow}>
        <Input compact type="number" min="18" max="99" label="Age from" value={minAge} onChange={(e) => setMinAge(e.target.value)} />
        <Input compact type="number" min="18" max="99" label="Age to" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} />
      </div>
      <div className={local.photoPicker}>
        {photos.map((url, i) => (
          <span key={`${url}-${i}`} className={local.photoThumb}>
            <img src={url} alt="" />
            <button type="button" aria-label="Remove photo" onClick={() => setPhotos((p) => p.filter((_, x) => x !== i))}>
              <Icon name="close" size={10} />
            </button>
          </span>
        ))}
        {photos.length < 6 && (
          <MediaUpload variant="tile" multiple label="Add photos" onUploaded={(url) => setPhotos((p) => [...p, url].slice(0, 6))} />
        )}
      </div>
      <p className={styles.muted}>Your profile picture is used when you add no photos. You must be 18 or over.</p>
      {error && <ErrorNotice message={error} />}
      <div className={styles.rowWrap}>
        <Button onClick={() => void save()} disabled={isSaving}>
          {isSaving ? 'Saving…' : profile ? 'Save Profile' : 'Start Dating'}
        </Button>
        {profile && (
          <Button variant="secondary" disabled={isSaving} onClick={() => void save(!profile.active)}>
            {profile.active ? 'Pause profile' : 'Resume profile'}
          </Button>
        )}
        {saved && <span className={classNames(styles.pill, styles.pillGreen)}>Saved</span>}
      </div>
    </div>
  );
}
