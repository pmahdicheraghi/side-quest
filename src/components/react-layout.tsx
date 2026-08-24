import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { iconPaths } from '../app/icons';
import { useI18n } from '../app/i18n';

export function Icon({ name, className = 'icon' }: { name: string; className?: string }) {
  return (
    <svg
      className={`${className} icon-${name}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: iconPaths[name] ?? '' }}
    />
  );
}

export function GameHeader({
  title,
  statIcon,
  statLabel,
  statValue,
  statSuffix,
  onExit,
}: {
  title: string;
  statIcon: string;
  statLabel: string;
  statValue: string | number;
  statSuffix?: ReactNode;
  onExit: () => void;
}) {
  const { t } = useI18n();
  return (
    <header className="topbar game-topbar">
      <button type="button" className="icon-btn" onClick={onExit} aria-label={t('backToMenu')}>
        <Icon name="back" />
      </button>
      <h1 className="topbar-title">{title}</h1>
      <div className="game-topbar-stat">
        <Icon name={statIcon} />
        <span>{statLabel}</span>
        <b>{statValue}</b>
        {statSuffix}
      </div>
    </header>
  );
}

export function ScoreStrip({
  leftLabel,
  leftMark,
  rightLabel,
  rightMark,
  scores,
}: {
  leftLabel: string;
  leftMark: string;
  rightLabel: string;
  rightMark: string;
  scores: Record<'X' | 'O', number>;
}) {
  const { language, t } = useI18n();
  const formatScore = (score: number) => new Intl.NumberFormat(language === 'fa' ? 'fa-IR' : 'en').format(score);
  return (
    <section className="score-strip">
      <div className={`score-player score-player-x ${scores.X > scores.O ? 'is-leading' : ''}`}>
        <b className="score-mark x-label" aria-hidden="true">
          {leftMark}
        </b>
        <span className="score-copy">
          <small>{leftLabel}</small>
          <strong>{formatScore(scores.X)}</strong>
        </span>
      </div>
      <div className="score-divider" aria-hidden="true">
        <span>{t('versus')}</span>
      </div>
      <div className={`score-player score-player-o ${scores.O > scores.X ? 'is-leading' : ''}`}>
        <b className="score-mark o-label" aria-hidden="true">
          {rightMark}
        </b>
        <span className="score-copy">
          <small>{rightLabel}</small>
          <strong>{formatScore(scores.O)}</strong>
        </span>
      </div>
    </section>
  );
}

export function GameActions({
  resetLabel,
  onReset,
  onExit,
  resetDisabled = false,
}: {
  resetLabel: string;
  onReset: () => void;
  onExit: () => void;
  resetDisabled?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="game-actions">
      <button type="button" className="primary-btn" onClick={onReset} disabled={resetDisabled}>
        {resetLabel} <Icon name="arrow" />
      </button>
      <button type="button" className="text-btn" onClick={onExit}>
        {t('quitToMenu')}
      </button>
    </div>
  );
}

const MATCH_RESULT_DURATION = 3200;
const CELEBRATION_COLORS = ['#d6f36a', '#ff9a62', '#65d8ff', '#ff70ad', '#b98cff', '#ffe066'];
const CELEBRATION_PIECES = Array.from({ length: 72 }, (_, index) => {
  const launchesFromLeft = index % 2 === 0;
  const spin = (index % 2 ? 1 : -1) * (560 + ((index * 71) % 760));
  const horizontalBurst = 24 + ((index * 37) % 168);
  const exitX = launchesFromLeft ? horizontalBurst + 34 : -horizontalBurst - 34;
  return {
    left: `${launchesFromLeft ? 10 + ((index * 17) % 15) : 75 + ((index * 17) % 15)}%`,
    color: CELEBRATION_COLORS[index % CELEBRATION_COLORS.length],
    delay: `${60 + ((index * 53) % 520)}ms`,
    duration: `${1850 + ((index * 97) % 620)}ms`,
    width: `${6 + ((index * 3) % 7)}px`,
    height: `${12 + ((index * 5) % 14)}px`,
    exitX: `${exitX + ((index * 19) % 42) - 21}px`,
    exitY: `${-(390 + ((index * 23) % 95))}px`,
    spin: `${spin}deg`,
    shape: index % 9 === 0 ? 'is-streamer' : index % 5 === 0 ? 'is-circle' : index % 6 === 0 ? 'is-diamond' : '',
  };
});

export function MatchResultOverlay({ message, onComplete }: { message: string; onComplete: () => void }) {
  const { t } = useI18n();

  useEffect(() => {
    const timeout = window.setTimeout(onComplete, MATCH_RESULT_DURATION);
    return () => window.clearTimeout(timeout);
  }, [onComplete]);

  return (
    <div className="match-result-overlay" role="status" aria-live="assertive" aria-atomic="true">
      <div className="match-result-card">
        <div className="celebration-confetti" aria-hidden="true">
          {CELEBRATION_PIECES.map((piece, index) => (
            <span
              className={`confetti-piece ${piece.shape}`}
              key={index}
              style={
                {
                  left: piece.left,
                  color: piece.color,
                  backgroundColor: piece.color,
                  animationDelay: piece.delay,
                  animationDuration: piece.duration,
                  '--confetti-width': piece.width,
                  '--confetti-height': piece.height,
                  '--confetti-exit-x': piece.exitX,
                  '--confetti-exit-y': piece.exitY,
                  '--confetti-spin': piece.spin,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <span className="match-result-spark" aria-hidden="true">
          ✦
        </span>
        <p>{t('matchComplete')}</p>
        <h2>{message}</h2>
        <small>{t('returningToMenu')}</small>
        <span className="match-result-timer" aria-hidden="true" />
      </div>
    </div>
  );
}

export function Tip({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <p className="tip">
      {t('tip')} <span>{children}</span>
    </p>
  );
}
