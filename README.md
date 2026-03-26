# UCLAW 1.0 Mainline Clean Web Package

这个目录是当前一期主线的纯净 Web 交付包，口径以自动化部署可落地为准。

## 范围

- 包含：`Web / Feishu / Scheduler / 记忆链 / 4 固定角色槽位`
- 排除：`node_modules / dist / .uclaw / release caches / Room 实验线`
- 特例：保留 `clean-room/spine/modules`，因为当前现役 Web / Feishu 主链仍直接依赖它

## 当前口径

- 身份唯一真理：`agentRoleKey`
- 模型只是运行配置：`modelId`
- 一期先保固定四角色：`organizer / writer / designer / analyst`
- MCP 一期前端只展示“当前支持 / 可接入”，隐藏未收口的自定义入口
- PDF / Word / 常见附件解析属于系统底层能力，不依赖单独 skill

## 环境要求

- Node.js：`>=24 <25`
- npm：随 Node 24
- 首次运行建议复制 `.env.example` 为 `.env`

## 本地开发

```bash
npm install
npm run dev:web
```

默认会启动：

- API：`http://127.0.0.1:3001`
- Web：`http://127.0.0.1:5176`

## 生产构建

```bash
npm install
npm run build
```

## 生产启动

自动化部署默认使用：

```bash
npm start
```

当前 `npm start` 已固定为：

- `--no-open`：避免服务器/CI/headless 环境因尝试打开浏览器报错
- `--host 0.0.0.0`：避免只绑定 `127.0.0.1` 导致平台外部无法访问

本地手动验证生产包可用：

```bash
npm run start:local
```

## 自动化部署必读

- 构建命令：`npm install && npm run build`
- 启动命令：`npm start`
- 健康检查：`GET /health`
- 默认端口：`3001`，平台可通过 `PORT` 注入覆盖
- 生产环境推荐设置：`NODE_ENV=production`
- 生产模式下前端静态资源由同一个 Node 服务托管，不需要再单独起 Vite

## 数据目录与持久化

- 默认运行数据目录：`./.uclaw/web`
- 允许通过 `UCLAW_DATA_PATH` 或 `--data-dir` 覆盖
- 重要：运行数据目录必须位于项目根目录内部，否则会被运行时安全逻辑忽略并回退到默认目录
- 如果是 Render / Railway / Koyeb / 自建容器这类自动化部署，请把持久化卷挂载到项目目录内，再把 `UCLAW_DATA_PATH` 指向该目录
- 推荐做法：直接使用相对路径 `.uclaw`，或平台内项目绝对路径下的 `.uclaw`

## 最小环境变量

- `NODE_ENV=production`
- `PORT=3001` 或由平台注入
- `CORS_ORIGIN=*` 或你的前端域名
- `UCLAW_API_BASE_URL` / `UCLAW_API_KEY` / `UCLAW_DEFAULT_MODEL`

可选：

- `UCLAW_DATA_PATH=.uclaw`
- `UCLAW_FEISHU_APP_ID`
- `UCLAW_FEISHU_APP_SECRET`
- `UCLAW_FEISHU_AGENT_ROLE_KEY`

推荐生产 `.env` 例子：

```dotenv
NODE_ENV=production
PORT=3001
CORS_ORIGIN=*
UCLAW_DATA_PATH=.uclaw
UCLAW_API_BASE_URL=https://api.openai.com/v1
UCLAW_API_KEY=your_api_key
UCLAW_DEFAULT_MODEL=gpt-5.4
```

补充说明：

- `PORT` 在自动化平台一般由平台注入，保留默认即可
- `UCLAW_DATA_PATH` 推荐写 `.uclaw`，会落到项目内的 `./.uclaw/web`
- `UCLAW_APP_ROOT` 和 `UCLAW_WORKSPACE` 一般不要手填，除非你明确知道自己在做非常规启动
- 新部署统一写 `UCLAW_*`，旧的 `LOBSTERAI_*` 只是兼容读取

## 文档入口

- `docs/AGENTS.md`
- `docs/MAINLINE_1.0_BOUNDARY.md`
- `docs/RUNBOOK_1.0.md`
- `docs/PURE_PACKAGE_FILETREE.md`
- `docs/REPAIR_CHECKLIST_2026-03-25_06-07.md`
