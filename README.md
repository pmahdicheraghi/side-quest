# Side Quest — Mini Games

A mobile-first pocket arcade built with React, Vite, TypeScript, inline SVG artwork, and Anime.js motion. React owns the app shell, settings, and every game screen. It can be installed as a progressive web app and reopens offline after its first production visit.

## Run locally

```bash
npm install
npm run dev
```

If you are pulling this change into an existing checkout, run `npm install` once to add the React and Vite React plugin dependencies.

Create and preview a production build:

```bash
npm run build
npm run preview
```

The service worker is registered only in production builds, so offline and update behavior should be tested through `npm run preview` rather than the development server. Each production build gets a unique version marker. Installed copies check it on launch, reconnect, tab focus, and every five minutes; downloaded releases activate automatically and are used on the next navigation or launch.

## Code quality

```bash
npm run lint
npm run format:check
npm run format
```

ESLint is configured with the TypeScript ESLint ruleset, while Prettier handles TypeScript, CSS, HTML, JSON, JavaScript, and Markdown formatting.

The menu currently includes:

- **Tic Tac Toe** — play against a defensive bot or pass the phone for two-player rounds.
- **Memory Match** — find eight pairs against a bot or in pass-and-play mode.
- **Reaction Duel** — wait for the green signal; the first valid tap wins and an early tap forfeits the round.
- **Connect Four** — drop discs into seven columns, build a line of four, and block the opponent.
- **Dots & Boxes** — claim edges, close boxes for extra turns, and control chains against a bot or friend.

Every game supports bot and local two-player modes. Status changes are announced to assistive technology, keyboard focus is visible, and nonessential animation follows the system’s reduced-motion preference.

Selecting a game opens a setup dialog for choosing Easy, Normal, or Hard bot difficulty and a 1, 3, or 5-round match. The round limit applies to both bot and local two-player play; difficulty only affects the bot.

Open Settings from the menu to control animations, the Side Quest soundtrack, haptic feedback, and high-contrast colors. Preferences are stored locally in the browser and applied immediately. Music starts after your first interaction to comply with browser autoplay rules and is cached after its first playback for later offline sessions.

The interface supports English and Persian. Choose the language in Settings; the selection is saved locally, and Persian automatically enables the right-to-left layout, Persian number formatting, and the bundled local Vazir font.

## Project structure

```text
src/
  app/                 React shell, typed view routing, icons, motion helpers
  app/settings.ts      persisted user preferences and haptic helper
  components/          shared React game layout components
  pages/tic-tac-toe/   Tic Tac Toe state, bot, and UI
  pages/memory-match/  Memory Match state, bot, and UI
  pages/reaction-duel/ Reaction Duel state, bot, and UI
  pages/connect-four/  Connect Four rules, minimax bot, and UI
  pages/dots-boxes/    Dots & Boxes rules, bot tactics, and board UI
  pages/settings/      preferences screen and toggle controls
  styles/
    global.css         tokens, typography, menu, shared layout, and accessibility
    components.css     small shared component rules
  main.tsx             React/Vite entry point
public/
  audio/                soundtrack asset
  icon.svg              application icon
  manifest.webmanifest  install metadata
  sw.js                 production offline cache
```

Each game is a self-contained React component with local state and effects for timers, bot turns, haptics, and motion. The app switches screens through typed React view state in `src/app/react-app.tsx`.
