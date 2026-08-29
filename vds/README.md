# VDS deployment

This package is intentionally isolated from the existing Weight App staging stack.

Before deployment, read the repository root `AGENTS.md` and
`docs/PROJECT_STATE.md`. Never deploy from an uncommitted or unknown source
state.

- Compose project: `vasilisa-adventures`
- Application source path on the server: `/opt/vasilisa-adventures/source`
- Local application port: `127.0.0.1:3100`
- Public ports owned by Caddy: `80/tcp`, `443/tcp`, `443/udp`
- Persistent progress volume: `vasilisa-adventures-data`
- Time zone: `Europe/Moscow`

## Private site environment

Before building, set these values in a root-owned VDS environment file or the
service environment. Never commit the real values:

```bash
SITE_AUTH_USERNAME=...
SITE_AUTH_PASSWORD=...
SITE_AUTH_SECRET=...
DAD_PHONE=...
DAD_VK_URL=...
DAD_MAX_URL=...
APP_REVISION=$(git rev-parse HEAD)
```

`SITE_AUTH_SECRET` must be a separate random value, not the site password.
The application fails closed when any authentication variable is missing.
Only `/api/health` remains public for the Docker healthcheck.
The father's phone and messenger links are returned only by the authenticated
`/api/contact` endpoint and are never stored in GitHub or browser progress.

Start the application without the public proxy:

```bash
docker compose -f vds/compose.yaml up -d --build app
curl -fsS http://127.0.0.1:3100/
```

After authentication is enabled, verify the health endpoint instead of the
protected home page:

```bash
curl -fsS http://127.0.0.1:3100/api/health
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
