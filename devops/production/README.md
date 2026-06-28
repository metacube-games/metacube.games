# Metacube — Production Deployment

Single-server deployment for all Metacube services. Everything runs in Docker
Compose behind Cloudflare (Full Strict). All images are built in GitHub CI and
pulled from GHCR. No code is built on the server.

## Prerequisites (laptop)

- Ansible (`brew install ansible`)
- SSH access to the server (add your key to `config/authorized-ssh-keys/`)
- Files that must exist locally but are **gitignored**:

| File/Dir | Description |
|---|---|
| `config/.env` | Full environment file (copy from `config/.env.example` and fill in) |
| `config/certificates/metacube.pem` + `.key` | Cloudflare Origin Cert for metacube.games |
| `config/certificates/felts.pem` + `.key` | Cloudflare Origin Cert for felts.xyz |
| `private/v1-private-key` | Starknet account private key (raw hex) |
| `private/claim-key` | Starknet claim account private key (raw hex) |
| `snapshot/dump.sql` | MySQL dump (from `devops/production/snapshot-06032026/`) |
| `snapshot/world-data/worldData.bin` | World state binary |
| `snapshot/world-data/nft.json` | NFT data |
| `snapshot/world-data/nft_keys.txt` | NFT key coordinates |

Copy snapshot files:
```
cp ../production/snapshot-06032026/dump.sql snapshot/
mkdir -p snapshot/world-data
cp ../production/config/world-data/{worldData.bin,nft.json,nft_keys.txt} snapshot/world-data/
```

## Server IP

Edit `inventory/hosts.ini` — the single place that holds the server IP.

## GitHub Org Secrets (set once in metacube-games org)

| Secret | Value |
|---|---|
| `VPS_HOST` | Server IP |
| `VPS_USER` | `metacube` |
| `VPS_SSH_KEY` | SSH private key for `metacube` user |

## GitHub Org Variables (set once — public build-time values)

| Variable | Value |
|---|---|
| `VITE_REACT_APP_BASE_URL` | `https://play.metacube.games/api/v1` |
| `VITE_REACT_APP_INIT_URL` | `https://play.metacube.games` |
| `VITE_REACT_APP_WEBSOCKET_GAME_URL` | `wss://play.metacube.games/ws/game` |
| `VITE_REACT_APP_WEBSOCKET_VIEW_URL` | `wss://play.metacube.games/ws/view` |
| `VITE_REACT_APP_WEBSOCKET_CHAT_URL` | `wss://play.metacube.games/ws/chat` |
| `VITE_REACT_APP_GOOGLE_CLIENT_ID` | Google OAuth client ID |

## First-time server setup

```bash
# 1. Bootstrap server (run as root, creates metacube user + Docker)
ansible-playbook playbooks/init.yml

# 2. Sync all config, certs, secrets, world data
ansible-playbook playbooks/config.yml

# 3. Start everything (independent services + game cluster)
ansible-playbook playbooks/start.yml
```

MySQL initialises automatically from `snapshot/dump.sql` on first start.

## Sync assets (NFT static files)

Run once after first setup, and whenever assets change:
```bash
rsync -avz assets/nft/ metacube@YOUR_SERVER_IP:/home/metacube/assets/nft/
```

## Day-to-day operations

```bash
# Deploy new game images (pull + ordered restart of game cluster)
ansible-playbook playbooks/deploy-game.yml

# Stop game cluster gracefully (snapshots world data first)
ansible-playbook playbooks/stop.yml

# Push config changes to server (nginx, .env, certs, etc.)
ansible-playbook playbooks/config.yml

# Restore MySQL from snapshot (wipe + reimport dump.sql)
ansible-playbook playbooks/restore-db.yml
```

## CI/CD

Independent services auto-deploy on push to `main` in their repo:
- `landing-page` → `metacube.games`
- `market` → `market.metacube.games`
- `indexer` → `indexer.felts.xyz`
- `signatures` → `signatures.felts.xyz`

Game services build and push to GHCR on push to `main`, but do **not**
auto-restart the server. Run `deploy-game.yml` when ready.

`game-client` is special: CI deploys it automatically only if it is already
running (game cluster is up). If the game is stopped, it stays stopped.

## Service map

| Domain | Container | Port |
|---|---|---|
| `metacube.games` | `landing-page` | 3000 |
| `play.metacube.games` | `game-client` + backends | 443/8080/8000/4444/5555 |
| `market.metacube.games` | `market` | 443 |
| `indexer.felts.xyz` | `indexer` | 3000 |
| `signatures.felts.xyz` | `signatures` | 3000 |
| `felts.xyz/a/...` | `nginx` static | — |
| `private-keys` | internal only | 80 |
