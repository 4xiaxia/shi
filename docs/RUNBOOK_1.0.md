# RUNBOOK 1.0

## 环境

- Node.js: `>=24 <25`
- 首次运行先复制 `.env.example -> .env`

## 开发

```bash
npm install
npm run dev:web
```

默认会启动：

- backend: `http://127.0.0.1:3001` 起自动避让
- frontend: `http://127.0.0.1:5176` 起自动避让

## 生产

```bash
npm run build
npm run start
```

## 飞书一期

最少检查：

- `UCLAW_FEISHU_APP_ID`
- `UCLAW_FEISHU_APP_SECRET`
- `UCLAW_FEISHU_AGENT_ROLE_KEY`

## 文档解析

- PDF / Word / 常见文本附件读取走系统底层解析链
- 不需要单独安装 `pdf` / `word` skill
- 当前支持：`pdf / doc / docx / txt / md / csv / json / xml / html / xlsx(基础)`

## 纯净包刷新

```bash
npm run package:web-clean
```
