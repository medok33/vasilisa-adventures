# VDS deployment

This package is intentionally isolated from the existing Weight App staging stack.

Before deployment, read the repository root `AGENTS.md` and
`docs/PROJECT_STATE.md`. Never deploy from an uncommitted or unknown source
state.

- Compose project: `vasilisa-adventures`
- Application path on the server: `/opt/vasilisa-adventures`
- Local application port: `127.0.0.1:3100`
- Public ports owned by Caddy: `80/tcp`, `443/tcp`, `443/udp`
- Persistent progress volume: `vasilisa-adventures-data`
- Time zone: `Europe/Moscow`

Start the application without the public proxy:

```bash
docker compose -f vds/compose.yaml up -d --build app
curl -fsS http://127.0.0.1:3100/
```

After DNS points to the server, start Caddy:

```bash
docker compose -f vds/compose.yaml up -d caddy
```

Back up progress:

```bash
docker run --rm -v vasilisa-adventures-data:/data -v "$PWD/backups:/backup" alpine \
  sh -c 'tar -czf /backup/vasilisa-data-$(date +%F-%H%M%S).tgz -C /data .'
```
