import { useEffect, useRef, useState } from 'react';
import anime from 'animejs';
import { animateIn, motionEnabled } from '../../app/animation';
import { triggerHaptic } from '../../app/settings';
import type { GameSetup, Player } from '../../app/types';
import { GameActions, GameHeader, MatchResultToast, ScoreStrip, Tip } from '../../components/react-layout';
import './reaction-duel.css';
import { useI18n } from '../../app/i18n';
import {
  getBotReactionDelay,
  getReactionMatchWinner,
  getReactionWaitDelay,
  resolveReactionAttempt,
  type ReactionPhase,
} from './reaction-duel-logic';

export function ReactionDuelPage({ setup, onExit }: { setup: GameSetup; onExit: () => void }) {
  const { language, t } = useI18n();
  const mode = setup.mode;
  const [phase, setPhase] = useState<ReactionPhase>('idle');
  const [scores, setScores] = useState<Record<Player, number>>({ X: 0, O: 0 });
  const [reactions, setReactions] = useState<Partial<Record<Player, number>>>({});
  const [winner, setWinner] = useState<Player | null>(null);
  const [falseStart, setFalseStart] = useState<Player | null>(null);
  const [round, setRound] = useState(1);
  const goAt = useRef(0);
  const timer = useRef<number | null>(null);
  const botTimer = useRef<number | null>(null);

  useEffect(() => animateIn('.score-strip, .reaction-arena, .reaction-buttons, .game-actions, .tip'), []);
  useEffect(() => () => stopTimers(), []);
  useEffect(() => {
    if (phase !== 'waiting') return;
    timer.current = window.setTimeout(() => {
      setPhase('go');
      goAt.current = performance.now();
      if (motionEnabled()) anime({ targets: '.signal-orb', scale: [0.8, 1.12, 1], duration: 360, easing: 'easeOutBack' });
    }, getReactionWaitDelay());
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [phase]);
  useEffect(() => {
    if (phase !== 'go' || mode !== 'bot') return;
    botTimer.current = window.setTimeout(() => tap('O'), getBotReactionDelay(setup.difficulty));
    return () => {
      if (botTimer.current) window.clearTimeout(botTimer.current);
    };
  }, [phase, mode]);

  const stopTimers = () => {
    if (timer.current) window.clearTimeout(timer.current);
    if (botTimer.current) window.clearTimeout(botTimer.current);
    timer.current = null;
    botTimer.current = null;
  };
  const startRound = () => {
    if (phase === 'result' && round >= setup.rounds) return;
    stopTimers();
    if (phase === 'result') setRound((current) => current + 1);
    setPhase('waiting');
    setReactions({});
    setWinner(null);
    setFalseStart(null);
    triggerHaptic(5);
  };

  useEffect(() => {
    if (phase !== 'result' || round >= setup.rounds) return;
    const timeout = window.setTimeout(startRound, 1400);
    return () => window.clearTimeout(timeout);
  }, [phase, round, setup.rounds]);

  const tap = (player: Player) => {
    const attempt = resolveReactionAttempt(phase, player, goAt.current, performance.now(), Boolean(reactions[player]));
    if (attempt.kind === 'false-start') {
      if (!(mode === 'bot' && player === 'O')) triggerHaptic([28, 40, 28]);
      setFalseStart(attempt.falseStart);
      setWinner(attempt.winner);
      setPhase('result');
      stopTimers();
      setScores((current) => ({ ...current, [attempt.winner]: current[attempt.winner] + 1 }));
      return;
    }
    if (attempt.kind !== 'reaction') return;
    if (!(mode === 'bot' && player === 'O')) triggerHaptic([18, 35, 18]);
    setReactions((current) => ({ ...current, [player]: attempt.reaction }));
    setWinner(attempt.winner);
    setScores((current) => ({ ...current, [attempt.winner]: current[attempt.winner] + 1 }));
    setPhase('result');
    stopTimers();
  };

  const matchComplete = phase === 'result' && round >= setup.rounds;
  const playerName = (player: Player) => t(player === 'X' ? 'player1' : mode === 'bot' ? 'bot' : 'player2');
  const formatReaction = (reaction: number) =>
    `${new Intl.NumberFormat(language === 'fa' ? 'fa-IR' : 'en').format(reaction)} ${t('milliseconds')}`;
  const matchWinner = getReactionMatchWinner(scores);
  const status = matchComplete
    ? matchWinner === 'draw'
      ? t('matchDraw')
      : t('winsMatch', { player: playerName(matchWinner) })
    : phase === 'waiting'
      ? t('getReady')
      : phase === 'go'
        ? t('tapNow')
        : phase === 'result'
          ? falseStart
            ? t('tappedEarly', { player: playerName(falseStart), winner: playerName(winner!) })
            : t('winsRound', { player: playerName(winner!) })
          : t('pressStart');
  const label = (player: Player) =>
    reactions[player]
      ? formatReaction(reactions[player])
      : phase === 'waiting'
        ? t('waitForGreen')
        : phase === 'go'
          ? t('tapNowShort')
          : phase === 'result' && falseStart
            ? falseStart === player
              ? t('tooEarly')
              : t('wins')
            : phase === 'result'
              ? t('noTap')
              : t('ready');
  const running = phase === 'waiting' || phase === 'go';

  return (
    <main className="shell game-screen reaction-screen">
      <GameHeader
        title={t('reactionDuel')}
        statIcon="spark"
        statLabel={t('roundLabel')}
        statValue={new Intl.NumberFormat(language === 'fa' ? 'fa-IR' : 'en').format(round)}
        statSuffix={<small>/ {new Intl.NumberFormat(language === 'fa' ? 'fa-IR' : 'en').format(setup.rounds)}</small>}
        onExit={onExit}
      />
      <ScoreStrip
        leftLabel={t('player1')}
        leftMark="✦"
        rightLabel={t(mode === 'bot' ? `${setup.difficulty}Bot` : 'player2')}
        rightMark="✦"
        scores={scores}
      />
      <section className={`reaction-arena phase-${phase}`}>
        <div className={`signal-orb ${phase === 'go' ? 'signal-go' : ''}`} aria-hidden="true">
          <span>{phase === 'go' ? t('go') : '✦'}</span>
        </div>
        <div className="reaction-status" role="status" aria-live="assertive">
          {status}
        </div>
        <div className="reaction-times" aria-label={t('reactionTimes')}>
          <span>{reactions.X ? formatReaction(reactions.X) : '—'}</span>
          <span>{reactions.O ? formatReaction(reactions.O) : '—'}</span>
        </div>
      </section>
      <section className="reaction-buttons" aria-label={t('playerTapButtons')}>
        <button
          type="button"
          className="reaction-player player-one"
          onPointerDown={(event) => {
            event.preventDefault();
            tap('X');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') tap('X');
          }}
          disabled={!running}
        >
          <span>{t('player1')}</span>
          <strong>{t('tap')}</strong>
          <small>{label('X')}</small>
        </button>
        <button
          type="button"
          className="reaction-player player-two"
          onPointerDown={(event) => {
            event.preventDefault();
            tap('O');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') tap('O');
          }}
          disabled={!running || mode === 'bot'}
        >
          <span>{t(mode === 'bot' ? 'bot' : 'player2')}</span>
          <strong>{t('tap')}</strong>
          <small>{label('O')}</small>
        </button>
      </section>
      <GameActions
        resetLabel={
          matchComplete
            ? t('matchComplete')
            : phase === 'idle'
              ? t('startRound')
              : phase === 'result'
                ? t('nextRoundStarting')
                : t('roundRunning')
        }
        onReset={() => {
          if (phase === 'idle' || phase === 'result') startRound();
        }}
        onExit={onExit}
        resetDisabled={running || phase === 'result'}
      />
      <Tip>{t('reactionTip')}</Tip>
      {matchComplete && <MatchResultToast message={status} />}
    </main>
  );
}
