# Frontend rules (Impostor)

React + Vite + TypeScript, plain CSS. The visual source of truth is now `src/styles/tokens.css`, `src/styles/app.css` and `src/components/ui/`.
`design/preview.html` remains as the historical reference only. The full spec is `PLAN.md` in the repo root.

## Lasting design rules
- Always use the `tokens.css` variables. Never add new colours or fonts. No raw hex or rgba values outside `tokens.css`
  (check: `grep -rE "#[0-9a-fA-F]{3,6}\b" src --include=*.css --include=*.tsx` must only hit `tokens.css`).
- Reuse the components in `src/components/ui/` before creating new ones. New shared UI goes there, with its styles in `app.css`.
  Screens are composed from `ui/` components and do not style things on their own.
- One main action per screen, in the footer. Buttons span the full width and are at least 52px tall.
  Red (`--impostor`) is only for the impostor: the impostor reveal, "Avslöja bedragaren", "Fel!" and the impostor's points badge.
  Other players' point badges on the round result are green (grey `zero` for +0 p).
  Green (`--success`) is for "Rätt!", points and registered/saved states.
- All UI text is in Swedish, short and informal ("du"). Errors and empty states follow the same tone.
- Mobile first: a single column, max 420px wide, centred, no horizontal scroll at 360px.

## Game rules that must not break
- The vote is secret: never show who voted for whom, and show no votes or points during the vote. Once everyone has voted, the
  round result shows vote counts plus every player's points this round and running total. Every voter, the impostor included,
  sees identical screens.
- `Rules.tsx` is static text. Any change to the game flow or the scoring must update it too.
- Game logic is pure and lives in `src/game.ts` with tests in `src/game.test.ts`. Run `npm test` after changing it.

## Code
- Phases are component state in `App.tsx` (no router). All fetch calls are in `src/api.ts`; the auth token is in `src/auth.ts`.
- PWA via `vite-plugin-pwa` (config in `vite.config.ts`, registration in `src/pwa.ts`). A new version is applied only from Setup
  ("Uppdatera"), never automatically: a reload mid-game would wipe the game. `/api` is never cached by the service worker.
  Icons: edit `public/icon.svg`, then `npm run icons`. The service worker only exists in builds, not in `npm run dev`.
- Dev: `npm run dev` (HTTPS via basic-ssl, `--host`, `/api` proxied to `localhost:8000`). Checks: `npm test`, `npm run lint`, `npm run build`.
