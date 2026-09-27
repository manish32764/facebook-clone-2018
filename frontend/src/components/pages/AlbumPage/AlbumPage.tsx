import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '@templates/index';
import { Avatar, Button, Card, Icon, Spinner } from '@atoms/index';
import { EmptyState, ErrorNotice } from '@molecules/index';
import { AlbumDialog, PhotoLightbox } from '@organisms/index';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/hooks/useAuth';
import { albumApi } from '@/api/endpoints';
import { pluralize } from '@/utils/format';
import { timeAgo } from '@/utils/time';
import styles from '@/styles/Feature.module.css';
import local from './AlbumPage.module.css';

/** One photo album: its grid, the theatre view, and editing for the owner. */
export function AlbumPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { albumId } = useParams<{ albumId: string }>();
  const id = Number(albumId);

  const albumQuery = useAsync(() => albumApi.one(id), [id]);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const album = albumQuery.data;
  const isOwner = album?.owner.id === user?.id;

  async function deletePhoto(photoId: number) {
    if (!window.confirm('Delete this photo?')) return;
    await albumApi.deletePhoto(photoId);
    void albumQuery.reload();
  }

  async function deleteAlbum() {
    if (!album || !window.confirm(`Delete the album "${album.title}" and all its photos?`)) return;
    await albumApi.remove(album.id);
    navigate(`/profile/${album.owner.id}`);
  }

  if (albumQuery.isLoading && !album) {
    return (
      <AppShell layout="profile" title="Album">
        <Spinner label="Loading album" />
      </AppShell>
    );
  }

  if (albumQuery.error || !album) {
    return (
      <AppShell layout="profile" title="Album">
        <ErrorNotice message={albumQuery.error ?? 'That album could not be found'} onRetry={albumQuery.reload} />
      </AppShell>
    );
  }

  return (
    <AppShell layout="profile" title={album.title}>
      <Card
        className={styles.section}
        title={album.title}
        action={
          isOwner ? (
            <span className={styles.rowWrap}>
              <Button size="sm" onClick={() => setIsAdding(true)}>
                <Icon name="plus" size={12} /> Add Photos
              </Button>
              <Button size="sm" variant="danger" onClick={() => void deleteAlbum()}>
                Delete Album
              </Button>
            </span>
          ) : undefined
        }
      >
        <div className={styles.row}>
          <Avatar src={album.owner.avatarUrl} name={album.owner.fullName} size="sm" />
          <span className={styles.meta}>
            <Link to={`/profile/${album.owner.id}`}>{album.owner.fullName}</Link> &middot; {pluralize(album.photoCount, 'photo')}
            &middot; created {timeAgo(album.createdAt)}
          </span>
        </div>
        {album.description && <p className={local.description}>{album.description}</p>}
      </Card>

      <Card>
        {album.photos.length === 0 ? (
          <EmptyState icon="photo" title="This album is empty" />
        ) : (
          <div className={local.grid}>
            {album.photos.map((photo, index) => (
              <div key={photo.id} className={local.cell}>
                <button type="button" className={local.photoButton} onClick={() => setLightbox(index)} aria-label="View photo">
                  <img src={photo.url} alt={photo.caption ?? ''} loading="lazy" />
                </button>
                {isOwner && (
                  <button type="button" className={local.remove} aria-label="Delete photo" onClick={() => void deletePhoto(photo.id)}>
                    <Icon name="trash" size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {lightbox !== null && (
        <PhotoLightbox
          images={album.photos.map((p) => p.url)}
          startIndex={lightbox}
          caption={album.title}
          onClose={() => setLightbox(null)}
        />
      )}

      {isAdding && (
        <AlbumDialog
          album={album}
          onClose={() => setIsAdding(false)}
          onSaved={(updated) => {
            setIsAdding(false);
            albumQuery.setData(() => updated);
          }}
        />
      )}
    </AppShell>
  );
}
