import { useEffect, useState } from 'react';
import { Button } from '@atoms/index';
import { classNames } from '@/utils/format';
import type { GameProps } from './SnakeGame';
import styles from './Games.module.css';

const FACES = ['\u{1F436}', '\u{1F431}', '\u{1F98A}', '\u{1F43C}', '\u{1F438}', '\u{1F981}', '\u{1F419}', '\u{1F984}'];

interface Card {
  id: number;
  face: string;
  matched: boolean;
}

function deal(): Card[] {
  const cards = [...FACES, ...FACES].map((face, id) => ({ id, face, matched: false }));
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

/** Memory Match: find all eight pairs. Fewer moves and less time score higher. */
export function MemoryGame({ onGameOver }: GameProps) {
  const [cards, setCards] = useState<Card[]>(deal);
  const [open, setOpen] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [finalScore, setFinalScore] = useState<number | null>(null);

  useEffect(() => {
    if (startedAt === null || finalScore !== null) return;
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 500);
    return () => window.clearInterval(timer);
  }, [startedAt, finalScore]);

  function flip(index: number) {
    if (open.length === 2 || open.includes(index) || cards[index].matched || finalScore !== null) return;
    if (startedAt === null) setStartedAt(Date.now());
    const nextOpen = [...open, index];
    setOpen(nextOpen);
    if (nextOpen.length < 2) return;

    const nextMoves = moves + 1;
    setMoves(nextMoves);
    const [a, b] = nextOpen;
    if (cards[a].face === cards[b].face) {
      const next = cards.map((card, i) => (i === a || i === b ? { ...card, matched: true } : card));
      setCards(next);
      setOpen([]);
      if (next.every((card) => card.matched)) {
        const elapsed = Math.floor((Date.now() - (startedAt ?? Date.now())) / 1000);
        const score = Math.max(100, 1000 - (nextMoves - 8) * 25 - elapsed * 3);
        setFinalScore(score);
        onGameOver(score);
      }
    } else {
      window.setTimeout(() => setOpen([]), 800);
    }
  }

  function restart() {
    setCards(deal());
    setOpen([]);
    setMoves(0);
    setStartedAt(null);
    setSeconds(0);
    setFinalScore(null);
  }

  return (
    <div className={styles.game}>
      <div className={styles.scoreLine}>
        Moves <strong>{moves}</strong> &middot; Time <strong>{seconds}s</strong>
      </div>
      <div className={styles.boardHost}>
        <div className={styles.memoryGrid}>
          {cards.map((card, index) => {
            const shown = card.matched || open.includes(index);
            return (
              <button
                key={card.id}
                type="button"
                className={classNames(styles.memoryCard, shown && styles.memoryShown, card.matched && styles.memoryMatched)}
                onClick={() => flip(index)}
                aria-label={shown ? card.face : 'Hidden card'}
              >
                {shown ? card.face : ''}
              </button>
            );
          })}
        </div>
        {finalScore !== null && (
          <div className={styles.overlay}>
            <span className={styles.overlayTitle}>All pairs found - {finalScore} points</span>
            <Button onClick={restart}>Play Again</Button>
          </div>
        )}
      </div>
      <span className={styles.hint}>Flip two cards at a time and remember where they are</span>
    </div>
  );
}
