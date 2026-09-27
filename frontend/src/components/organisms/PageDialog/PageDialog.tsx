import { useState } from 'react';
import { Button, Input, Select, TextArea } from '@atoms/index';
import { ErrorNotice, MediaUpload, Modal } from '@molecules/index';
import { useAsync } from '@/hooks/useAsync';
import { toErrorMessage } from '@/api/client';
import { pageApi } from '@/api/endpoints';
import type { Page } from '@/types';
import styles from '@/styles/Feature.module.css';

export interface PageDialogProps {
  /** Edit this Page; create a new one when absent. */
  page?: Page;
  onClose: () => void;
  onSaved: (page: Page) => void;
}

/** Create a Page, or edit one you own. */
export function PageDialog({ page, onClose, onSaved }: PageDialogProps) {
  const categoriesQuery = useAsync(() => pageApi.categories(), []);
  const [name, setName] = useState(page?.name ?? '');
  const [category, setCategory] = useState(page?.category ?? 'Local Business');
  const [description, setDescription] = useState(page?.description ?? '');
  const [avatarUrl, setAvatarUrl] = useState(page?.avatarUrl ?? '');
  const [coverUrl, setCoverUrl] = useState(page?.coverUrl ?? '');
  const [website, setWebsite] = useState(page?.website ?? '');
  const [phone, setPhone] = useState(page?.phone ?? '');
  const [location, setLocation] = useState(page?.location ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setIsSaving(true);
    setError(null);
    const payload = {
      name: name.trim(),
      category,
      description: description.trim() || undefined,
      avatarUrl: avatarUrl.trim() || undefined,
      coverUrl: coverUrl.trim() || undefined,
      website: website.trim() || undefined,
      phone: phone.trim() || undefined,
      location: location.trim() || undefined,
    };
    try {
      onSaved(page ? await pageApi.update(page.id, payload) : await pageApi.create(payload));
    } catch (err) {
      setError(toErrorMessage(err, 'The Page could not be saved'));
    } finally {
      setIsSaving(false);
    }
  }

  const categories = categoriesQuery.data ?? [category];

  return (
    <Modal
      title={page ? 'Edit Page' : 'Create a Page'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={!name.trim() || isSaving}>
            {isSaving ? 'Saving…' : page ? 'Save' : 'Create Page'}
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <p className={styles.muted}>
          Connect with customers, fans and followers. Your Page can post, run ads and list jobs.
        </p>
        <div className={styles.formRow}>
          <Input compact label="Page name" placeholder="Morning Ritual Coffee" value={name} onChange={(e) => setName(e.target.value)} />
          <Select
            compact
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={categories.map((c) => ({ value: c, label: c }))}
          />
        </div>
        <TextArea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell people what your Page is about"
          aria-label="Description"
          bordered
          rows={3}
          minHeight={70}
        />
        <div className={styles.formRow}>
          <div className={styles.stack}>
            <MediaUpload label="Upload profile picture" onUploaded={(url) => setAvatarUrl(url)} />
            {avatarUrl && <img className={styles.previewImage} src={avatarUrl} alt="Profile picture preview" />}
          </div>
          <div className={styles.stack}>
            <MediaUpload label="Upload cover photo" onUploaded={(url) => setCoverUrl(url)} />
            {coverUrl && <img className={styles.previewImage} src={coverUrl} alt="Cover preview" />}
          </div>
        </div>
        <div className={styles.formRow}>
          <Input compact label="Website" placeholder="https://" value={website} onChange={(e) => setWebsite(e.target.value)} />
          <Input compact label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <Input compact label="Location" placeholder="City, Country" value={location} onChange={(e) => setLocation(e.target.value)} />
        {error && <ErrorNotice message={error} />}
      </div>
    </Modal>
  );
}
