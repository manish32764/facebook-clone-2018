import { useEffect, useRef } from 'react';

/**
 * Runs a callback straight away, then on an interval, and again as soon as the
 * tab regains focus.
 *
 * This is what stands in for a websocket: chat, notification badges and typing
 * indicators all refresh through it. Polling pauses while the tab is hidden, so
 * a backgrounded window costs nothing.
 */
export function usePolling(callback: () => void, intervalMs: number, active = true) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!active || intervalMs <= 0) return;

    let timer = 0;

    function tick() {
      if (!document.hidden) callbackRef.current();
    }

    function start() {
      window.clearInterval(timer);
      timer = window.setInterval(tick, intervalMs);
    }

    function onVisibilityChange() {
      if (document.hidden) {
        window.clearInterval(timer);
      } else {
        // Catch up immediately rather than waiting out the interval.
        callbackRef.current();
        start();
      }
    }

    // Fire on mount as well: without this the chat list and the chrome badges
    // would sit empty for a whole interval after every navigation.
    tick();
    start();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [intervalMs, active]);
}
