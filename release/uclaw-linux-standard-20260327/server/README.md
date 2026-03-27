# UCLAW Web Server

This is the Node.js/Express backend server for the UCLAW web application. It replaces the Electron main process with a REST API + WebSocket server.

## Architecture

```
server/
├── index.ts          # Main Express server entry point
├── websocket.ts      # WebSocket server for real-time events
├── routes/           # API route handlers
│   ├── store.ts         # Key-value store API
│   ├── skills.ts        # Skills management API
│   ├── mcp.ts           # MCP servers API
│   ├── cowork.ts        # Cowork sessions API
│   ├── im.ts            # IM gateway API
│   ├── scheduledTasks.ts# Scheduled tasks API
│   ├── permissions.ts   # Permissions API
│   ├── app.ts           # App info API
│   ├── log.ts           # Log export API
│   ├── apiProxy.ts      # HTTP proxy API
│   ├── dialog.ts        # File operations API
│   └── shell.ts         # Shell operations API
└── package.json      # Server dependencies
```

## API Endpoints

### Store API (`/api/store/*`)
- `GET /api/store/:key` - Get a value from the store
- `POST /api/store/:key` - Set a value in the store
- `DELETE /api/store/:key` - Remove a value from the store

### Skills API (`/api/skills/*`)
- `GET /api/skills` - List all skills
- `POST /api/skills/enabled` - Set skill enabled state
- `DELETE /api/skills/:id` - Delete a skill
- `POST /api/skills/download` - Download a skill from source
- `GET /api/skills/root` - Get skills root directory path
- `GET /api/skills/autoRoutingPrompt` - Get auto-routing prompt
- `GET /api/skills/:skillId/config` - Get skill config
- `PUT /api/skills/:skillId/config` - Set skill config
- `POST /api/skills/:skillId/testEmail` - Test email connectivity

### MCP API (`/api/mcp/*`)
- `GET /api/mcp` - List all MCP servers
- `POST /api/mcp` - Create a new MCP server
- `PUT /api/mcp/:id` - Update an MCP server
- `DELETE /api/mcp/:id` - Delete an MCP server
- `POST /api/mcp/:id/enabled` - Set MCP server enabled state
- `GET /api/mcp/marketplace` - Fetch MCP marketplace

### Cowork API (`/api/cowork/*`)
- `POST /api/cowork/sessions` - Start a new cowork session
- `POST /api/cowork/sessions/:sessionId/continue` - Continue a session
- `POST /api/cowork/sessions/:sessionId/stop` - Stop a session
- `DELETE /api/cowork/sessions/:sessionId` - Delete a session
- `DELETE /api/cowork/sessions` - Batch delete sessions
- `PATCH /api/cowork/sessions/:sessionId/pin` - Set session pinned state
- `PATCH /api/cowork/sessions/:sessionId` - Rename session
- `GET /api/cowork/sessions/:sessionId` - Get a session
- `GET /api/cowork/sessions` - List all sessions
- `GET /api/cowork/config` - Get cowork configuration
- `PUT /api/cowork/config` - Set cowork configuration
- `POST /api/cowork/permissions/:requestId/respond` - Respond to permission request
- `GET /api/cowork/memory/entries` - List memory entries
- `POST /api/cowork/memory/entries` - Create a memory entry
- `PUT /api/cowork/memory/entries/:id` - Update a memory entry
- `DELETE /api/cowork/memory/entries/:id` - Delete a memory entry
- `GET /api/cowork/memory/stats` - Get memory statistics
- `GET /api/cowork/sandbox/status` - Get sandbox status
- `POST /api/cowork/sandbox/install` - Install sandbox

### IM Gateway API (`/api/im/*`)
- `GET /api/im/config` - Get IM configuration
- `PUT /api/im/config` - Set IM configuration
- `POST /api/im/gateways/:platform/start` - Start an IM gateway
- `POST /api/im/gateways/:platform/stop` - Stop an IM gateway
- `POST /api/im/gateways/:platform/test` - Test an IM gateway connection
- `GET /api/im/status` - Get all IM gateways status

