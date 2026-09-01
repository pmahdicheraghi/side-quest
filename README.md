# Arcado (آرکیدو) — Mini Games

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

The service worker is registered only in production builds, so offline and update behavior should be tested through `npm run preview` rather than the development server. Each production build uses the package release and short Git commit as its identity, for example `1.3.0+b2a0c51`. Installed copies check for releases on launch, reconnect, tab focus, and every five minutes. A release downloads in the background, then waits for the user to apply it from the menu so an active match is never interrupted.

## Code quality

```bash
npm run lint
npm run format:check
npm run format
```

ESLint is configured with the TypeScript ESLint ruleset, while Prettier handles TypeScript, CSS, HTML, JSON, JavaScript, and Markdown formatting.

## Releases and deployment

Side Quest uses semantic versions. Use a patch for fixes, a minor version for new games or features, and a major version for incompatible stored-data or experience changes. `package.json` is the release source of truth; the release workflow rejects a Git tag that does not match it.

After this deployment setup is merged, publish the first controlled release:

```bash
git tag v1.3.0
git push origin v1.3.0
```

For later releases, `npm version patch`, `npm version minor`, or `npm version major` updates the package and lockfile, creates the version commit, and creates the matching Git tag. Push both with `git push --follow-tags`.

Pull requests and pushes to `master` run formatting, linting, and a production build. A `v*` tag builds one artifact and deploys it through the protected `production` GitHub environment. Configure that environment with a required reviewer if production should wait for approval.

The object storage provider must expose an S3-compatible API. Create a `production` GitHub environment with these environment variables:

- `APP_URL` — the public HTTPS URL where Side Quest is served, without a trailing slash
- `OBJECT_STORAGE_ENDPOINT` — the provider's HTTPS S3 API endpoint, not the public website URL
- `OBJECT_STORAGE_BUCKET` — the provider's bucket or container name
- `OBJECT_STORAGE_REGION` — the provider region; omit it to use `us-east-1`

Add these values as GitHub environment **secrets**, never variables or repository files:

- `OBJECT_STORAGE_ACCESS_TOKEN`
- `OBJECT_STORAGE_SECRET_TOKEN`

The workflow maps those secrets to the standard S3 client credential variables at runtime. The script retains old hashed bundles intentionally, publishes `version.json` last, and verifies both the uploaded object and public website. If the provider has a CDN or caching proxy, configure `index.html`, `sw.js`, and `version.json` with a zero or revalidation-only TTL. The deployment intentionally fails when the public URL remains stale so a release cannot appear successful while users still receive old control files.

Enable object versioning if the provider supports it and use a lifecycle rule to remove unused hashed assets after a suitable rollback window, such as 90 days. If the provider is not S3 compatible, replace `scripts/deploy-static-site.sh` with its supported CLI or upload API.

The menu currently includes:

- **Continuous Tic Tac Toe** — keep three marks each; every fourth move relocates the oldest mark.
- **Memory Match** — find eight pairs against a bot or in pass-and-play mode.
- **Reaction Duel** — wait for the green signal; the first valid tap wins and an early tap forfeits the round.
- **Connect Four** — drop discs into seven columns, build a line of four, and block the opponent.
- **Dots & Boxes** — claim edges, close boxes for extra turns, and control chains against a bot or friend.
- **Othello** — trap opponent discs between yours, flip entire lines, and claim the board against a bot or friend.

Every game supports bot and local two-player modes. Status changes are announced to assistive technology, keyboard focus is visible, and nonessential animation follows the system’s reduced-motion preference.

Selecting a game opens a setup dialog for choosing Easy, Normal, or Hard bot difficulty and a 1, 3, or 5-round match. The round limit applies to both bot and local two-player play; difficulty only affects the bot.

Open Settings from the menu to control animations, the Side Quest soundtrack, haptic feedback, and high-contrast colors. Preferences are stored locally in the browser and applied immediately. Music starts after your first interaction to comply with browser autoplay rules and is cached after its first playback for later offline sessions.

The interface supports English and Persian. Choose the language in Settings; the selection is saved locally, and Persian automatically enables the right-to-left layout, Persian number formatting, and the bundled local Vazir font.

## Project structure

```text
src/
  app/                  React shell, typed view routing, icons, motion helpers
  app/settings.ts       persisted user preferences and haptic helper
  components/           shared React game layout components
  pages/
    tic-tac-toe/        Tic Tac Toe state, bot, and UI
    memory-match/       Memory Match state, bot, and UI
    reaction-duel/      Reaction Duel state, bot, and UI
    connect-four/       Connect Four rules, minimax bot, and UI
    dots-boxes/         Dots & Boxes rules, bot tactics, and board UI
    reversi/            Reversi rules, minimax bot, and board UI
    settings/           preferences screen and toggle controls
  styles/
    global.css          tokens, typography, menu, shared layout, and accessibility
    components.css      small shared component rules
  main.tsx              React/Vite entry point
public/
  audio/                soundtrack asset
  fonts/                fonts asset
  icon.svg              application icon
  manifest.webmanifest  install metadata
  sw.js                 production offline cache
.github/workflows/      pull-request CI and tag-based releases
scripts/                deployment scripts used by CI
```

Each game is a self-contained React component with local state and effects for timers, bot turns, haptics, and motion. The app switches screens through typed React view state in `src/app/react-app.tsx`.
