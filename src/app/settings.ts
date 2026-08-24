export type SettingKey = 'animations' | 'music' | 'haptics' | 'highContrast';

export type Settings = Record<SettingKey, boolean>;

export const defaultSettings: Settings = {
  animations: true,
  music: true,
  haptics: true,
  highContrast: false,
};

const STORAGE_KEY = 'side-quest-settings';

export function loadSettings(): Settings {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Settings>;
    return { ...defaultSettings, ...validSettings(stored) };
  } catch {
    return { ...defaultSettings };
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Settings still apply for the current session when storage is unavailable.
  }
}

export function applySettings(settings: Settings): void {
  document.documentElement.classList.toggle('no-motion', !settings.animations);
  document.documentElement.classList.toggle('high-contrast', settings.highContrast);
}

export function triggerHaptic(pattern: number | number[] = 8): void {
  if (loadSettings().haptics && typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
}

function validSettings(value: Partial<Settings>): Partial<Settings> {
  return Object.fromEntries(
    (Object.keys(defaultSettings) as SettingKey[]).filter((key) => typeof value[key] === 'boolean').map((key) => [key, value[key]]),
  ) as Partial<Settings>;
}
