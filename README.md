# UCLAW 1.0 Mainline Clean Web Package

这个目录是当前一期主线的纯净 web 交付包。

## 范围

- 包含：`Web / Feishu / Scheduler / 记忆链 / 4 固定角色槽位`
- 排除：`node_modules / dist / clean-room / .uclaw / release caches / Room 实验线`

## 当前口径

- 身份唯一真理：`agentRoleKey`
- 模型只是运行配置：`modelId`
- 一期先保固定四角色：`organizer / writer / designer / analyst`
- MCP 一期前端只展示“当前支持 / 可接入”，隐藏未收口的自定义入口
- PDF / Word / 常见附件解析属于系统底层能力，不依赖单独 skill

## 使用

```bash
npm install
npm run dev:web
```

生产构建：

```bash
npm run build
npm run start
```

文档入口：

- `docs/AGENTS.md`
- `docs/MAINLINE_1.0_BOUNDARY.md`
- `docs/RUNBOOK_1.0.md`
- `docs/PURE_PACKAGE_FILETREE.md`
- `docs/REPAIR_CHECKLIST_2026-03-25_06-07.md`
