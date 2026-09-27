import { useCallback, useEffect, useState } from 'react';
import { Button } from '@atoms/index';
import { classNames } from '@/utils/format';
import type { GameProps } from './SnakeGame';
import styles from './Games.module.css';

type Board = number[][];
type Direction = 'up' | 'down' | 'left' | 'right';

const KEYS: Record<string, Direction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

function empty(): Board {
  return Array.from({ length: 4 }, () => [0, 0, 0, 0]);
}

function addTile(board: Board): Board {
  const free: [number, number][] = [];
  board.forEach((row, r) => row.forEach((v, c) => v === 0 && free.push([r, c])));
  if (free.length === 0) return board;
  const [r, c] = free[Math.floor(Math.random() * free.length)];
  const next = board.map((row) => [...row]);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

/** Slides one row left, merging equal neighbours once. Returns the row and points scored. */
function slideRow(row: number[]): [number[], number] {
  const tiles = row.filter((v) => v !== 0);
  const out: number[] = [];
  let points = 0;
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i] === tiles[i + 1]) {
      out.push(tiles[i] * 2);
      points += tiles[i] * 2;
      i++;
    } else {
      out.push(tiles[i]);
    }
  }
  while (out.length < 4) out.push(0);
  return [out, points];
}

function rotate(board: Board): Board {
  return board[0].map((_, c) => board.map((row) => row[c]).reverse());
}

/** Rotates so every move is a left slide, slides, then rotates back. */
function move(board: Board, direction: Direction): [Board, number] {
  const turns = { left: 0, down: 1, right: 2, up: 3 }[direction];
  let b = board;
  for (let i = 0; i < turns; i++) b = rotate(b);
  let points = 0;
  b = b.map((row) => {
    const [slid, p] = slideRow(row);
    points += p;
    return slid;
  });
  for (let i = 0; i < (4 - turns) % 4; i++) b = rotate(b);
  return [b, points];
}

function canMove(board: Board): boolean {
  return (['up', 'down', 'left', 'right'] as Direction[]).some(
    (d) => JSON.stringify(move(board, d)[0]) !== JSON.stringify(board),
  );
}

/** 2048: slide tiles, merge pairs, and your score is the sum of every merge. */
export function Game2048({ onGameOver }: GameProps) {
  const [board, setBoard] = useState<Board>(() => addTile(addTile(empty())));
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);

  const play = useCallback(
    (direction: Direction) => {
      if (over) return;
      const [next, points] = move(board, direction);
      if (JSON.stringify(next) === JSON.stringify(board)) return;
      const withTile = addTile(next);
      const total = score + points;
      setBoard(withTile);
      setScore(total);
      if (!canMove(withTile)) {
        setOver(true);
        onGameOver(total);
      }
    },
    [board, score, over, onGameOver],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const direction = KEYS[event.key];
      if (!direction) return;
      event.preventDefault();
      play(direction);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [play]);

  function restart() {
    setBoard(addTile(addTile(empty())));
    setScore(0);
    setOver(false);
  }

  function endNow() {
    setOver(true);
    onGameOver(score);
  }

  return (
    <div className={styles.game}>
      <div className={styles.scoreLine}>
        Score <strong>{score}</strong>
        {!over && score > 0 && (
          <Button size="sm" variant="ghost" onClick={endNow}>
            End &amp; save score
          </Button>
        )}
      </div>
      <div className={styles.boardHost}>
        <div className={styles.grid2048}>
          {board.flat().map((value, index) => (
            <span key={index} className={classNames(styles.tile2048, value > 0 && styles[`t${Math.min(value, 2048)}`])}>
              {value || ''}
            </span>
          ))}
        </div>
        {over && (
          <div className={styles.overlay}>
            <span className={styles.overlayTitle}>Game over - {score} points</span>
            <Button onClick={restart}>Play Again</Button>
          </div>
        )}
      </div>
      <div className={styles.pad}>
        <Button size="sm" variant="secondary" onClick={() => play('up')}>&uarr;</Button>
        <span>
          <Button size="sm" variant="secondary" onClick={() => play('left')}>&larr;</Button>
          <Button size="sm" variant="secondary" onClick={() => play('down')}>&darr;</Button>
          <Button size="sm" variant="secondary" onClick={() => play('right')}>&rarr;</Button>
        </span>
      </div>
      <span className={styles.hint}>Use the arrow keys to slide the tiles</span>
    </div>
  );
}
