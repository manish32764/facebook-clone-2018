import { useEffect, type RefObject } from 'react';

/** Closes dropdowns when the user clicks elsewhere or presses Escape. */
export function useOnClickOutside(ref: RefObject<HTMLElement>, handler: () => void, active = true) {
  useEffect(() => {
    if (!active) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const element = ref.current;
      if (element && !element.contains(event.target as Node)) handler();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') handler();
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [ref, handler, active]);
}
