import type { GameDifficulty, Player } from '../../app/types';

export const MEMORY_SYMBOLS = ['✦', '●', '◆', '✚', '☀', '◒', '⬟', '✿'];

export type MemoryCard = {
  symbol: string;
  flipped: boolean;
  matched: boolean;
  matchedBy: Player | null;
};

export type BotMemory = ReadonlyMap<number, string>;

const KNOWN_PAIR_CHANCE: Record<GameDifficulty, number> = {
  easy: 0.35,
  normal: 0.7,
  hard: 1,
};

export function createMemoryDeck(random: () => number = Math.random): MemoryCard[] {
  return shuffle([...MEMORY_SYMBOLS, ...MEMORY_SYMBOLS], random).map((symbol) => ({
    symbol,
    flipped: false,
    matched: false,
    matchedBy: null,
  }));
}

export function getAvailableCards(cards: MemoryCard[]): number[] {
  return cards.flatMap((card, index) => (card.matched ? [] : [index]));
}

export function revealMemoryCard(cards: MemoryCard[], index: number): MemoryCard[] {
  return cards.map((card, cardIndex) => (cardIndex === index ? { ...card, flipped: true } : card));
}

export function resolveMemoryPair(
  cards: MemoryCard[],
  first: number,
  second: number,
  player: Player,
): { cards: MemoryCard[]; matched: boolean } {
  const matched = cards[first].symbol === cards[second].symbol;
  return {
    matched,
    cards: cards.map((card, index) => {
      if (index !== first && index !== second) return card;
      return matched ? { ...card, matched: true, matchedBy: player } : { ...card, flipped: false };
    }),
  };
}

export function rememberCard(memory: BotMemory, index: number, symbol: string): BotMemory {
  const next = new Map(memory);
  next.set(index, symbol);
  return next;
}

export function forgetCards(memory: BotMemory, indexes: number[]): BotMemory {
  const next = new Map(memory);
  indexes.forEach((index) => next.delete(index));
  return next;
}

/**
 * Chooses using positions and remembered observations only. The deck is deliberately
 * not accepted here, so the bot cannot inspect a face-down card's symbol.
 */
export function chooseMemoryBotCard(
  available: number[],
  memory: BotMemory,
  difficulty: GameDifficulty,
  firstSelection: number | null = null,
  random: () => number = Math.random,
): number {
  if (!available.length) throw new Error('Cannot choose a card from an empty board.');

  const rememberedChoice =
    random() < KNOWN_PAIR_CHANCE[difficulty] ? findRememberedChoice(available, memory, firstSelection, random) : undefined;
  if (rememberedChoice !== undefined) return rememberedChoice;

  // When no pair is known, turn over a new card to learn more about the board.
  const unseen = available.filter((index) => !memory.has(index));
  return randomChoice(unseen.length ? unseen : available, random);
}

function findRememberedChoice(
  available: number[],
  memory: BotMemory,
  firstSelection: number | null,
  random: () => number,
): number | undefined {
  if (firstSelection !== null) {
    const symbol = memory.get(firstSelection);
    if (symbol === undefined) return undefined;
    const matches = available.filter((index) => memory.get(index) === symbol);
    return matches.length ? randomChoice(matches, random) : undefined;
  }

  const positionsBySymbol = new Map<string, number[]>();
  available.forEach((index) => {
    const symbol = memory.get(index);
    if (symbol === undefined) return;
    positionsBySymbol.set(symbol, [...(positionsBySymbol.get(symbol) ?? []), index]);
  });
  const knownPairs = [...positionsBySymbol.values()].filter((indexes) => indexes.length >= 2);
  return knownPairs.length ? randomChoice(randomChoice(knownPairs, random), random) : undefined;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
  return items;
}

function randomChoice<T>(items: T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}
