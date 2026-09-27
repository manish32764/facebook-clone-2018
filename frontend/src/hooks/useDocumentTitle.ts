import { useEffect } from 'react';

/** Mirrors the unread count into the tab title, the way the real site does. */
export function useDocumentTitle(title: string, badgeCount = 0) {
  useEffect(() => {
    document.title = badgeCount > 0 ? `(${badgeCount}) ${title}` : title;
  }, [title, badgeCount]);
}
