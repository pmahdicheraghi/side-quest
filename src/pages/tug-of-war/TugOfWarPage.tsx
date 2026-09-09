import { useEffect, useRef, useState } from 'react';
import { animateIn } from '../../app/animation';
import { useI18n } from '../../app/i18n';
import { triggerHaptic } from '../../app/settings';
import type { GameSetup, Player } from '../../app/types';
import { GameHeader, Icon, MatchResultToast, ScoreStrip, Tip } from '../../components/react-layout';
import { playPairSound, playTapSound } from '../../app/sfx';
import { recordMatchResult } from '../../app/stats';
import type { PlayerNames } from '../../app/player-names';
import { checkTugWinner, clampPosition, getBotTapDelay, PULL_THRESHOLD, TAP_POWER } from './tug-of-war-logic';
import './tug-of-war.css';

export function TugOfWarPage({ setup, playerNames, onExit }: { setup: GameSetup; playerNames: PlayerNames; onExit: () => void }) {
  const { language, t } = useI18n();
  const isRtl = language === 'fa';
  const mode = setup.mode;
  const [position, setPosition] = useState(0);
  const [winner, setWinner] = useState<Player | null>(null);
  const [scores, setScores] = useState<Record<Player, number>>({ X: 0, O: 0 });
  const [pullCounts, setPullCounts] = useState<Record<Player, number>>({ X: 0, O: 0 });
  const [round, setRound] = useState(1);
  const botTimerRef = useRef<number | null>(null);
  const nextRoundTimerRef = useRef<number | null>(null);
  const positionRef = useRef(0);
  const winnerRef = useRef<Player | null>(null);
  const numberFormatter = new Intl.NumberFormat(language === 'fa' ? 'fa-IR' : 'en');

  positionRef.current = position;
  winnerRef.current = winner;

  useEffect(() => {
    animateIn('.score-strip, .tug-arena-wrap, .tip');
  }, []);

  const finishRound = (roundWinner: Player) => {
    setWinner(roundWinner);
    winnerRef.current = roundWinner;
    const nextScores = {
      ...scores,
      [roundWinner]: scores[roundWinner] + 1,
    };
    setScores(nextScores);

    if (round >= setup.rounds) {
      const outcome = nextScores.X === nextScores.O ? 'draw' : nextScores.X > nextScores.O ? 'win' : 'loss';
      recordMatchResult('tug', outcome, { difficulty: mode === 'bot' ? setup.difficulty : undefined });
    }

    triggerHaptic([25, 40, 25]);
    playPairSound();
  };

  const handlePull = (player: Player) => {
    if (winnerRef.current) return;

    triggerHaptic(6);
    playTapSound();

    setPullCounts((prev) => ({ ...prev, [player]: prev[player] + 1 }));

    const delta = player === 'X' ? -TAP_POWER : TAP_POWER;
    const nextPos = clampPosition(positionRef.current + delta);
    positionRef.current = nextPos;
    setPosition(nextPos);

    const roundWinner = checkTugWinner(nextPos);
    if (roundWinner) {
      finishRound(roundWinner);
    }
  };

  // Bot tapping loop
  useEffect(() => {
    if (mode !== 'bot' || winner) return;

    const scheduleNextBotTap = () => {
      if (winnerRef.current) return;
      const delay = getBotTapDelay(setup.difficulty, positionRef.current);
      botTimerRef.current = window.setTimeout(() => {
        handlePull('O');
        scheduleNextBotTap();
      }, delay);
    };

    scheduleNextBotTap();

    return () => {
      if (botTimerRef.current !== null) {
        window.clearTimeout(botTimerRef.current);
      }
    };
  }, [mode, setup.difficulty, winner, round]);

  const resetRound = (advanceRound = false) => {
    if (botTimerRef.current !== null) window.clearTimeout(botTimerRef.current);
    if (nextRoundTimerRef.current !== null) window.clearTimeout(nextRoundTimerRef.current);
    const nextRound = advanceRound ? round + 1 : round;
    if (advanceRound) setRound(nextRound);
    setPosition(0);
    positionRef.current = 0;
    setWinner(null);
    winnerRef.current = null;
    setPullCounts({ X: 0, O: 0 });
  };

  useEffect(() => {
    if (!winner || round >= setup.rounds) return;
    nextRoundTimerRef.current = window.setTimeout(() => {
      resetRound(true);
    }, 1800);
    return () => {
      if (nextRoundTimerRef.current !== null) window.clearTimeout(nextRoundTimerRef.current);
    };
  }, [winner, round, setup.rounds]);

  // Position percentage:
  // - In raw coordinates: -PULL_THRESHOLD (Player X max) to +PULL_THRESHOLD (Player O max)
  const rawPercentage = ((position + PULL_THRESHOLD) / (2 * PULL_THRESHOLD)) * 100;
  // In LTR: Player X is on the physical left (0%) and Player O on the physical right (100%).
  // In RTL: Player X is on the physical right (100%) and Player O on the physical left (0%).
  const displayPercentage = isRtl ? 100 - rawPercentage : rawPercentage;
  const fillLeft = Math.min(displayPercentage, 50);
  const fillWidth = Math.abs(displayPercentage - 50);

  // Knot arrow direction: points toward the pulling/leading side
  const knotGlyph = '✦';

  const running = !winner;
  const status = winner ? t('winsRound', { player: winner === 'X' ? playerNames.X : playerNames.O }) : t('pullRope');
  const pullLabel = (player: Player) =>
    winner ? (winner === player ? t('wins') : '') : `${numberFormatter.format(pullCounts[player])} ${t('pullsUnit')}`;
  const matchComplete = winner && round >= setup.rounds;

  return (
    <main className="shell game-screen tug-page theme-tug">
      <GameHeader
        title={t('tugOfWar')}
        statIcon="zap"
        statLabel={t('roundLabel')}
        statValue={numberFormatter.format(round)}
        statSuffix={<small>/ {numberFormatter.format(setup.rounds)}</small>}
        onExit={onExit}
      />

      <ScoreStrip
        leftLabel={playerNames.X}
        leftMark="✦"
        rightLabel={playerNames.O}
        rightMark="✦"
        scores={scores}
        inGameScores={pullCounts}
        inGameUnit={t('pullsUnit')}
      />

      <section className="tug-arena-wrap">
        <div className="turn-label" role="status" aria-live="polite">
          {status}
        </div>

        <div className="tug-arena" aria-label={t('tugOfWar')}>
          <div className="tug-center">
            <div className="tug-rig">
              <div className="tug-rope-track">
                <div className="tug-rope-line" />
                <span className="tug-track-center-tick" />
                <div
                  className="tug-rope-fill"
                  style={{
                    left: `${fillLeft}%`,
                    width: `${fillWidth}%`,
                  }}
                />
                <div className="tug-knot" style={{ left: `${displayPercentage}%` }}>
                  <span>{knotGlyph}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="tug-player-zones">
            <button
              type="button"
              className={`tug-player player-one ${winner === 'X' ? 'is-winner' : ''}`}
              onPointerDown={(event) => {
                event.preventDefault();
                handlePull('X');
              }}
              disabled={!running}
            >
              <span>{playerNames.X}</span>
              <strong>{t('pullRope')}</strong>
              <small>{pullLabel('X')}</small>
            </button>
            <button
              type="button"
              className={`tug-player player-two ${mode === 'bot' ? 'is-bot' : ''} ${winner === 'O' ? 'is-winner' : ''}`}
              onPointerDown={(event) => {
                event.preventDefault();
                handlePull('O');
              }}
              disabled={!running || mode === 'bot'}
            >
              <span>{playerNames.O}</span>
              <strong>{mode === 'bot' ? '' : t('pullRope')}</strong>
              <small>
                {mode === 'bot' ? (
                  <>
                    <Icon name="bot" /> {t(`${setup.difficulty}Bot`)}
                  </>
                ) : (
                  pullLabel('O')
                )}
              </small>
            </button>
          </div>
        </div>
      </section>

      <Tip>{t('tugTip')}</Tip>

      {matchComplete && (
        <MatchResultToast
          message={scores.X === scores.O ? t('matchTie') : t('winsMatch', { player: scores.X > scores.O ? playerNames.X : playerNames.O })}
          onExit={onExit}
        />
      )}
    </main>
  );
}
