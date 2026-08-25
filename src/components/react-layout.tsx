import { useEffect, useState, type ReactNode } from 'react';
import { iconPaths } from '../app/icons';
import { useI18n } from '../app/i18n';
import { Player } from '../app/types';

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
  turn,
}: {
  leftLabel: string;
  leftMark: string;
  rightLabel: string;
  rightMark: string;
  scores: Record<'X' | 'O', number>;
  turn?: Player;
}) {
  const { language, t } = useI18n();
  const formatScore = (score: number) => new Intl.NumberFormat(language === 'fa' ? 'fa-IR' : 'en').format(score);
  return (
    <section className="score-strip">
      <div className={`score-player score-player-x ${scores.X > scores.O ? 'is-leading' : ''}`}>
        <b className={`score-mark x-label ${turn === 'X' ? 'is-active' : ''}`} aria-hidden="true">
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
        <b className={`score-mark o-label ${turn === 'O' ? 'is-active' : ''}`} aria-hidden="true">
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

export function MatchResultToast({ message }: { message: string }) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), MATCH_RESULT_DURATION);
    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div className="match-result-toast" role="status" aria-live="assertive" aria-atomic="true">
      <span className="match-result-toast-spark" aria-hidden="true">
        ✦
      </span>
      <span>
        <small>{t('matchComplete')}</small>
        <strong>{message}</strong>
      </span>
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
