import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Icon, Spinner } from '@atoms/index';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useOnClickOutside } from '@/hooks/useOnClickOutside';
import { useAsync } from '@/hooks/useAsync';
import { userApi } from '@/api/endpoints';
import { classNames } from '@/utils/format';
import styles from './SearchBar.module.css';

/** The chrome search field, with a live people-search dropdown. */
export function SearchBar() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const debounced = useDebouncedValue(query, 300);
  const { data, isLoading } = useAsync(
    () => (debounced.trim().length >= 2 ? userApi.search(debounced) : Promise.resolve([])),
    [debounced],
  );

  useOnClickOutside(containerRef, () => setIsOpen(false), isOpen);

  const results = data ?? [];
  const showDropdown = isOpen && debounced.trim().length >= 2;

  function openProfile(id: number) {
    setIsOpen(false);
    setQuery('');
    navigate(`/profile/${id}`);
  }

  /** Enter goes to the full results page rather than the first person found. */
  function openResults() {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    setIsOpen(false);
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className={styles.wrapper} ref={containerRef}>
      <div className={classNames(styles.field, isFocused && styles.fieldFocused)}>
        <Icon name="search" size={14} className={styles.icon} />
        <input
          className={styles.input}
          value={query}
          placeholder="Search"
          aria-label="Search Facebook"
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setIsFocused(true);
          }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') openResults();
          }}
        />
      </div>

      {showDropdown && (
        <div className={styles.results}>
          {isLoading && <Spinner size="sm" />}

          {!isLoading && results.length > 0 && <div className={styles.resultsHeader}>People</div>}

          {!isLoading && results.length === 0 && (
            <div className={styles.empty}>No people found for &ldquo;{debounced}&rdquo;</div>
          )}

          {!isLoading && (
            <button type="button" className={styles.seeAll} onClick={openResults}>
              See all results for &ldquo;{debounced}&rdquo;
            </button>
          )}

          {!isLoading &&
            results.map((person) => (
              <div
                key={person.id}
                className={styles.result}
                role="button"
                tabIndex={0}
                onClick={() => openProfile(person.id)}
                onKeyDown={(e) => e.key === 'Enter' && openProfile(person.id)}
              >
                <Avatar src={person.avatarUrl} name={person.fullName} size="sm" />
                <span className={styles.resultName}>{person.fullName}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
