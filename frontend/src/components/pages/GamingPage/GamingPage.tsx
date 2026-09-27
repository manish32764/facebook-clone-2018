import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '@templates/index';
import { Avatar, Button, Card, Icon, Spinner } from '@atoms/index';
import { EmptyState, ErrorNotice } from '@molecules/index';
import { Game2048, MemoryGame, SnakeGame } from '@organisms/index';
import { useAsync } from '@/hooks/useAsync';
import { gameApi } from '@/api/endpoints';
import { classNames, pluralize } from '@/utils/format';
import type { GameKey, Leader, ScoreResult } from '@/types';
import styles from '@/styles/Feature.module.css';
import local from './GamingPage.module.css';

const GLYPH: Record<GameKey, string> = { SNAKE: '\u{1F40D}', G2048: '2048', MEMORY: '\u{1F0CF}' };

function Leaderboard({ leaders, viewerId }: { leaders: Leader[]; viewerId?: number }) {
  if (leaders.length === 0) return <p className={styles.muted}>No scores yet. Be the first!</p>;
  return (
    <div className={styles.list}>
      {leaders.map((leader) => (
        <div key={leader.user.id} className={classNames(styles.listRow, leader.user.id === viewerId && local.me)}>
          <span className={local.rank}>{leader.rank}</span>
          <Avatar src={leader.user.avatarUrl} name={leader.user.fullName} size="sm" circle />
          <Link to={`/profile/${leader.user.id}`} className={classNames(styles.listName, local.leaderName)}>
            {leader.user.fullName}
          </Link>
          <strong>{leader.score.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
}

/** Instant games: pick one, and see how your friends are doing. */
export function GamingPage() {
  const navigate = useNavigate();
  const gamesQuery = useAsync(() => gameApi.catalog(), []);
  const games = gamesQuery.data ?? [];

  return (
    <AppShell layout="wide" title="Gaming">
      <Card title="Gaming" className={styles.intro}>
        <p className={styles.blurb}>Instant games that play right here. Beat your friends on the leaderboards.</p>
      </Card>

      {gamesQuery.isLoading && games.length === 0 ? (
        <Spinner label="Loading games" />
      ) : (
        <div className={local.games}>
          {games.map((game) => (
            <Card key={game.key} padded={false} className={local.gameCard}>
              <Link to={`/gaming/${game.key.toLowerCase()}`} className={local.gameArt} style={{ background: game.color }}>
                <span className={local.glyph}>{GLYPH[game.key]}</span>
              </Link>
              <div className={local.gameBody}>
                <span className={styles.tileTitle}>{game.name}</span>
                <span className={styles.muted}>{game.description}</span>
                <span className={styles.meta}>
                  Your best: <strong className={styles.strong}>{game.myBest.toLocaleString()}</strong> &middot; played{' '}
                  {pluralize(game.myPlays, 'time')}
                </span>
                <span className={local.subhead}>Friends leaderboard</span>
                <Leaderboard leaders={game.leaders} />
                <Button fullWidth onClick={() => navigate(`/gaming/${game.key.toLowerCase()}`)}>
                  <Icon name="play" size={12} /> Play
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}

/** One game, full size, with its leaderboard beside it. */
export function GamePage() {
  const { game: slug } = useParams<{ game: string }>();
  const key = (slug ?? '').toUpperCase() as GameKey;
  const leaderboardQuery = useAsync(() => gameApi.leaderboard(key), [key]);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGameOver = useCallback(
    (score: number) => {
      setError(null);
      gameApi
        .submit(key, score)
        .then((saved) => {
          setResult(saved);
          leaderboardQuery.setData(() => saved.leaders);
        })
        .catch(() => setError('Your score could not be saved.'));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  const known = key === 'SNAKE' || key === 'G2048' || key === 'MEMORY';
  const names: Record<GameKey, string> = { SNAKE: 'Snake', G2048: '2048', MEMORY: 'Memory Match' };

  return (
    <AppShell layout="wide" title={known ? names[key] : 'Gaming'}>
      <Link to="/gaming" className={local.back}>
        <Icon name="arrowLeft" size={14} /> All games
      </Link>
      {!known ? (
        <Card>
          <EmptyState icon="gamepad" title="That game does not exist" />
        </Card>
      ) : (
        <div className={styles.twoCol}>
          <Card title="Leaderboard">
            <Leaderboard leaders={leaderboardQuery.data ?? []} />
          </Card>
          <Card title={names[key]}>
            {result && (
              <p className={classNames(styles.notice, local.result)}>
                {result.newBest ? `New personal best: ${result.score.toLocaleString()}!` : `Scored ${result.score.toLocaleString()} (best ${result.best.toLocaleString()})`}
              </p>
            )}
            {error && <ErrorNotice message={error} />}
            {key === 'SNAKE' && <SnakeGame onGameOver={handleGameOver} />}
            {key === 'G2048' && <Game2048 onGameOver={handleGameOver} />}
            {key === 'MEMORY' && <MemoryGame onGameOver={handleGameOver} />}
          </Card>
        </div>
      )}
    </AppShell>
  );
}
