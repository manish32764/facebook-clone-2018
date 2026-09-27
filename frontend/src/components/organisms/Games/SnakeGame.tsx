import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@atoms/index';
import styles from './Games.module.css';

const SIZE = 20;
const CELL = 18;
const TICK_MS = 115;

type Point = { x: number; y: number };
type Direction = 'up' | 'down' | 'left' | 'right';

const MOVES: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const OPPOSITE: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };

const KEYS: Record<string, Direction> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
};

function randomFood(snake: Point[]): Point {
  for (;;) {
    const food = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
    if (!snake.some((p) => p.x === food.x && p.y === food.y)) return food;
  }
}

export interface GameProps {
  onGameOver: (score: number) => void;
}

/** Classic Snake on a 20x20 board. One point per apple. */
export function SnakeGame({ onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);

  const snake = useRef<Point[]>([{ x: 10, y: 10 }]);
  const food = useRef<Point>({ x: 15, y: 10 });
  const direction = useRef<Direction>('right');
  const queued = useRef<Direction>('right');
  const points = useRef(0);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#f5f6f7';
    ctx.fillRect(0, 0, SIZE * CELL, SIZE * CELL);
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(food.current.x * CELL + CELL / 2, food.current.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    snake.current.forEach((p, i) => {
      ctx.fillStyle = i === 0 ? '#29487d' : '#4267b2';
      ctx.fillRect(p.x * CELL + 1, p.y * CELL + 1, CELL - 2, CELL - 2);
    });
  }, []);

  const start = useCallback(() => {
    snake.current = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    direction.current = 'right';
    queued.current = 'right';
    food.current = randomFood(snake.current);
    points.current = 0;
    setScore(0);
    setOver(false);
    setRunning(true);
  }, []);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const next = KEYS[event.key];
      if (!next) return;
      event.preventDefault();
      if (next !== OPPOSITE[direction.current]) queued.current = next;
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      direction.current = queued.current;
      const move = MOVES[direction.current];
      const head = { x: snake.current[0].x + move.x, y: snake.current[0].y + move.y };
      const hitWall = head.x < 0 || head.y < 0 || head.x >= SIZE || head.y >= SIZE;
      const hitSelf = snake.current.some((p) => p.x === head.x && p.y === head.y);
      if (hitWall || hitSelf) {
        setRunning(false);
        setOver(true);
        onGameOver(points.current);
        return;
      }
      const ate = head.x === food.current.x && head.y === food.current.y;
      snake.current = [head, ...snake.current];
      if (ate) {
        points.current += 1;
        setScore(points.current);
        food.current = randomFood(snake.current);
      } else {
        snake.current.pop();
      }
      draw();
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [running, draw, onGameOver]);

  function steer(next: Direction) {
    if (next !== OPPOSITE[direction.current]) queued.current = next;
  }

  return (
    <div className={styles.game}>
      <div className={styles.scoreLine}>
        Score <strong>{score}</strong>
      </div>
      <div className={styles.boardHost}>
        <canvas ref={canvasRef} width={SIZE * CELL} height={SIZE * CELL} className={styles.canvas} />
        {!running && (
          <div className={styles.overlay}>
            {over && <span className={styles.overlayTitle}>Game over - {score} points</span>}
            <Button onClick={start}>{over ? 'Play Again' : 'Start'}</Button>
            <span className={styles.hint}>Arrow keys or WASD to steer</span>
          </div>
        )}
      </div>
      <div className={styles.pad}>
        <Button size="sm" variant="secondary" onClick={() => steer('up')}>&uarr;</Button>
        <span>
          <Button size="sm" variant="secondary" onClick={() => steer('left')}>&larr;</Button>
          <Button size="sm" variant="secondary" onClick={() => steer('down')}>&darr;</Button>
          <Button size="sm" variant="secondary" onClick={() => steer('right')}>&rarr;</Button>
        </span>
      </div>
    </div>
  );
}
