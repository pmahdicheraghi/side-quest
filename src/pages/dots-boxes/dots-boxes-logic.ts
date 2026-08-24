import type { GameDifficulty, Player } from '../../app/types';

export const DOT_BOX_SIZE = 4;
export const DOT_GRID_SIZE = DOT_BOX_SIZE + 1;

export type DotEdge = `h-${number}-${number}` | `v-${number}-${number}`;
export type DotEdges = Partial<Record<DotEdge, Player>>;
export type DotBoxes = Array<Player | ''>;

export const ALL_DOT_EDGES: DotEdge[] = [
  ...Array.from({ length: DOT_GRID_SIZE }, (_, row) =>
    Array.from({ length: DOT_BOX_SIZE }, (_, column) => `h-${row}-${column}` as DotEdge),
  ).flat(),
  ...Array.from({ length: DOT_BOX_SIZE }, (_, row) =>
    Array.from({ length: DOT_GRID_SIZE }, (_, column) => `v-${row}-${column}` as DotEdge),
  ).flat(),
];

export function createDotBoxes(): DotBoxes {
  return Array<Player | ''>(DOT_BOX_SIZE * DOT_BOX_SIZE).fill('');
}

export function getBoxEdges(boxIndex: number): DotEdge[] {
  const row = Math.floor(boxIndex / DOT_BOX_SIZE);
  const column = boxIndex % DOT_BOX_SIZE;
  return [`h-${row}-${column}`, `v-${row}-${column + 1}`, `h-${row + 1}-${column}`, `v-${row}-${column}`];
}

export function getAdjacentBoxes(edge: DotEdge): number[] {
  const [orientation, rowText, columnText] = edge.split('-');
  const row = Number(rowText);
  const column = Number(columnText);
  const boxes: number[] = [];

  if (orientation === 'h') {
    if (row > 0) boxes.push((row - 1) * DOT_BOX_SIZE + column);
    if (row < DOT_BOX_SIZE) boxes.push(row * DOT_BOX_SIZE + column);
  } else {
    if (column > 0) boxes.push(row * DOT_BOX_SIZE + column - 1);
    if (column < DOT_BOX_SIZE) boxes.push(row * DOT_BOX_SIZE + column);
  }
  return boxes;
}

export function getCompletedBoxes(edges: DotEdges, boxes: DotBoxes, edge: DotEdge): number[] {
  return getAdjacentBoxes(edge).filter((boxIndex) => !boxes[boxIndex] && getBoxEdges(boxIndex).every((boxEdge) => Boolean(edges[boxEdge])));
}

export function countOwnedBoxes(boxes: DotBoxes, player: Player): number {
  return boxes.filter((owner) => owner === player).length;
}

export function isDotsBoardComplete(edges: DotEdges): boolean {
  return ALL_DOT_EDGES.every((edge) => Boolean(edges[edge]));
}

export function chooseDotsBotEdge(
  edges: DotEdges,
  boxes: DotBoxes,
  difficulty: GameDifficulty,
  random: () => number = Math.random,
): DotEdge {
  const available = ALL_DOT_EDGES.filter((edge) => !edges[edge]);
  if (difficulty === 'easy') return randomChoice(available, random);

  const captures = available.map((edge) => ({ edge, count: completedCountAfterMove(edges, boxes, edge) })).filter(({ count }) => count > 0);
  if (captures.length) {
    const bestCount = Math.max(...captures.map(({ count }) => count));
    return randomChoice(
      captures.filter(({ count }) => count === bestCount).map(({ edge }) => edge),
      random,
    );
  }

  const safeEdges = available.filter((edge) => isSafeMove(edges, boxes, edge));
  if (safeEdges.length) return randomChoice(safeEdges, random);
  if (difficulty === 'normal') return randomChoice(available, random);

  // Every remaining move opens a box. Look through the complete capture run that
  // each move gives the opponent and sacrifice the fewest boxes possible.
  const captureMemo = new Map<string, number>();
  const risks = available.map((edge) => ({ edge, risk: forcedOpponentCaptures(edges, boxes, edge, captureMemo) }));
  const lowestRisk = Math.min(...risks.map(({ risk }) => risk));
  return randomChoice(
    risks.filter(({ risk }) => risk === lowestRisk).map(({ edge }) => edge),
    random,
  );
}

function completedCountAfterMove(edges: DotEdges, boxes: DotBoxes, edge: DotEdge): number {
  const nextEdges = { ...edges, [edge]: 'O' as Player };
  return getCompletedBoxes(nextEdges, boxes, edge).length;
}

function isSafeMove(edges: DotEdges, boxes: DotBoxes, edge: DotEdge): boolean {
  return getAdjacentBoxes(edge).every((boxIndex) => boxes[boxIndex] || countBoxSides(edges, boxIndex) <= 1);
}

function forcedOpponentCaptures(edges: DotEdges, boxes: DotBoxes, edge: DotEdge, memo: Map<string, number>): number {
  const nextEdges = { ...edges, [edge]: 'O' as Player };
  return maxCaptureRun(nextEdges, boxes, memo);
}

function maxCaptureRun(edges: DotEdges, boxes: DotBoxes, memo: Map<string, number>): number {
  const key = `${ALL_DOT_EDGES.map((edge) => (edges[edge] ? '1' : '0')).join('')}:${boxes.map((owner) => (owner ? '1' : '0')).join('')}`;
  const cached = memo.get(key);
  if (cached !== undefined) return cached;

  let mostBoxes = 0;
  for (const edge of ALL_DOT_EDGES) {
    if (edges[edge]) continue;
    const nextEdges: DotEdges = { ...edges, [edge]: 'X' };
    const completed = getCompletedBoxes(nextEdges, boxes, edge);
    if (!completed.length) continue;

    const nextBoxes = [...boxes];
    completed.forEach((boxIndex) => {
      nextBoxes[boxIndex] = 'X';
    });
    mostBoxes = Math.max(mostBoxes, completed.length + maxCaptureRun(nextEdges, nextBoxes, memo));
  }

  memo.set(key, mostBoxes);
  return mostBoxes;
}

function countBoxSides(edges: DotEdges, boxIndex: number): number {
  return getBoxEdges(boxIndex).filter((edge) => Boolean(edges[edge])).length;
}

function randomChoice<T>(items: T[], random: () => number): T {
  return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
}
