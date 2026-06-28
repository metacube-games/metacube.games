# Game Client

Browser front-end: rendering engine, networking layer, HUD, and wallet integration. Run the full stack via `devops/local-dev` at the monorepo root.

## Scripts

| Script | Description |
|---|---|
| `bun run dev` | Vite dev server |
| `bun run build` | Production build |
| `bun run type-check` | `tsc --noEmit` |
| `bun run oxlint` | Fast oxlint pass |
| `bun run lint` | ESLint (React Hooks + jsx-a11y) |
| `bun run format` / `format:check` | Prettier write / check |
| `bun run doctor` | React Doctor health scan |
| `bun run check` | type-check + oxlint + lint + format check |
| `bun run test` | Vitest (`test:ui`, `test:coverage` variants) |

## Structure

```
src/
├── API/            # REST client, WebSocket protocol & initial world-snapshot fetch
├── world/          # Voxel world model, chunk meshing, scene, lighting & effects
├── players/        # Player physics, controls, camera & opponent rendering
├── menu/           # HUD, chat, sub-menus and the interface orchestrator
├── components/     # Reusable UI (Radix-based) + the <CanvasComponent />
├── mainComponents/ # Top-level renderer-frame / camera glue
├── stores/         # Zustand stores (UI state)
├── hooks/          # Custom React hooks
├── helpers/ utils/ # Shared helpers and three.js utilities
├── constants/      # Game constants, physics & the binary socket protocol
├── sound/          # Audio system (Howler.js)
├── i18n/ locales/  # i18next config and translations
└── assets/         # Models (glTF), textures, fonts, audio
```
