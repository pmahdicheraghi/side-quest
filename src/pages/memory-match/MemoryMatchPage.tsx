import { useEffect, useRef, useState } from 'react';
import anime from 'animejs';
import { animateIn, motionEnabled } from '../../app/animation';
import { triggerHaptic } from '../../app/settings';
import { getRoundStarter, type GameSetup, type Player } from '../../app/types';
import { GameActions, GameHeader, MatchResultOverlay, ScoreStrip, Tip } from '../../components/react-layout';
import './memory-match.css';
import { useI18n } from '../../app/i18n';

type Card = { symbol: string; flipped: boolean; matched: boolean; matchedBy: Player | null };
const SYMBOLS = ['✦', '●', '◆', '✚', '☀', '◒', '⬟', '✿'];

export function MemoryMatchPage({ setup, onExit }: { setup: GameSetup; onExit: () => void }) {
  const { language, t } = useI18n();
  const mode = setup.mode;
  const [cards, setCards] = useState<Card[]>(createDeck);
  const [turn, setTurn] = useState<Player>('X');
  const [scores, setScores] = useState<Record<Player, number>>({ X: 0, O: 0 });
  const [selected, setSelected] = useState<number[]>([]);
  const [lastMatched, setLastMatched] = useState<number[]>([]);
  const [lock, setLock] = useState(false);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [round, setRound] = useState(1);
  const pairTimeout = useRef<number | null>(null);

  useEffect(() => animateIn('.score-strip, .memory-status, .memory-grid, .game-actions, .tip'), []);
  useEffect(() => {
    if (!lastMatched.length || !motionEnabled()) return;
    anime({
      targets: lastMatched.map((index) => `.memory-card-tile[data-card-index="${index}"]`).join(', '),
      scale: [1, 0.96, 1],
      delay: anime.stagger(90),
      duration: 420,
      easing: 'easeOutCubic',
    });
  }, [lastMatched]);
  useEffect(
    () => () => {
      if (pairTimeout.current) window.clearTimeout(pairTimeout.current);
    },
    [],
  );

  useEffect(() => {
    if (mode !== 'bot' || turn !== 'O' || lock || selected.length || matchedPairs === SYMBOLS.length) return;
    const timeout = window.setTimeout(() => {
      const open = cards.map((card, index) => (card.matched ? -1 : index)).filter((index) => index >= 0);
      if (open.length < 2) return;
      const [first, second] = chooseBotCards(cards, open, setup.difficulty);
      const next = cards.map((card, index) => (index === first || index === second ? { ...card, flipped: true } : card));
      setCards(next);
      setSelected([first, second]);
      setLock(true);
      resolvePair(first, second, next, false);
    }, 550);
    return () => window.clearTimeout(timeout);
  }, [cards, mode, turn, lock, selected.length, matchedPairs]);

  const resetBoard = ({ keepScore = false, advanceRound = false } = {}) => {
    if (pairTimeout.current) window.clearTimeout(pairTimeout.current);
    const nextRound = advanceRound ? round + 1 : keepScore ? round : 1;
    setCards(createDeck());
    setTurn(getRoundStarter(nextRound));
    if (!keepScore) setScores({ X: 0, O: 0 });
    setRound(nextRound);
    setSelected([]);
    setLastMatched([]);
    setLock(false);
    setMatchedPairs(0);
  };

  useEffect(() => {
    if (matchedPairs !== SYMBOLS.length || round >= setup.rounds) return;
    const timeout = window.setTimeout(() => resetBoard({ keepScore: true, advanceRound: true }), 1600);
    return () => window.clearTimeout(timeout);
  }, [matchedPairs, round, setup.rounds]);

  const resolvePair = (first: number, second: number, currentCards: Card[], humanTurn: boolean) => {
    const matched = currentCards[first].symbol === currentCards[second].symbol;
    pairTimeout.current = window.setTimeout(
      () => {
        if (matched) {
          setCards((current) =>
            current.map((card, index) => (index === first || index === second ? { ...card, matched: true, matchedBy: turn } : card)),
          );
          setScores((current) => ({ ...current, [turn]: current[turn] + 1 }));
          setMatchedPairs((current) => current + 1);
          setLastMatched([first, second]);
          if (humanTurn) triggerHaptic([12, 25, 12]);
        } else {
          setCards((current) => current.map((card, index) => (index === first || index === second ? { ...card, flipped: false } : card)));
          setTurn((current) => (current === 'X' ? 'O' : 'X'));
          if (humanTurn) triggerHaptic(3);
        }
        setSelected([]);
        setLock(false);
      },
      matched ? 420 : 900,
    );
  };

  const flip = (index: number) => {
    const card = cards[index];
    if (lock || card.flipped || card.matched || matchedPairs === SYMBOLS.length || (mode === 'bot' && turn === 'O')) return;
    const nextCards = cards.map((item, position) => (position === index ? { ...item, flipped: true } : item));
    const nextSelected = [...selected, index];
    setCards(nextCards);
    setSelected(nextSelected);
    triggerHaptic();
    if (motionEnabled())
      anime({ targets: `.memory-card-tile[data-card-index="${index}"]`, scale: [0.92, 1], duration: 220, easing: 'easeOutBack' });
    if (nextSelected.length === 2) {
      setLock(true);
      resolvePair(nextSelected[0], nextSelected[1], nextCards, true);
    }
  };

  const finished = matchedPairs === SYMBOLS.length;
  const matchComplete = finished && round >= setup.rounds;
  const playerName = (player: Player) => t(player === 'X' ? 'player1' : mode === 'bot' ? 'bot' : 'player2');
  const status = finished
    ? matchComplete
      ? scores.X > scores.O
        ? t('winsMatch', { player: playerName('X') })
        : scores.X < scores.O
          ? t('winsMatch', { player: playerName('O') })
          : t('matchTie')
      : t('deckComplete')
    : lock
      ? t('checkingPair')
      : t('flipTwo', { player: playerName(turn) });

  return (
    <main className="shell game-screen memory-screen">
      <GameHeader
        title={t('memoryMatch')}
        statIcon="grid"
        statLabel={t('roundLabel')}
        statValue={new Intl.NumberFormat(language === 'fa' ? 'fa-IR' : 'en').format(round)}
        statSuffix={<small>/ {new Intl.NumberFormat(language === 'fa' ? 'fa-IR' : 'en').format(setup.rounds)}</small>}
        onExit={onExit}
      />
      <ScoreStrip leftLabel={t('player1')} leftMark="✦" rightLabel={t(mode === 'bot' ? 'bot' : 'player2')} rightMark="●" scores={scores} />
      <div className="memory-status" role="status" aria-live="polite">
        {status}
      </div>
      <section className="memory-grid" aria-label={t('memoryCards')}>
        {cards.map((card, index) => (
          <button
            type="button"
            className={`memory-card-tile ${card.flipped || card.matched ? 'is-flipped' : ''} ${card.matched ? `is-matched matched-${card.matchedBy?.toLowerCase()}` : ''}`}
            data-card-index={index}
            key={index}
            onClick={() => flip(index)}
            disabled={lock || card.flipped || card.matched || finished || (mode === 'bot' && turn === 'O')}
            aria-label={
              card.matched
                ? t('cardMatched', {
                    card: new Intl.NumberFormat(language === 'fa' ? 'fa-IR' : 'en').format(index + 1),
                    symbol: card.symbol,
                  })
                : card.flipped
                  ? t('cardShown', {
                      card: new Intl.NumberFormat(language === 'fa' ? 'fa-IR' : 'en').format(index + 1),
                      symbol: card.symbol,
                    })
                  : t('cardDown', { card: new Intl.NumberFormat(language === 'fa' ? 'fa-IR' : 'en').format(index + 1) })
            }
          >
            <span className="card-inner">
              <span className="card-face card-back">?</span>
              <span className="card-face card-front">{card.symbol}</span>
            </span>
          </button>
        ))}
      </section>
      <GameActions
        resetLabel={t(matchComplete ? 'matchComplete' : finished ? 'nextRoundStarting' : 'restartMatch')}
        onReset={() => resetBoard(finished ? { keepScore: true, advanceRound: true } : undefined)}
        onExit={onExit}
        resetDisabled={finished}
      />
      <Tip>{t('memoryTip')}</Tip>
      {matchComplete && <MatchResultOverlay message={status} onComplete={onExit} />}
    </main>
  );
}

function createDeck(): Card[] {
  return shuffle([...SYMBOLS, ...SYMBOLS]).map((symbol) => ({ symbol, flipped: false, matched: false, matchedBy: null }));
}
function shuffle<T>(items: T[]): T[] {
  for (let index = items.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function chooseBotCards(cards: Card[], open: number[], difficulty: GameSetup['difficulty']): [number, number] {
  const shouldUseKnownPair = difficulty === 'hard' || (difficulty === 'normal' && Math.random() < 0.6);
  if (shouldUseKnownPair) {
    const pair = open.find((first, position) => open.slice(position + 1).some((second) => cards[first].symbol === cards[second].symbol));
    if (pair !== undefined) {
      const match = open.find((index) => index !== pair && cards[index].symbol === cards[pair].symbol);
      if (match !== undefined) return [pair, match];
    }
  }
  const first = open[Math.floor(Math.random() * open.length)];
  const choices = open.filter((index) => index !== first);
  return [first, choices[Math.floor(Math.random() * choices.length)]];
}
