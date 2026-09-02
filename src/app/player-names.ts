export type PlayerNames = Record<'X' | 'O', string>;

export const PLAYER_NAME_MAX_LENGTH = 20;
export const defaultPlayerNames: PlayerNames = { X: '', O: '' };

const STORAGE_KEY = 'side-quest-player-names';

export function limitPlayerName(name: string): string {
  return Array.from(name).slice(0, PLAYER_NAME_MAX_LENGTH).join('');
}

export function normalizePlayerName(name: string): string {
  return limitPlayerName(name.trim());
}

export function loadPlayerNames(): PlayerNames {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<PlayerNames>;
    return {
      X: typeof stored.X === 'string' ? normalizePlayerName(stored.X) : '',
      O: typeof stored.O === 'string' ? normalizePlayerName(stored.O) : '',
    };
  } catch {
    return { ...defaultPlayerNames };
  }
}

export function savePlayerNames(playerNames: PlayerNames): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ X: normalizePlayerName(playerNames.X), O: normalizePlayerName(playerNames.O) }));
  } catch {
    // Names still apply for the current session when storage is unavailable.
  }
}
