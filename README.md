<p align="center">
  <img src="landing/public/logo-glow.svg" alt="Metacube" width="180" />
</p>

<p align="center">
  <img src="landing/public/title.svg" alt="Metacube" height="60" />
</p>

<p align="center">
  Free-to-play multiplayer game on <a href="https://www.starknet.io/">Starknet</a>. <b>16777216 cubes</b> to destroy.
</p>

> [!NOTE]
> The game is live at **[play.metacube.games](https://play.metacube.games)**

## Repo layout

```
devops/
  local/               Self-host an instance
  local-dev/           Local development stack (live-mount source, hot reload)
  production/          Ansible-based production deploy (single VPS)
game/
  client/              React + R3F + TypeScript — player UI
  wasm/                C++ → WebAssembly voxel meshing/lighting engine (Emscripten)
  server-view-state/   C++ (uWebSockets) — game / view / state servers
  backend/             Go (Gin) — REST API + chat + stats + on-chain actors
  db-init/             Typescript one-shot — seeds the world into game-db on boot
landing/               Next.js — landing page (metacube.games)
starknet/
  market/              Next.js — NFT marketplace
  link-wallet/         Next.js — Starknet wallet ↔ off-chain account linking
  indexer/             Node — chain event indexer (NFT ownership, listings)
  smart-contracts/     Cairo contracts (NFT collections + marketplace)
tools/                 Offline content-authoring tools
  texture-tools/       Python — generate cube texture atlases + dominant colors
  solid-cubes-detector/ React — voxelize a .glb into cube positions
```

## Architecture

All services run as Docker containers on a single VPS, fronted by an nginx
reverse proxy with TLS terminated at Cloudflare (Full Strict).

```mermaid
---
config:
  flowchart:
    defaultRenderer: elk
---
flowchart LR
    user([Player]):::actor
    cf[Cloudflare]:::edge
    nginx[nginx]:::edge

    subgraph frontends[Static frontends]
        direction TB
        landing[landing-page]
        market[market]
        linkw[link-wallet]
        client[game-client]
    end

    subgraph gameCluster[Game cluster]
        direction TB
        backend[backend]
        gs[game-server]
        vs[view-server]
        ss[state-server]
    end

    subgraph aux[Auxiliary]
        direction TB
        indexer[indexer]
    end

    subgraph data[Data stores]
        direction TB
        gamedb[(game-db<br/>KeyDB)]:::store
        cache[(cache-db<br/>KeyDB)]:::store
        users[(users-db<br/>MySQL)]:::store
    end

    subgraph ext[External]
        direction TB
        rpc[(Starknet RPC)]:::external
        google[(Google OAuth)]:::external
    end

    user --> cf --> nginx
    nginx --> frontends
    nginx --> gameCluster
    nginx --> aux

    backend --> users
    backend --> cache
    backend --> gamedb
    gs --> gamedb
    vs --> gamedb
    ss --> gamedb
    gamedb -. pub/sub .-> backend
    gamedb -. pub/sub .-> gs
    gamedb -. pub/sub .-> vs

    backend --> rpc
    backend --> google
    indexer --> rpc

    classDef actor fill:#e8f1ff,stroke:#356bd0,stroke-width:1.5px,color:#000
    classDef edge fill:#fff3e0,stroke:#cc7a00,stroke-width:1.5px,color:#000
    classDef store fill:#f0f7ee,stroke:#3a8a3a,stroke-width:1.5px,color:#000
    classDef external fill:#f4eaf7,stroke:#7a3aa8,stroke-width:1.5px,color:#000
```

- `game-server`: in-game real-time events.
- `view-server`: parallel real-time events serving for viewers.
- `state-server`: serves the full world snapshot on connection.
- `backend`: HTTP/REST API and on-chain actors.
- `game-db` (KeyDB): hot game state and the pub/sub real-time event bus.
- `cache-db` (KeyDB): short-lived tokens (refresh, chat).
- `users-db` (MySQL): durable player data.
- `indexer`: indexes NFT ownership and marketplace listings from Starknet.

## Run your own instance

> [!WARNING]
> Docker is required.

`devops/local/` allows you to run your own instance of the game on your machine. The setup uses the pre-built public images from GHCR.

```bash
cd devops/local
docker compose up -d
```

Then play at <http://localhost>.

### Stopping

```bash
./snapshot.sh           # save world state
docker compose down
```

## Development

> [!WARNING]
> [mkcert](https://github.com/FiloSottile/mkcert) for _localhost_ is required. Generate the cert into `devops/local-dev/certificates/`:
> ```bash
> cd devops/local-dev/certificates
> mkcert -install
> mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost
> ```

For active development with source-mounted containers and hot reload:

```bash
cd devops/local-dev
./setup.sh
docker compose up -d
```

Then access the controller at <https://localhost:3000>. The game is at <https://localhost>.

## Tech stack

- **Frontends**: React 19, Next.js 16, React Three Fiber, Tailwind 4
- **Game servers**: C++20, uWebSockets, redis-plus-plus
- **Backend**: Go 1.26, Gin, go-redis, database/sql + MySQL driver
- **Data**: MySQL 8, KeyDB (Redis-compatible)
- **Blockchain**: Starknet, Cairo, starknet.go, starknetid.go
- **Infra**: Docker Compose, nginx, Cloudflare, Ansible, GitHub Actions

## Team

- [@kamyartaher](https://github.com/kamyartaher): frontend
- [@bastienfaivre](https://github.com/bastienfaivre): backend, infra
- [@NilsDelage](https://github.com/NilsDelage): blockchain

## License

[MIT](LICENSE)
