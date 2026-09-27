import { useState } from 'react';
import { Button, Input, Select, TextArea } from '@atoms/index';
import { ErrorNotice, MediaUpload, Modal } from '@molecules/index';
import { toErrorMessage } from '@/api/client';
import { marketplaceApi } from '@/api/endpoints';
import { CONDITIONS } from '@/utils/labels';
import type { Listing, ListingCondition } from '@/types';
import styles from './CreateDialogs.module.css';

export interface CreateListingDialogProps {
  categories: string[];
  onClose: () => void;
  onCreated: (listing: Listing) => void;
  /** Edit this listing instead of creating a new one. */
  listing?: Listing;
}

export function CreateListingDialog({ categories, onClose, onCreated, listing }: CreateListingDialogProps) {
  const [title, setTitle] = useState(listing?.title ?? '');
  const [description, setDescription] = useState(listing?.description ?? '');
  const [price, setPrice] = useState(listing ? String(listing.price) : '');
  const [category, setCategory] = useState(listing?.category ?? categories[0] ?? 'Electronics');
  const [location, setLocation] = useState(listing?.location ?? '');
  const [imageUrl, setImageUrl] = useState(listing?.imageUrl ?? '');
  const [condition, setCondition] = useState<ListingCondition>(listing?.condition ?? 'USED_GOOD');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceValue = Number(price);
  const canSave = title.trim().length > 0 && price !== '' && Number.isFinite(priceValue) && priceValue >= 0;

  async function submit() {
    if (!canSave || isSaving) return;
    setIsSaving(true);
    setError(null);
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      price: priceValue,
      category,
      location: location.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      condition,
    };
    try {
      onCreated(
        listing
          ? await marketplaceApi.update(listing.id, { ...payload, description: description.trim(), location: location.trim(), imageUrl: imageUrl.trim() })
          : await marketplaceApi.create(payload),
      );
    } catch (err) {
      setError(toErrorMessage(err, listing ? 'Your changes could not be saved' : 'That listing could not be created'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      title={listing ? 'Edit listing' : 'List something for sale'}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={!canSave || isSaving}>
            {isSaving ? 'Saving…' : listing ? 'Save Changes' : 'Publish Listing'}
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <Input
          compact
          label="What are you selling?"
          placeholder="Canon AE-1 Program with 50mm f/1.8"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />

        <div className={styles.row}>
          <Input
            compact
            type="number"
            min="0"
            step="0.01"
            label="Price (USD)"
            placeholder="245"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            hint="Enter 0 to list it as free."
          />
          <Select
            compact
            label="Category"
            options={categories.map((name) => ({ value: name, label: name }))}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          />
        </div>

        <TextArea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Condition, history, anything a buyer should know"
          aria-label="Listing description"
          rows={3}
          minHeight={70}
        />

        <div className={styles.row}>
          <Select
            compact
            label="Condition"
            options={CONDITIONS}
            value={condition}
            onChange={(event) => setCondition(event.target.value as ListingCondition)}
          />
          <Input
            compact
            label="Location"
            placeholder="London, UK"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        </div>

        <div className={styles.row}>
          <MediaUpload label="Upload photo" onUploaded={(url) => setImageUrl(url)} />
          <Input
            compact
            placeholder="…or paste a photo link"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
          />
        </div>
        {imageUrl && <img className={styles.preview} src={imageUrl} alt="Listing preview" />}

        {error && <ErrorNotice message={error} />}
      </div>
    </Modal>
  );
}
