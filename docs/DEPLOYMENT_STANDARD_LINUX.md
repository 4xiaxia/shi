# Standard Linux Deployment

## Standard

- Package manager: `npm`
- Install command: `npm ci`
- Build command: `npm run build`
- Preflight command: `npm run deploy:check`
- Start command: `npm start`
- Process manager: `systemd`

## Zeabur

- Deploy this repo as a `Node.js` service, not a static site
- Keep the service root at the repository root
- Use build command `npm run build`
- Use start command `npm start`
- Do not set `ZBPACK_OUTPUT_DIR`
- Do not configure static output directory `dist`
- Real build outputs are `server/public` and `server/dist`

If your Zeabur log shows `COPY --from=build /src/dist /`, the platform is looking for a static-site output folder that this repository does not produce

## Why not `yarn`

- Repo only ships `package-lock.json`
- Standard deployment baseline is `npm`, not `yarn`
- Log warnings like `Unknown env config` usually come from running `npm` inside `yarn`
- `glob` / `inflight` warnings in your log are transitive dev-tool warnings, not the primary deployment breaker
- Root `zbpack.json` explicitly pins Zeabur build/start commands to `npm`

## Required env

These are required for standard unattended deployment:

- `NODE_ENV=production`
- `PORT=3001` or platform-injected port
- `CORS_ORIGIN=https://your-domain.example.com`
- `UCLAW_DATA_PATH=.uclaw`
- `UCLAW_API_BASE_URL`
- `UCLAW_API_KEY`
- `UCLAW_DEFAULT_MODEL`

## Optional env

- Feishu:
  - `UCLAW_FEISHU_APP_ID`
  - `UCLAW_FEISHU_APP_SECRET`
  - `UCLAW_FEISHU_AGENT_ROLE_KEY`
  - `UCLAW_FEISHU_API_BASE_URL`
  - `UCLAW_FEISHU_APP_NAME`
- Daily memory:
  - `UCLAW_DAILY_MEMORY_API_BASE_URL`
  - `UCLAW_DAILY_MEMORY_API_KEY`
  - `UCLAW_DAILY_MEMORY_MODEL`
  - `UCLAW_DAILY_MEMORY_API_FORMAT`
- Skills MCP Assistant:
  - `UCLAW_SKILLS_MCP_ASSISTANT_API_URL`
  - `UCLAW_SKILLS_MCP_ASSISTANT_API_KEY`
- IMA:
  - `IMA_OPENAPI_CLIENTID`
  - `IMA_OPENAPI_APIKEY`

## Install steps

```bash
cd /opt/uclaw
npm ci
sudo mkdir -p /etc/uclaw
sudo cp deploy/linux/uclaw.env.example /etc/uclaw/uclaw.env
npm run build
npm run deploy:check
sudo cp deploy/linux/uclaw.service /etc/systemd/system/uclaw.service
sudo systemctl daemon-reload
sudo systemctl enable --now uclaw
```

## Checks

```bash
systemctl status uclaw
journalctl -u uclaw -n 200 --no-pager
curl http://127.0.0.1:3001/health
```

## Notes

- `CORS_ORIGIN=*` is not accepted by `deploy:check` in standard production mode
- `UCLAW_DATA_PATH` must remain inside project root
- Run `npm run build` before first start or after upgrades
