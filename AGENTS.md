# Repository Guidelines

## Project Structure & Module Organization
- `src/`: React 19 frontend (components for gameplay, menus, modals, guess list; shared styles and assets). Entry files `main.jsx` and `App.jsx`.
- `api/`: Express endpoints (`guess.js`, `hint.js`, `reveal.js`, `nearby.js`, `user.js`) plus `utils/` for logging, word cache, and scheduled game generation; `db/index.js` boots the SQLite database `funtexto.db` in WAL mode.
- `server.js`: Wires middleware, assigns user cookies, mounts API routes, and schedules periodic target generation.
- `public/`: Static assets served by Vite; `dist/`: Vite build output (gitignored).
- `scripts/verify-db.js`: Quick DB sanity script that seeds a game, inserts a user, and simulates a play session.
- `logs/`: Runtime logs written by winston/morgan (gitignored); keep log noise out of commits.

## Build, Test, and Development Commands
- `npm install`: Install dependencies.
- `npm start`: Run API (`npm run server`) and Vite dev server (`npm run dev`) concurrently on ports 3000 and 5173.
- `npm run server`: Start only the Express API (useful for backend debugging or Postman/cURL checks).
- `npm run dev`: Frontend-only Vite dev server; hits the API at localhost:3000.
- `npm run build`: Production build to `dist/`; `npm run preview`: Serve the built assets locally.
- `npm run lint`: ESLint (flat config) across `js/jsx`; fix issues before opening a PR.
- `node scripts/verify-db.js`: Optional DB verification after schema or generation changes.

## Coding Style & Naming Conventions
- ECMAScript modules everywhere; prefer functional React components with hooks. Components/files in `src` use `.jsx` and `PascalCase`; helpers and API handlers in `api` use `camelCase` and lower-case filenames.
- Indent with 2 spaces; keep imports ordered logically (external, then local). Semicolons are acceptable; stay consistent within a file.
- ESLint enforces `@eslint/js` recommended, React Hooks rules, and React Refresh; unused vars are errors (uppercase constants are ignored).
- Keep side effects out of render paths; co-locate styles in `src/index.css` and per-component styles if added.

## Testing Guidelines
- No automated tests are present; run `npm run lint` and exercise core flows via `npm start` before merging.
- When touching DB or game generation logic, run `node scripts/verify-db.js` to ensure tables, users, and play history still behave.
- For new tests, align with the Vite/React stack (e.g., Vitest + React Testing Library) and mirror component filenames with `.test.jsx`.
- Prefer lightweight integration checks hitting the Express routes for new API surface areas.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (e.g., `feat: ...`, `fix: ...`, `chore: ...`); keep messages present-tense and specific.
- PRs should summarize changes, list affected commands/endpoints, and call out any DB migrations or environment variable needs.
- Include screenshots or short clips for UI changes; describe manual verification steps (pages visited, endpoints hit, sample payloads).
- Ensure `npm run lint` (and build/verify scripts when relevant) pass before requesting review; avoid committing `.env` or regenerated `funtexto.db*` unless intentionally updating shared fixtures.

## Security & Configuration Tips
- Keep secrets in `.env` (see `.env.example`); never commit API keys. Production cookies are `secure` when `NODE_ENV=production`.
- SQLite files live in the repo root; back them up cautiously and avoid bloating diffs. Logs are already ignored—do not add them to version control.
- Enable CORS origins explicitly when deploying; current dev setup allows all origins for convenience.