### Scheduled Tasks API (`/api/tasks/*`)
- `GET /api/tasks` - List all scheduled tasks
- `GET /api/tasks/:id` - Get a specific task
- `POST /api/tasks` - Create a new scheduled task
- `PUT /api/tasks/:id` - Update a scheduled task
- `DELETE /api/tasks/:id` - Delete a scheduled task
- `POST /api/tasks/:id/toggle` - Toggle task enabled state
- `POST /api/tasks/:id/run` - Manually run a task
- `POST /api/tasks/:id/stop` - Stop a running task
- `GET /api/tasks/:id/runs` - List task run history
- `GET /api/tasks/:id/runs/count` - Count task runs
- `GET /api/tasks/runs/all` - List all runs across all tasks

### Permissions API (`/api/permissions/*`)
- `GET /api/permissions/calendar` - Check calendar permission status
- `POST /api/permissions/calendar` - Request calendar permission

### App API (`/api/app/*`)
- `GET /api/app/version` - Get app version
- `GET /api/app/locale` - Get system locale
- `GET /api/app/autoLaunch` - Get auto-launch status
- `PUT /api/app/autoLaunch` - Set auto-launch status
- `GET /api/app/info` - Get app information

### Log API (`/api/log/*`)
- `GET /api/log/path` - Get log file path
- `GET /api/log/export` - Export logs as zip file

### API Proxy (`/api/api/*`)
- `POST /api/api/fetch` - Make a regular HTTP request (CORS proxy)
- `POST /api/api/stream` - Initiate a streaming request (SSE)
- `DELETE /api/api/stream/:requestId` - Cancel a streaming request

### Dialog API (`/api/dialog/*`)
- `GET /api/dialog/directory` - Get working directory info
- `POST /api/dialog/saveInlineFile` - Save an uploaded file to disk
- `GET /api/dialog/readFileAsDataUrl` - Read a file and return as data URL

### Shell API (`/api/shell/*`)
- `GET /api/shell/openPath` - Get info for opening a file
- `GET /api/shell/showItemInFolder` - Get info for showing file in folder
- `GET /api/shell/openExternal` - Get info for external URL

## WebSocket Events

The WebSocket server at `/ws` supports real-time events:

### Client → Server Messages
- `subscribe` - Subscribe to a room (e.g., cowork session)
- `unsubscribe` - Unsubscribe from a room
- `ping` - Ping message

### Server → Client Events
- `system:connected` - Connection established
- `cowork:stream:message` - New message in cowork session
- `cowork:stream:messageUpdate` - Message content update
- `cowork:stream:permission` - Permission request
- `cowork:stream:complete` - Session completed
- `cowork:stream:error` - Session error
- `cowork:sandbox:downloadProgress` - Sandbox download progress
- `im:status:change` - IM gateway status change
- `im:message:received` - IM message received
- `scheduledTask:statusUpdate` - Scheduled task status update
- `scheduledTask:runUpdate` - Task run update
- `skills:changed` - Skills configuration changed

## Running the Server

```bash
# Development
npm run server:dev

# Production
npm run build
npm start
```

Deployment-safe production start defaults to:

- `--no-open`
- `--host 0.0.0.0`

Local manual production check:

```bash
npm run start:local
```

Direct CLI example:

```bash
node server/dist/server/src/cli.js --no-open --host 0.0.0.0 --port 3001 --workspace .
```

Health check:

```text
GET /health
```

## Environment Variables

- `PORT` - HTTP server port (default: `3001`)
- `NODE_ENV` - Environment (`development` / `production`)
- `CORS_ORIGIN` - CORS allowed origin (default: `*`)
- `UCLAW_DATA_PATH` / `LOBSTERAI_DATA_PATH` - Runtime data root override
- `UCLAW_WORKSPACE` / `LOBSTERAI_WORKSPACE` - Project workspace root override
- `UCLAW_APP_ROOT` / `LOBSTERAI_APP_ROOT` - App root override

Notes:

- Default runtime user data path is `./.uclaw/web`
- `UCLAW_DATA_PATH` and `--data-dir` must point inside the project root; external paths are ignored for runtime safety
- In production the static frontend is served by the same Node process from `server/public`

## Integration with Existing Code

The server reuses the following modules from `src/main/`:
- `sqliteStore.ts` - SQLite storage
- `coworkStore.ts` - Cowork session storage
- `libs/coworkRunner.ts` - Cowork execution engine
- `skillManager.ts` - Skills management
- `mcpStore.ts` - MCP server storage
- `im/` - IM gateway manager
- `scheduledTaskStore.ts` - Scheduled tasks storage
- `libs/scheduler.ts` - Task scheduler
