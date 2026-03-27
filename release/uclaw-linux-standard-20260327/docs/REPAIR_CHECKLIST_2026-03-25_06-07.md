# 修复清单与施工优先级

> 记录时间: 2026-03-25 06:07
> 适用范围: `D:\Users\Admin\Desktop\3-main`
> 目的: 把“我们已经确认的问题”、“旧污染活口”、“Kimi 提醒但仍需核实的点”统一收口，作为后续修复工作板。
> 原则: 不盲改；先保护主轴，再做切除；所有事项都按严重度、难度、波及面来排。
>
> **增量批注（2026-03-26）**：本台账中所有 `DingTalk` 项，原先描述的是“冻结旧链待迁桥”。当前分支已改为“稳定优先的软性收束”：`server/routes/dingtalkWebhook.ts` 作为兼容壳保留，服务端仍注册 `/api/im/dingtalk`，但不再进入 live 执行链，只返回明确禁用响应。下文相关条目保留为历史审计记录，不再视为当前待修活口。

---

## 2026-03-26 飞书补充记录

- `{PROGRESS}` 已确认：现有两个飞书 bot 正常，新增 bot 异常不属于“飞书全链路挂掉”。
- `{PROGRESS}` 已确认：`AionUi` 存在独立“配对码 -> 本地批准 -> 用户授权”闭环；UCLAW 当前没有这层配对体系，不能直接按同口径判断。
- `{BREAKPOINT}` 当前新增 bot 的直接症状之一，是 `server/libs/feishuGateway.ts` 的发送失败会被吞掉，导致日志看似流程跑完，但用户侧无回复。
- `{PROGRESS}` 已处理：`server/libs/feishuGateway.ts` 现已改为让 `sendTextReply()` 返回发送结果；`processConversation()` 只在正文/错误/空结果真正发出去后才视为成功，不再静默吞失败。
- `{PROGRESS}` 已验证：服务端类型检查通过（`server/tsconfig.json`）。
- `{BREAKPOINT}` 待继续：新增 bot 是否仍存在“绑定完成但会话/回复落点异常”，以及是否需要补“配对/授权”这一层产品能力；这属于下一步评估，不在本次最小补丁里硬塞。

---

## 0. 先钉死的主轴

这些不是“可选方向”，是后续修复时绝不能误伤的资产：

- `小眼睛` 是轻链外挂能力，不是普通 skills 附件。
- `IMA` 是外挂能力，不是可以随便并回旧重链的普通插件。
- `skills 商店 / skills 插件 / MCP` 是并存分层，不是互相替代。
- `角色隔离` 是硬约束：不同角色看到不同 skills / 记忆 / MCP 能力视图。
- `agentRoleKey` 是唯一身份真理；`modelId` 只是可变运行配置，绝不能作为记忆/线程/任务/能力视图的隔离键。
- `4 主角色 runtime 配置层` 与 `任意 agentRoleKey 的会话/记忆层` 不是一回事：
  - `organizer / writer / designer / analyst` 目前只负责模型、角色技能、原生能力配置解析。
  - `cowork_sessions / user_memories / identity_thread_24h` 的身份桶必须保留原始 `agentRoleKey`，不能被 runtime 归一化反写污染。
- `all` 只是展示聚合，不是存储桶，不是归属判断。
- `同公司，共底座；不同员工，不共脑。`
- `聊天域` 和 `调度域` 必须隔离：无关角色的定时任务不得进入当前聊天上下文。
- 一期范围收紧：主线只看 `Web / Feishu / 定时任务 / 记忆链`，`DingTalk` 冻结，不纳入本期迁桥。
- `2H4G` 低配机是性能基线。
- `按需加载 / 后台异步 / 静默 / 渐进式披露` 是架构要求，不是优化建议。
- `CoworkRunner` 不允许再回到默认主链。
- `window.electron` 兼容壳不能继续被合理化成最终形态。

---

## 1. 真相分层

### 1.1 已确认问题

这些是已经被活代码或现役文档确认过的：

- `CoworkRunner` 仍在多条活路径里执行。
- Web 主链虽然已有 `HttpSessionExecutor`，但仍存在回退到旧链的口。
- `DingTalk` 入口仍直走 `CoworkRunner.startSession(...)`。
- `Scheduler` 仍直走 `CoworkRunner.startSession(...)`。
- `WS bridge` 仍绑在 `CoworkRunner` 事件语义上。
- `stop / permission` 仍有旧链依赖。
- 前端 Web 仍大量依赖 `window.electron.*` 兼容壳。
- `fetch / start / continue` 失败时用户可见反馈不足。
- `stop` 中断收尾不完全。
- `cache hit / conversation backup` 后端有，前端可见性不足。
- `mermaid` / `base64 inline image` 聊天链路仍不完整。

### 1.2 Kimi 有帮助但不能直接当真相源

以下方向可作为提醒，但落地前必须回到活代码核实：

- 前端业务流从 `DB -> route -> API -> page` 的分层梳理方式是对的。
- 角色技能真相收口到 `roles/<role>/skills.json` 这个方向是对的。
- `skills 未按角色刷新`、`启动时全量加载`、`长消息重渲染`、`大文件阻塞` 这些都值得复查。

### 1.3 仍需继续核实

- `CoworkPromptInput` 是否仍存在首屏/输入前的过早 skills 加载。
- 前端 `skills / mcp / scheduledTasks / Settings` 是否仍有默认重请求乱飞。
- `Feishu` 是否已经完全脱离旧重链，还是局部还残留旧语义。

---

## 2. 修复工作板

说明：

- `严重度`：`P0 / P1 / P2`
- `难度`：`S / M / L / XL`
- `顺序建议`：不是只看 P 级，还要看“能否先收简单有效的”

| ID | 问题 | 来源 | 严重度 | 难度 | 波及面 | 顺序建议 |
|---|---|---|---|---|---|---|
| R1 | `DingTalk` 入口仍直接走 `CoworkRunner.startSession` 重链 | 活代码已确认 | P0 | M-L | 渠道连续性、回复抽取、低配性能 | 第一批 |
| R2 | `Scheduler` 仍直接走 `CoworkRunner` | 活代码已确认 | P0 | M-L | 定时任务、会话状态、stop 语义 | 第一批 |
| R3 | `cowork` 主路由命中特定 skill 负载时仍回退旧链 | 活代码已确认 | P0 | L | 小眼睛 / IMA / skill config / secret / 权限 | 第一批，但需谨慎 |
| R4 | `WS bridge` 仍绑在 `CoworkRunner` 事件模型上 | 活代码已确认 | P0 | XL | 全部流式会话 UI | 第二批 |
| R5 | `stop` 会话打断收尾不完整 | 现役文档已确认 | P0 | M | 体验、会话一致性 | 第一批，能先修 |
| R6 | `fetch / start / continue` 失败时用户无稳定可见反馈 | 现役文档 + 活代码已确认 | P0 | S | 所有会话失败场景 | 第一批，先修简单的 |
| R7 | `permission` 响应仍直接依赖旧链 `PermissionResult` | 活代码已确认 | P0 | L | 审批流、非 SDK 执行器兼容 | 第二批 |
| R8 | `window.electron` 兼容壳仍是前端主调用面 | 活代码已确认 | P0 | XL | 整个前端服务层 | 先评估，不先硬拆 |
| R9 | `cache hit` 后端已有，前端不可见 | 现役文档已确认 | P1 | S | 会话详情、缓存认知 | 第一批，快修 |
| R10 | `conversation backup` 后端已有，设置页不可见 | 现役文档已确认 | P1 | S | 归档可见性 | 第一批，快修 |
| R11 | `mermaid` 聊天链路未完成 | 现役文档已确认 | P1 | M | artifact 体验 | 第二批 |
| R12 | `base64 inline image` 在 markdown 内联场景不稳定 | 现役文档已确认 | P1 | M | 图片显示 | 第二批 |
| R13 | 引用/长原文折叠治理不足 | 现役文档已确认 | P1 | M | 长会话体验 | 第二批 |
| R14 | 小眼睛 / IMA / native 外挂能力的 UI 与执行边界仍需再核 | 我们主轴 + 活代码 | P0 | M | 主资产保护 | 与 R3 并行核实 |
| R15 | `CoworkPromptInput` 是否还在输入前过早加载 skills | Kimi 提醒 + 待核实 | P1 | M | 首屏性能 | 先核实后排期 |
| R16 | `skills / MCP / role-runtime` 是否仍有默认重请求乱飞 | Kimi 提醒 + 待核实 | P1 | M-L | 低配性能、冷启动 | 先核实后排期 |
| R17 | 前端主调用面是否可从 `electron shim` 渐进迁到明确的 `web api contract` | 我们结构判断 | P1 | XL | 全前端 | 立项评估，不当场猛拆 |
| R18 | 导出动作默认全量吃历史，长会话会把详情页撑重 | 活代码已确认 | P1 | M | 导出体验、长会话性能 | 第一批，先修简单止血 |

---

## 3. 推荐施工顺序

### 第一批：先收简单且止血明显的

这批不一定最“根”，但能立刻减少混乱、减少用户痛感：

1. `R6` 会话失败可见反馈
2. `R5` stop 收尾
3. `R9` cache hit 可见
4. `R10` backup 可见
5. `R1` DingTalk 旧链切换
6. `R2` Scheduler 旧链切换

理由：

- 都是用户直接感知问题
- 能快速提高“系统像活着的、可控的”感觉
- 不需要马上把整个旧污染一次性拔根

### 第二批：切主热链里的旧污染活口

1. `R3` Web 主路由回退旧链
2. `R7` permission 旧协议
3. `R4` WS bridge 旧语义

理由：

- 这批是真正的主链债
- 但误伤面更大，必须在第一批稳定后再切

### 第三批：做结构重构评估，不硬砍

1. `R8` electron 兼容壳
2. `R17` 前端调用面渐进迁移

理由：

- 这是“实质性重构”
- 不能边抢救体验边大规模换前端服务层

---

## 4. 待评估-可能波及清单

这些文件已经打了源码标签，后续一动就要成组评估：

- `server/src/index.ts`
- `server/libs/sessionExecutorAdapter.ts`
- `server/routes/cowork.ts`
- `server/routes/dingtalkWebhook.ts`
- `src/renderer/services/electronShim.ts`

后续建议继续补标签的文件：

- `src/main/libs/scheduler.ts`
- `server/routes/feishuWebhook.ts`
- `server/routes/permissions.ts`
- `src/renderer/services/cowork.ts`

---

## 5. 绝不能误伤的资产

修任何一条旧污染前，必须先检查：

- `小眼睛` 是否仍能按轻链外挂能力工作
- `IMA` 是否仍保持外挂能力边界
- `skills 商店` 与 `skills 插件` 是否仍分层清楚
- `MCP` 是否仍作为独立能力层，而不是反向绑回主聊天重链
- `roles/<role>/skills.json` 是否仍是角色可见技能真相
- `2H4G` 基线是否被新方案拖垮

---

## 6. 简单先修原则

如果某个 `P0` 非常恶心、波及过大，就不要硬顶着先开刀。

优先做：

- `P0 + 难度 S/M`
- `P1 + 用户直观收益高`
- `P0 + 能把后续重构风险降低的铺路项`

不要做：

- 看起来很帅、实际上会一口气动太多层的“大手术”
- 没先立边界就直接删旧链
- 只拆不补、让系统进入半死不活中间态

---

## 7. 当前建议

如果下一轮正式开修，建议从下面 4 项里挑：

1. `R6` 会话失败可见反馈
2. `R5` stop 收尾
3. `R9` cache hit UI 可见
4. `R10` conversation backup UI 可见

这四项共同特点：

- 风险低
- 感知强
- 能快速把系统从“失控感”里拉回来
- 不会马上误伤小眼睛 / IMA / 角色技能主轴

---

## 8. 记账规则

后续每修一项，都要补：

- `状态`: 未开始 / 核实中 / 修复中 / 已完成 / 已回退
- `证据`: 文件 / 路由 / 标签
- `是否波及主链`: 是 / 否
- `是否波及小眼睛 / IMA / 角色 skills / MCP`: 是 / 否

不写等于没做。

---

## 9. 进度更新

### 2026-03-25 06:41

- `R6` 已落地第一刀：
  - 文件: `src/renderer/services/cowork.ts`
  - 动作: 为 `start / continue / stop / respondToPermission` 的失败统一补上 `showGlobalToast(...)`
  - 结果: 不再只写 console，用户可直接看到失败反馈
  - 验证: `tsc -p tsconfig.json --noEmit` 已通过

### 2026-03-25 06:53

- `R18` 已落地第一刀：
  - 文件: `src/renderer/components/cowork/CoworkSessionDetail.tsx`
  - 动作: 导出图片 / Markdown 前先填写“最近 N 轮对话”，再按需懒加载到刚好够用，不再默认 `messageLimit = totalMessageCount`
  - 结果: 长会话导出不再把整个详情页默认撑成全历史；日常浏览仍保持最近片段优先
  - 标签:
    - `{标记} P1-EXPORT-RECENT-ONLY`
  - 验证: `tsc -p tsconfig.json --noEmit` 已通过
  - 状态: 已完成

- 图纸已改写为真相版：
  - 文件: `docs/FRONTEND_BUSINESS_FLOW_MARKERS.md`
  - 动作: 移除外部整理稿口径，改为基于活代码的 Web/Feishu/旧污染分层图
  - 状态: 已完成

- `R15` 已落地第一刀：
  - 文件: `src/renderer/components/cowork/CoworkPromptInput.tsx`
  - 动作: 聊天输入区改为“首次真正用到 skills 时再加载目录，并且仅在目录已加载后才订阅 skills changed”
  - 结果: 聊天首屏不再白吃 skills 目录刷新；仍保留已选技能和手动打开 skills 时的必要加载
  - 标签:
    - `{标记} P1-LAZY-SKILL-CATALOG`
  - 验证: `tsc -p tsconfig.json --noEmit` 已通过
  - 状态: 已完成

- `R16` 已落地第一刀（任务表单支线）：
  - 文件: `src/renderer/components/scheduledTasks/TaskForm.tsx`
  - 动作:
    - 技能选择改为“已有绑定才预载，否则点了再加载”
    - IM 通知改为“已有通知绑定才预载，否则打开通知下拉时再初始化”
  - 结果: 新建/编辑任务时不再默认把两个可选能力整包拉起
  - 标签:
    - `{标记} P1-LAZY-TASKFORM-SKILLS`
    - `{标记} P1-LAZY-TASKFORM-NOTIFY`
  - 验证: `tsc -p tsconfig.json --noEmit` 已通过
  - 状态: 已完成

### 2026-03-25 23:55

- `P0 / 项目根目录真相` 再收束一刀：
  - 文件: `server/src/index.ts`
  - 动作:
    - 启动最早期先从 `.env` 所在目录或项目标记目录推导 `bootstrapProjectRoot`
    - 预写 `UCLAW_APP_ROOT / UCLAW_WORKSPACE` 环境别名，避免服务主线先吃 shell cwd
    - 移除模块加载期的 `getUserDataPath()` 提前求值
    - 保留 `userDataPath` 导出名兼容，但改成启动后再赋值
    - `app.set('userDataPath', ...)` 改成只在 `startServer()` 内绑定
  - 结果:
    - 服务主线默认根目录先落到项目根，不再默认跟随当前 shell 目录
    - 服务启动前不再因为模块初始化抢先锁定错误 runtime 路径
    - `setProjectRoot(resolvedWorkspace)` 成为这条主链的先行真相
  - 验证:
    - `tsc -p server/tsconfig.json` 已通过
    - `tsc -p tsconfig.json --noEmit` 已通过
  - 状态: 已完成

- `process.cwd()` 收尾盘点：
  - `src/shared/runtimeDataPaths.ts:15`
    - 性质: bootstrap fallback
    - 说明: 只在还没有显式 workspace / appRoot 环境别名时兜底，不再是运行期主真相
  - `server/routes/dingtalkWebhook.ts:246`
    - 性质: 冻结区遗留
    - 说明: 按一期边界暂不处理 DingTalk，避免扩大修改面
  - 结论:
    - Server 主线的启动前 `cwd` 漂移已拔除
    - 当前剩余项均已注明边界，不属于继续无声扩散的隐患

### 2026-03-26 00:05

- `P0 / 旧 runtime 自动回流` 已拔除：
  - 文件:
    - `src/shared/runtimeDataPaths.ts`
    - `server/src/index.ts`
  - 动作:
    - 删除旧家目录 `.uclaw/.lobsterai` 自动扫描与自动拷贝逻辑
    - 删除服务启动时 `migrateLegacyRuntimeData(...)` 自动吸入入口
  - 结果:
    - 项目运行态不再悄悄回吸当前机器历史数据
    - 新项目 / U 盘项目 / 可移动目录项目只保自己的 `.uclaw` 运行态
    - “力保新的，断开旧污染回流” 已落到代码
  - 验证:
    - `rg -n "migrateLegacyRuntimeData|getLegacyRuntimeUserDataCandidates|shouldMergeLegacyIntoTarget" src server` 无源码命中
    - `tsc -p server/tsconfig.json` 已通过
    - `tsc -p tsconfig.json --noEmit` 已通过
  - 状态: 已完成

- `当前剩余边界`：
  - `src/shared/runtimeDataPaths.ts:15`
    - 性质: bootstrap fallback
    - 说明: 仅作为未注入显式根目录时的兜底，不再参与 server 主线启动定根
  - `server/routes/dingtalkWebhook.ts:246`
    - 性质: 冻结区遗留
    - 说明: 一期明确冻结，不扩改面

### 2026-03-26 00:16

- `P0 / shared 根解析最后收口` 已完成：
  - 文件:
    - `src/shared/runtimeDataPaths.ts`
  - 动作:
    - 删除 `resolveConfiguredProjectRoot()` 中对 `process.cwd()` 的依赖
    - 改为优先使用：环境别名 -> `process.resourcesPath` -> 启动脚本路径 `process.argv[1]` -> 当前模块路径推导项目根
  - 结果:
    - shared 层项目根解析不再把当前 shell 目录当真相
    - 主线 Web / Server / runtime shared helper 已彻底脱离 `cwd` 漂移
  - 验证:
    - `tsc -p server/tsconfig.json` 已通过
    - `tsc -p tsconfig.json --noEmit` 已通过
    - `rg -n "process\\.cwd\\(" src/shared/runtimeDataPaths.ts server/src/index.ts server/routes/dingtalkWebhook.ts` 现在只剩 DingTalk 冻结区命中
  - 状态: 已完成

### 2026-03-26 00:22

- `主线收尾验收`：
  - 结论:
    - 主线源码里的 `process.cwd()` 已只剩 DingTalk 冻结区
    - 旧 runtime 自动回流相关符号已无主线引用
    - `agentRoleKey = 身份真相`、`modelId = runtime 元数据` 的边界仍保持
  - 验证:
    - `rg -n "process\\.cwd\\(" src server` 只命中 `server/routes/dingtalkWebhook.ts:246`
    - `rg -n "migrateLegacyRuntimeData|getLegacyRuntimeUserDataCandidates|shouldMergeLegacyIntoTarget|Moved legacy runtime data" src server` 无源码命中
    - `server/libs/identityThreadHelper.ts` 仍明确标注“去掉 modelId 隔离，只按 agentRoleKey 查询/隔离”
    - `server/libs/feishuGateway.ts` 仍保持 `agentRoleKey` 作为 identity key，`modelId` 作为 runtime 解析结果
  - 状态: 已完成

### 2026-03-25 16:23

- `P0-身份边界` 已补飞书主线缺口：
  - 文件:
    - `clean-room/spine/modules/feishuRuntime.ts`
    - `server/libs/feishuGateway.ts`
  - 真相:
    - 飞书绑定层此前把 `agentRoleKey` 同时当成“身份键”和“4 主角色 runtime 槽位”。
    - 这会导致自定义小 agent 在飞书入口无法保留真实身份，只能被迫按 `organizer/writer/designer/analyst` 解释或直接报 runtime 未配置。
  - 动作:
    - 保留原始 `agentRoleKey` 作为 session / `identity_thread_24h` / `user_memories` 的身份键。
    - 仅在模型与运行时能力解析时，把未知身份回落到 4 主角色 runtime 槽位。
  - 结果:
    - 飞书 webhook / Feishu WS 与 Web / Scheduler 口径对齐。
    - `agentRoleKey` 继续是唯一身份真理；`modelId` 继续只是 runtime 元信息。
  - 验证:
    - `tsc -p tsconfig.json --noEmit` 已通过。
  - 状态: 已完成

- 当前主线真相复盘：
  - `记忆管理` 页面本身已按 `agentRoleKey` 读写；默认“所有身份”只是展示聚合，不是存储桶。
  - 真实缺口在入口层绑定，而不是记忆面板筛选。
  - `Room` 不在本期主线内，不用拿它解释主链记忆现象。

- 仍未处理的活口：
  - `HttpSessionExecutor` 默认仍是 single-shot；只有命中特定条件才进受控工具回环。
  - 这会直接表现为“agent 一轮只产出一条 assistant 回复”，对 MCP / skills / 小眼睛 多步任务仍有压制。
  - 该问题已确认，但本次未扩大修改面去动执行策略。

### 2026-03-25 16:58

- `P0-执行器兼容` 已补第二刀：
  - 文件:
    - `server/libs/httpSessionExecutor.ts`
  - 动作:
    - 去掉 native direct turn 的前置拦截，不再因为命中 IMA / 小眼睛关键词就直接代答。
    - 放宽 bounded tool loop 触发条件：外部渠道、已选 skills、存在 runtime MCP 时，统一允许 10 步 / 90 秒的受控工具回环。
    - 失败分支补 `finishAssistantMessage(...)` + `finalizer.finalize(...)`，让失败轮也能进入 shared-thread 收尾。
  - 结果:
    - agent 不再被 native 直拦截“捂嘴”，工具优先交回模型自主决定。
    - Feishu / skills / MCP 多步任务不再只剩 single-shot 一条回复。
    - 失败轮的 user / assistant 正文不会再因为报错而整轮丢失连续性。
  - 验证:
    - `tsc -p tsconfig.json --noEmit` 已通过
  - 状态: 已完成

### 2026-03-25 17:12

- `P0-飞书入口默认污染` 已切除：
  - 文件:
    - `server/src/index.ts`
    - `server/routes/feishuWebhook.ts`
  - 动作:
    - `.env` bootstrap app 若缺 `FEISHU_AGENT_ROLE_KEY`，不再静默回落 `organizer`，改为记录 warning 并跳过启动。
    - 数据库 `feishu.apps[]` 若缺 `agentRoleKey`，不再静默回落 `organizer`，改为记录 warning 并跳过启动。
    - 手动 `POST /api/im/feishu/gateway/start` 若缺 `agentRoleKey`，直接失败，不再偷偷按 `organizer` 启动。
  - 结果:
    - 飞书入口不再把“缺配置”伪装成“organizer 身份”。
    - 后续若看到飞书未启动，优先检查 app 绑定是否缺失，而不是误判成记忆链串桶。
  - 验证:
    - `tsc -p tsconfig.json --noEmit` 已通过
  - 状态: 已完成

### 2026-03-25 17:28

- `主线阶段总结`：
  - `身份边界`：
    - Web / Feishu / Scheduler 主线已收口到 `agentRoleKey` 是唯一身份真理。
    - `modelId` 继续只作运行时元信息，不再参与 session / thread / memory 归桶。
    - 飞书入口缺绑定时不再静默回落 `organizer`。
  - `飞书一期范围`：
    - 当前一期只覆盖 `organizer / writer / designer / analyst` 四个角色。
    - 这四个角色的后端主线已按当前边界修通。
    - “自定义 agent 直绑飞书 app” 明确留到下期，不纳入本次验收。
  - `执行器兼容`：
    - 已去掉 native direct turn 抢答。
    - 已让失败轮也进入 finalizer，避免 shared-thread 整轮断掉。
    - 但执行器兼容层还未完全收尾，下面 review 风险仍需处理。

- `review 结论`：
  - `server/libs/httpSessionExecutor.ts`
    - 当前把 bounded tool loop 放宽得过多：
      - `external` 渠道默认进入工具回环
      - 只要存在 `skills` 也默认进入工具回环
      - 只要 runtime MCP 数量大于 0 也默认进入工具回环
    - 风险：
      - 正常外部对话可能不再走原先的轻流式 single-shot 路径
      - 首字变慢、静默变长、普通聊天被过度工具化
      - `memory_user_edits` 暴露面过宽，副作用风险偏高
    - 当前状态：
      - `已止血，但需要再收敛一刀`
  - `server/routes/feishuWebhook.ts`
    - 手动 `gateway/start` 现在会在重启前校验 `agentRoleKey`，方向正确
    - 但若传入坏 payload，仍可能先停旧 gateway 再起新失败
    - 当前状态：
      - `已知风险，后续可补成“先校验、后切换”`

- `当前剩余主线事项`：
  - 收敛 `HttpSessionExecutor` 的 tool loop 触发条件，避免所有外部对话都过度工具化
  - 实跑验证飞书四角色是否稳定进入：
    - `cowork_sessions`
    - `identity_thread_24h`
    - `user_memories`
  - 单独修复 `小眼睛` 链路

- `一句话状态`：
  - `身份污染主线`：大体修住
  - `飞书四角色一期`：后端主线可用
  - `执行器多步兼容`：方向对，但还需要收敛

### 2026-03-25 18:05

- `P0-执行器收敛` 已补第三刀：
  - 文件:
    - `server/libs/httpSessionExecutor.ts`
  - 动作:
    - bounded tool loop 不再因为 `external` 或“任意已选 skills / 任意 runtime MCP”就无脑触发
    - 改为：
      - `IMA / 记忆 / 小眼睛` 等明确工具意图优先进入回环
      - 只有当 prompt 同时表现出“动作意图 + 具体目标”时，才允许已选 skills / runtime MCP 进入回环
    - `memory_user_edits` 仅在明确记忆意图时才暴露给模型，不再对普通工具回环默认开放
  - 结果:
    - 普通对话重新优先走轻 single-shot / streaming 主链
    - 多步工具能力仍保留给真正需要工具的任务
    - memory 写工具的副作用暴露面明显缩小
  - 验证:
    - `tsc -p tsconfig.json --noEmit` 已通过
  - 状态: 已完成

- `1.0 收尾口径`：
  - 一期范围:
    - `Web / Feishu / Scheduler / 记忆链`
  - 已明确延期:
    - `小眼睛` 单独补测
    - `自定义 agent 直绑飞书`
    - `Room` / 二期实验室线
  - 当前结论:
    - `主线完工，可进入试运行`

- `MCP` 页面复核结论：

### 2026-03-25 定时任务 / 记忆链探查

- 结论先钉死：
  - `每日记忆抽取` 这条链当前**不直接依赖** `CoworkRunner.startSession(...)`。
  - `普通定时任务执行` 与 `停止语义` 当前**仍依赖** `CoworkRunner`。
  - `任务运行历史 / 状态广播 / 任务 CRUD` 主要在 `Scheduler + ScheduledTaskStore`，**不在** `CoworkRunner` 本体里。

- 已核实证据：
  - 文件: `server/src/index.ts`
  - 现状:
    - `getScheduler()` 给 `Scheduler` 同时注入了 `getCoworkRunner` 和 `runTaskDirectly`
    - 只有任务名等于 `每日记忆抽取与文件归档` 时，才走 `runDailyMemoryExtractionNow()`
    - 其余任务仍回落到 `Scheduler.startCoworkSession()`
  - 状态: 已核实

### 2026-03-25 记忆身份边界复核

- 真相先钉死：
  - `user_memories` / `identity_thread_24h` / `cowork_sessions` 当前隔离真理都应是 `agent_role_key`。
  - `HttpSessionExecutor` 里仍保留 `normalizeAgentRoleKey(...)`，但它目前应该只用于 4 主角色 runtime 配置解析，不能反写回 session / memory / shared-thread 身份。
  - `Room` 是本地轻聊天房，不接正式 `cowork -> shared-thread -> durable-memory` 主链，不能误认成“小 agent 已接入正式记忆链”。

- 已确认问题：
  - 设置页记忆管理原先只按 `AGENT_ROLE_ORDER` 显示 4 主角色，现已改为根据真实记忆条目动态显示身份选项。
  - 定时任务轻链入口 `server/src/index.ts` 原先先把 `task.agentRoleKey` 归一化为 4 主角色再建 session，存在把后续会话 / shared-thread / memory 归桶写歪的风险。

- 已落地修复：
  - 文件: `server/src/index.ts`
  - 动作: 定时任务保留原始 `agentRoleKey` 作为 session 身份；4 主角色归一化仅用于运行时模型 / 技能配置解析。
  - 标签:
    - `{标记} P0-IDENTITY-BOUNDARY`
  - 状态: 已完成
  - 文件: `clean-room/spine/modules/channelSessionBinding.ts`
  - 动作: 渠道 scoped session 复用不再把 `modelId` 作为查询条件，只按 `agentRoleKey + scopeKey` 复用。
  - 标签:
    - `{标记} P0-IDENTITY-BOUNDARY`
  - 状态: 已完成
  - 文件: `server/libs/httpSessionExecutor.ts`
  - 动作: 明确把 4 主角色归一化函数改名为 runtime 语义，只用于模型 / 技能 / 原生能力配置解析，避免误读成身份归一化。
  - 标签:
    - `{标记} P0-IDENTITY-BOUNDARY`
  - 状态: 已完成
  - 文件: `server/libs/httpSessionExecutor.ts`
  - 动作: `conversation_search / recent_chats / memory list` 等只按身份归桶的工具口已移除多余 `modelId` 透传，避免工具层继续暗示“按模型切身份”。
  - 标签:
    - `{标记} P0-IDENTITY-BOUNDARY`
  - 状态: 已完成
  - 文件: `clean-room/spine/modules/feishuSessionSpine.ts`
  - 动作: 补充边界注释，钉死“session 复用判断不能按 modelId 切桶”。
  - 标签:
    - `{标记} P0-IDENTITY-BOUNDARY`
  - 状态: 已完成

- 待评估-可能波及：
  - `server/libs/httpSessionExecutor.ts`
  - `clean-room/spine/modules/feishuRuntime.ts`
  - `clean-room/spine/modules/feishuSessionSpine.ts`
  - `clean-room/spine/modules/channelSessionBinding.ts`
  - `src/shared/agentRoleConfig.ts`
  - `src/main/scheduledTaskStore.ts`

- review 补充结论：
  - `clean-room/spine/modules/channelSessionBinding.ts` 的 `findLatestScopedSession(..., { agentRoleKey, modelId, scopeKeys })` 旧签名已拔除；现在 scoped session 复用只认 `agentRoleKey + scopeKey`。
  - `clean-room/spine/modules/feishuSessionSpine.ts` 当前会把 `binding.modelId` 同步回 session 元信息；这不等于按模型切桶，但边界语义仍需警惕，后续不能继续扩成“模型变化 = 身份变化”。
  - `server/libs/httpSessionExecutor.ts` 当前仍用 `normalizeAgentRoleKey(...)` 解析 4 主角色 runtime 配置；这是运行时层，不得反写污染 session / memory / shared-thread 身份层。

- `*纯净包文件` 建议清单（先记账，不急着扩大改面）：
  - `clean-room/spine/modules/sessionIngress.ts`
  - `clean-room/spine/modules/sessionOrchestrator.ts`
  - `clean-room/spine/modules/identityThread.ts`
  - `clean-room/spine/modules/feishuInboundSpine.ts`
  - `clean-room/spine/modules/requestTrace.ts`

- 每日记忆链真实口径：
  - 文件: `server/libs/dailyMemoryPipeline.ts`
  - 文件: `server/routes/dailyMemory.ts`
  - 现状:
    - 每日记忆手动接口和 cron 特判都直接调用 `runAndMarkDailyMemoryPipeline(...)`
    - 这条链内部做 `runDailyConversationBackupIfConfigured(...) + extractDailyMemory(...)`
    - 不经过 `CoworkRunner.startSession(...)`
  - 是否波及主链: 是
  - 是否波及记忆: 是
  - 状态: 已核实

- Scheduler 仍挂旧链的位置：
  - 文件: `src/main/libs/scheduler.ts`
  - 现状:
    - 普通任务执行仍 `await runner.startSession(...)`
    - 任务停止仍 `getCoworkRunner().stopSession(sessionId)`
    - 但 run history / task state / prune / websocket broadcast 仍由 `Scheduler + ScheduledTaskStore` 自己维护
  - 是否波及主链: 是
  - 是否波及记忆: 间接
  - 是否波及任务: 是
  - 状态: 已核实

- 可安全迁桥的证据：
  - 文件: `server/libs/httpSessionExecutor.ts`
  - 文件: `server/libs/sessionTurnFinalizer.ts`
  - 现状:
    - `HttpSessionExecutor` 已内置 `SessionTurnFinalizer`
    - 完成后会做 `runDailyConversationBackupIfConfigured()` 和共享线程写入
    - 说明 scheduler 若改接轻执行器，记忆/归档能力并不是空白，需要的是“过桥”，不是“重造”
  - 状态: 已核实

- 新发现风险：
  - `R19`
  - 问题: 定时任务未显式选技能时，scheduler 仍会注入 `buildAutoRoutingPrompt()`，属于隐藏 token 消耗入口
  - 来源: 活代码已确认
  - 严重度: P1
  - 难度: S-M
  - 波及面: 普通定时任务、低配机、长 prompt
  - 文件:
    - `server/src/index.ts`
    - `src/main/libs/scheduler.ts`
  - 状态: 已核实

- 新发现风险：
  - `R20`
  - 问题: `requestContextMiddleware` 当前对所有 `/api` 请求都注入 `coworkRunner: getCoworkRunner()`，即使路由只查 tasks / memory / store
  - 来源: 活代码已确认
  - 严重度: P1
  - 难度: M
  - 波及面: 轻接口冷启动、旧单例常驻、后续拆链边界
  - 文件:
    - `server/src/index.ts`
  - 状态: 已核实

- 当前判断：
  - 如果现在直接“整段拔掉 scheduler 里的 CoworkRunner”，会伤的是：
    - 普通定时任务执行
    - 任务停止
  - 不会先伤到的核心：
    - 每日记忆抽取直跑链
    - 任务 run history 存储
    - task status/run websocket 广播
  - 推荐下一步:
    - 先把 scheduler 普通任务执行桥接到 `HttpSessionExecutor`
    - 同步改 stop 走 `HttpSessionExecutor.stopSession`
    - 再收 `R19` 的默认 auto-routing prompt 注入

- 新增架构原则记录：
  - 后台即使存在 `analyst/designer/organizer` 的定时任务，也不得污染当前 `writer` 聊天上下文，反之亦然。
  - 定时任务属于后台调度域，不属于默认聊天上下文域。
  - `scheduler` 可共享，但任务内容、角色上下文、记忆视图、skills/MCP 视图必须按 `agentRoleKey` 隔离。
  - 后续若做“无任务不加载 / 到点唤醒”，要围绕“共享底座、不共享脑子”落地。

### 2026-03-25 定时任务轻链第一刀

- `R2` 已落地第一刀：
  - 文件: `server/src/index.ts`
  - 文件: `src/main/libs/scheduler.ts`
  - 动作:
    - scheduler 普通任务执行主路改为 `runScheduledTaskThroughWebExecutor(...) -> HttpSessionExecutor.startSession(...)`
    - scheduler 停止优先走 `HttpSessionExecutor.stopSession(...)`
    - 每日记忆抽取继续保留直链特判
  - 结果:
    - 普通定时任务不再默认走 `CoworkRunner.startSession(...)`
    - 旧 `CoworkRunner.stopSession(...)` 仅保留为遗留兼容兜底，不再是主路径
  - 标签:
    - `{标记} P0-SCHEDULER-WEB-EXEC`
    - `{标记} P0-SCHEDULER-STOP-LIGHT-FIRST`
  - 状态: 已完成

- `R19` 已落地：
  - 文件: `server/src/index.ts`
  - 动作: scheduler 对“未显式选择 skillIds”的任务不再默认注入 `buildAutoRoutingPrompt()`
  - 结果: 定时任务默认 prompt 变瘦，避免无关全局技能提示污染
  - 标签:
    - `{标记} P0-SCHEDULER-SKILL-SLIM`
  - 状态: 已完成

- 新增边界：
  - 文件: `server/src/index.ts`
  - 动作: scheduler 若命中未桥接 runtime config/secret 的技能，不再回退旧链，而是显式报错
  - 结果: 保持“共享底座、不共享脑子、旧链不复燃”的口径
  - 状态: 已完成

- `R2` 已落地第二刀：
  - 文件: `src/main/libs/scheduler.ts`
  - 文件: `server/src/index.ts`
  - 动作:
    - scheduler 启动前先检查是否存在“启用且未过期”的任务
    - 无任务时不挂常驻 timer，进入 idle sleep
    - 新任务创建 / 更新 / 启用 / 自动注册 daily memory cron 后再 `reschedule()` 唤醒
  - 结果:
    - 没任务时不再每 60 秒空转轮询
    - 有任务时仍保持单 timer 调度
  - 标签:
    - `{标记} P1-SCHEDULER-IDLE-SLEEP`
  - 状态: 已完成

- `R2` 已落地第三刀：
  - 文件: `src/main/libs/scheduler.ts`
  - 文件: `server/src/index.ts`
  - 动作:
    - `SchedulerDeps.getCoworkRunner` 改为可选
    - 当前 Web 服务器实例不再向 scheduler 注入 `getCoworkRunner`
    - 仅保留 scheduler 内部对 legacy runner fallback 的可选兼容位
  - 结果:
    - 一期主线里的定时任务从依赖签名层面脱离 `CoworkRunner`
    - 即使保留 legacy fallback 代码，也不再在当前 Web runtime 主路可达
  - 状态: 已完成

- `R21` 已落地第一刀：
  - 文件: `server/src/index.ts`
  - 动作:
    - 失联运行态清理改为只覆盖一期主线会话（`desktop + feishu`）
    - 去掉对 `runner.isSessionActive(...)` 的依赖
  - 结果:
    - stale session sweep 不再为了扫 Web/Feishu 失联会话去触碰 `CoworkRunner`
    - 冻结中的 DingTalk 旧链不会被一期清理逻辑误扫
  - 标签:
    - `{标记} P1-STALE-SWEEP-PHASE1`
  - 状态: 已完成

---

## 10. 一期收敛面板

### 10.1 一期主线

- `Web`
- `Feishu`
- `定时任务`
- `记忆链`

### 10.2 一期冻结

- `DingTalk`
  - 状态: `待评估-冻结一期`
  - 原则: 不继续迁桥，不继续补体验，不与主线抢施工资源

### 10.3 已完成收敛

- Web 主链已统一走 `HttpSessionExecutor`
- Web `stop / permission` 已不再回退旧 `CoworkRunner`
- 长对话导出已改为“最近 N 轮优先 + 按需懒加载”
- 输入区 skills 目录已改成懒加载
- 任务表单中的 skills / IM notify 已改成懒加载
- 定时任务普通执行主路已桥接到轻执行器
- 定时任务默认不再注入 `auto-routing prompt`
- scheduler 已支持 `idle sleep`，无任务不空转
- `/api` request context 已改成惰性 getter，轻接口不再默认预热重对象
- Feishu 主链已去掉 `coworkRunner` 假依赖
- stale session sweep 已收窄到一期主线会话，不再依赖 `runner.isSessionActive(...)`

### 10.4 剩余遗留壳

- `server/src/index.ts`
  - `getCoworkRunner()` 单例本体仍存在
  - 当前性质: 遗留兼容壳，不再是一期主路执行器

- `server/libs/sessionExecutorAdapter.ts`
  - 仍保留“新编排层回退旧 CoworkRunner”的适配缝
  - 当前性质: 冻结兼容缝
  - 当前状态: 未接入一期 Web / Feishu / 定时任务 / 每日记忆主路

- `src/main/libs/scheduler.ts`
  - 仍保留 legacy fallback 代码分支
  - 当前性质: 兼容壳
  - 当前 Web runtime: 已不注入 `getCoworkRunner`

- `src/renderer/services/electronShim.ts`
  - 当前仍是 Web 前端主调用外形
  - 当前性质: 兼容壳
  - 处理策略: 一期不猛拆，只继续压轻和避免误用

### 10.5 收敛原则

- 不再为了“看起来更干净”去硬删遗留壳
- 先保证一期主线已经不依赖这些遗留壳跑业务
- 遗留壳继续保留，但必须：
  - 不默认预热
  - 不回流进主线
  - 有明确冻结/兼容标签

### 10.6 本轮问题与真相

- `真相`
  - Web 主链当前没有命中 `CoworkRunner` 的 live 证据；入口已经收口到 `HttpSessionExecutor -> SessionTurnFinalizer`
  - Feishu 主链当前没有命中 `CoworkRunner` 的 live 证据；HTTP webhook 与 WS gateway 都走 `runChannelFastTurn(...)`
  - 定时任务在当前 Web runtime 下不再进入 `CoworkRunner` 主路；即使误入 fallback 也会直接报 `legacy CoworkRunner fallback is disabled`
  - 每日记忆当前直走 `dailyMemoryPipeline`，不通过 `CoworkRunner` 会话执行
  - `DingTalk` 仍是旧重链，但已明确冻结一期，不纳入当前迁桥主线

- `问题`
  - `AGENTS.md` 之前把共享线程、每日记忆、channelHint 写成旧口径，已确认与 live code 存在偏差
  - `HttpSessionExecutor` 当前只支持 `openai-compatible`；若角色配置为 `anthropic`，Web / Feishu 入口可达但执行会失败
  - daily memory 仍靠任务名识别系统任务，且实际取“第一个可用 role + apiFormat=openai”
  - scheduler 普通任务会话仍写 `sourceType: 'desktop'`，调度域与普通 Web 会话的边界仍不够显式
  - `store` 路由是分粒度轻重：`GET /api/store/:key` 偏轻，但 `PUT/POST app_config|im_config` 会触发 runtime 同步，不应笼统视为轻接口

- `后续处理原则`
  - 先继续记真相，不给旧链找合法性
  - 先改命名、标识、文档和可观测性，再决定是否继续切壳
  - 任何继续动 `CoworkRunner` 外壳的工作，必须以“一期主线已稳定不依赖它”为前提

### 10.7 下一步建议

- 先做一次一期主线回归验收：
  - Web 新建/续聊/停止
  - Feishu 收消息/回消息
  - 定时任务创建/触发/停止/历史
  - 每日记忆抽取

- 回归通过后，再决定是否继续处理：
  - `CoworkRunner` 单例外壳进一步收缩
  - `electronShim` 渐进替换

### 10.8 一期回归结果

- `已实测通过`
  - `Web /cowork` 主链 smoke
    - 命令: `node scripts/smoke-cowork-session.mjs http://127.0.0.1:3001`
    - 结果:
      - session 创建成功
      - 状态 `completed`
      - `assistant` 回复存在
      - 角色 `organizer`
  - `clean-room` 核心 spine smoke
    - 命令: `npm --prefix clean-room run smoke`
    - 结果: `clean-room smoke ok`
  - `定时任务` 只读回归
    - 接口: `GET /api/tasks`
    - 结果:
      - `每日记忆抽取与文件归档` 存在
      - `enabled=true`
      - `lastStatus=success`
      - `nextRunAtMs` 存在
    - 接口: `GET /api/tasks/:id/runs/count`
    - 结果: run history count 正常返回
  - `服务启动日志`
    - 结果:
      - `Scheduler Started`
      - `DailyMemory Cron task already registered`
      - `DailyMemory Startup catch-up not needed`
      - `Feishu WS Gateway started`

- `已验证但未做破坏式触发`
  - `每日记忆抽取` 手动接口未主动触发

### 10.9 启动期新增观察

- `本轮决定`
  - `Feishu` 先放行，不继续压缩启动链
  - 当前先记录问题与疑似波及面，不抢先改飞书

- `新问题 #1`
  - 现象: 启动后部分 iframe 页面突然无法显示内容，浏览器控制台错误较多
  - 当前真相:
    - 项目内确有多处外部 iframe 入口
    - 这些入口本质上是跨域嵌入壳，不保证目标站一定允许被 iframe
    - 当前仓库未发现我们自己显式设置 `Content-Security-Policy` / `frame-ancestors` / `X-Frame-Options`
    - 当前 iframe 壳层未加 `sandbox`，不是我们自己把 iframe 权限锁死
    - 当前更像“外部页面可嵌入性 / 目标站 CSP / X-Frame-Options / 登录态 / 浏览器限制”问题，不应先误判为主聊天链问题
    - 我们自己这边最值得注意的只有两项:
      - `referrerPolicy="no-referrer"` 可能提高部分站点嵌入失败概率
      - `EmbeddedIframeView` 的 `8s` 超时遮罩会把“加载慢 / 被站点拒绝”统一体感成“程序突然坏了”
  - 疑似波及文件:
    - `src/renderer/components/EmbeddedIframeView.tsx`
    - `src/renderer/components/EmbeddedBrowserModal.tsx`
    - `src/renderer/config/iframePages.ts`
    - `src/renderer/components/Settings.tsx`
    - `src/renderer/App.tsx`
    - `server/src/index.ts`
  - 标签:
    - `待评估-可能波及: iframe 外链展示层`
  - `本轮收敛`
    - `EmbeddedIframeView` 先前改成了“超时自动外开”，后确认该策略过于敏感，会误杀慢站
    - 当前已收回为: 超时只给轻提示，不自动打断 iframe；是否外开由用户决定
    - `Settings` 里的 `ResourcesView` 已收敛复用 `EmbeddedIframeView`，不再保留另一套旧 iframe 行为
  - `已处理文件`
    - `src/renderer/components/EmbeddedIframeView.tsx`
    - `src/renderer/components/Settings.tsx`

- `新问题 #2`
  - 现象: 点击“设置”后体感像发生了页面跳转
  - 当前真相:
    - 代码链上 `handleShowSettings()` 只设置 `showSettings/settingsOptions`，没有切 `mainView`
    - 当前更像“懒加载弹层挂载 + 默认 tab 内容 + 首屏负载”造成的体感问题，而不是实际路由切换
    - `Settings` 默认 tab 当前会归一到 `clawApi`
  - 疑似波及文件:
    - `src/renderer/App.tsx`
    - `src/renderer/components/Settings.tsx`
  - 标签:
    - `待评估-可能波及: 设置弹层挂载体验`

- `已补源码断点`
  - `src/renderer/App.tsx`
    - `SETTINGS-OPEN-MODAL-PATH`
    - `SETTINGS-OVERLAY-MOUNT`
  - `src/renderer/components/Settings.tsx`
    - `SETTINGS-DEFAULT-TAB`
  - `src/renderer/components/EmbeddedIframeView.tsx`
    - `IFRAME-EMBED-VIEW`
  - `src/renderer/config/iframePages.ts`
    - `IFRAME-PAGE-CONFIG`

### 10.10 新增 P0 真相

- `问题`
  - 当前 agent 在 Web 轻链里出现“单个 turn 只回复一条 assistant”的退化表现
  - 小眼睛测试时若没有命中 native direct turn，也无法像旧 agent loop 一样继续多步骤执行

- `真相`
  - 这不是产品规则，也不是我们要的限制
  - 当前 `HttpSessionExecutor` 主路本质上是一次性 `openai-compatible chat completion`
  - 它会流式拼出一个 assistant 消息，但不会在同一 turn 内继续做 `assistant -> tool -> assistant` 多轮代理循环
  - 当前 direct executor 还明确提示：`MCP` 不会自动执行工具调用
  - `小眼睛 / IMA` 只有在命中 native direct turn 时，才会直接短路返回结果；否则只是 system prompt / preload 帮助信息，不会自动进入完整工具回路

- `已打断点`
  - `server/libs/httpSessionExecutor.ts`
    - `DIRECT-EXECUTOR-SINGLE-SHOT`

- `结论`
  - “一次只回复一条”目前更像是执行器能力退化，不是 UI 限制
  - “测试小眼睛卡死”与这条高度相关：现轻执行器没有完整 agent tool loop，导致复杂多步骤任务无法按旧预期闭环

### 10.11 P0 修复落地

- `文件`
  - `server/libs/httpSessionExecutor.ts`

- `动作`
  - 新增 `DIRECT-EXECUTOR-BOUNDED-LOOP`
  - 维持现有轻 single-shot 为默认主路
  - 仅在明确命中浏览器观察 / IMA / 历史检索 / 记忆编辑等请求时，进入受控 bounded loop
  - 边界固定：
    - 最大步数 `10`
    - 最大总等待 `90s`

- `当前真相`
  - Web / Feishu 轻执行器不再被“一次只回一条”彻底锁死
  - 同一 turn 内已可执行：
    - `conversation_search`
    - `recent_chats`
    - `memory_user_edits`
    - native capabilities（当前含 `小眼睛 / IMA`）
  - 外部 `runtimeMcpTools` 目前仍未在轻执行器内真实桥接执行
    - 现阶段只恢复了“受控多步回环底座”
    - 外部 MCP 真实执行仍保留为后续收敛项，避免为了抢修再次把旧重链整包拉回

- `标签`
  - `{标记} P0-BOUND-LOOP-COMPAT`
  - `{路标} DIRECT-EXECUTOR-BOUNDED-LOOP`

### 10.12 前端渲染 warning 真相

- `现象`
  - 控制台出现：
    - `Warning: Internal React error: Expected static flag was missing`
  - 栈指向：
    - `src/renderer/components/MarkdownContent.tsx`
    - `src/renderer/components/cowork/CoworkSessionDetail.tsx`

- `根因`
  - `MarkdownContentInner` 在 `deferMarkdown=true` 时先于 Hooks 直接返回纯文本分支
  - 流式结束后同一组件又重新进入 `useState/useEffect/useMemo`
  - 同一组件前后渲染的 Hook 结构不一致，触发 React 内部 warning

- `修复`
  - 文件：
    - `src/renderer/components/MarkdownContent.tsx`
  - 动作：
    - 将“流式纯文本态”与“完整 Markdown 解析态”拆成独立组件
    - 保证带 Hooks 的完整 Markdown 组件只在自身挂载后稳定执行

- `标签`
  - `{标记} P0-HOOK-ORDER-FIX`

### 10.13 IMA 入口误杀

- `现象`
  - 用户输入泛化 IMA 提法时，例如：
    - `ima测试调试`
    - 不完整的 `搜索 ima`
  - 会被 native IMA direct parser 过早截胡，直接回复“还不够明确”

- `根因`
  - `src/shared/nativeCapabilities/imaAddon.ts`
  - 旧逻辑对含糊 IMA 请求也强行返回 `needs_input`
  - 结果不是“放回正常 agent/tool loop”，而是把上层能力链提前掐断

- `修复`
  - 对不够明确的泛化 IMA 请求改为 `return null`
  - 只在明确的 `搜索 / 读取 / 保存` 场景下才由 native direct turn 接管

- `结论`
  - 这次修的是“入口别太死”
  - 不是新增功能，而是避免 native parser 把 IMA 能力误伤成“像死了一样”

- `标签`
  - `{标记} P0-IMA-OVERMATCH-FIX`

### 10.14 渠道捂嘴口已拔

- `现象`
  - 渠道路径里存在额外“压短回复”的附加提示
  - 飞书 webhook / WS 在真正执行前会先发一条文本 `ack`

- `真相`
  - 这些都不是必要能力
  - 摘要、连续性和会话上下文已经足够给 agent 当前状态
  - 额外再塞 `channel fast / concise` 只会重复塑形
  - 文本 `ack` 会形成“还没做事先抢一句”的假首回复

- `修复`
  - 文件：
    - `server/libs/httpSessionExecutor.ts`
    - `src/main/libs/coworkRunner.ts`
    - `server/routes/feishuWebhook.ts`
    - `server/libs/feishuGateway.ts`
  - 动作：
    - 移除当前轻执行器的 channel 压短提示
    - 清空遗留快路的 `Channel Fast Lane` 附加提示
    - 移除飞书 webhook / WS 的文本 `ack`

- `标签`
  - `{标记} P0-CHANNEL-MUZZLE-REMOVE`
    - 原因: 会真实写入/整理当前记忆数据，回归阶段避免污染用户现网数据
    - 替代证据:
      - cron 任务存在
      - `lastStatus=success`
      - startup catch-up 日志正常
  - `Feishu` 未做真实入站消息注入
    - 原因: 回归阶段未向真实飞书会话发送测试消息，避免打扰现网
    - 替代证据:
      - gateway 成功启动
      - webhook / gateway 主链依赖已收口到轻执行器

- `本轮结论`
  - 一期主线当前可视为“回归通过，且保持保守”
  - 已通过的是真实主链 smoke + 启动链 + 只读任务链
  - 未主动触发的都是可能污染现网数据/渠道的动作，属于有意保守

- `R20` 已落地第一刀：
  - 文件: `server/src/index.ts`
  - 动作: `requestContextMiddleware` 中的 `coworkRunner` 改为惰性 getter，不再对所有 `/api` 请求立即执行 `getCoworkRunner()`
  - 结果:
    - `tasks / memory / store / backup` 等轻接口不再默认预热旧 `CoworkRunner` 单例
    - 仍兼容遗留入口通过 `req.context.coworkRunner` 按需取用
  - 标签:
    - `{标记} P1-RUNNER-LAZY-CONTEXT`
  - 状态: 已完成

- Feishu 主链去假依赖：
  - 文件: `server/libs/feishuGateway.ts`
  - 文件: `server/routes/feishuWebhook.ts`
  - 文件: `server/src/index.ts`
  - 动作: 移除 Feishu gateway / webhook 对 `coworkRunner` 的历史挂件依赖，保留 `coworkStore + store + skillManager + HttpSessionExecutor`
  - 结果:
    - 飞书一期主链更清楚地收口到轻执行器
    - 避免后续误判飞书仍依赖 `CoworkRunner`
  - 状态: 已完成

- 轻接口上下文继续瘦身：
  - 文件: `server/src/index.ts`
  - 动作: `coworkStore / skillManager / mcpStore / scheduledTaskStore / scheduler` 都改成惰性 getter
  - 结果:
    - `/api` 轻接口不再默认拉起 skill watcher、MCP store、scheduler 实例
    - request context 只在路由真正访问这些对象时才初始化
  - 标签:
    - `{标记} P1-CONTEXT-LAZY-SERVICES`
  - 状态: 已完成

- 一期冻结项：
  - 文件: `server/routes/dingtalkWebhook.ts`
  - 状态: `待评估-冻结一期`
  - 说明:
    - 钉钉仍是旧链，不否认债务存在
    - 但本期不继续迁桥，不与 `Web / Feishu / 定时任务 / 记忆链` 主线抢施工资源
  - 文件: `src/renderer/components/mcp/McpManager.tsx`
  - 判断: 当前 `loadServers + getRoleRuntime(selectedRole)` 发生在专用 MCP 页面挂载后，不属于聊天首页污染
  - 说明: 这页首屏本来就要展示“当前支持/运行态”，因此这部分加载暂不下刀
  - 状态: 已核实

- `R3` 已落地第一刀：
  - 文件: `server/routes/cowork.ts`
  - 动作:
    - 移除 Web 主链按 skill runtime payload / secret payload 静默回退 `CoworkRunner` 的逻辑
    - 改为始终走 `HttpSessionExecutor`
    - 若命中尚未桥接的泛 skill runtime payload，则直接报错，不再偷偷回旧链
  - 结果: Web 主链不再继续给旧 runner 输血；`小眼睛 / IMA` 仍走现役 bridge
  - 标签:
    - Web 主链说明已改为“不再按 skill payload 静默回退旧 CoworkRunner”
  - 验证: `tsc -p tsconfig.json --noEmit` 已通过
  - 状态: 已完成

- `R4` 已落地第一刀：
  - 文件: `server/src/index.ts`
  - 动作:
    - 移除 `coworkRunner.on(message/messageUpdate/permissionRequest/complete/error)` 这组旧 WebSocket 流式桥接监听
    - 删除只为旧 WS 监听服务的 IPC 清洗辅助函数
  - 结果: renderer 侧 `cowork:*` 流式广播不再绑定 `CoworkRunner` 事件语义；现役主链统一由 `HttpSessionExecutor -> sessionEventSink` 发流
  - 验证: `tsc -p tsconfig.json --noEmit` 已通过
  - 状态: 已完成

- `R5/R7` 已落地第二刀（Web 控制权切断）：
  - 文件: `server/routes/cowork.ts`
  - 动作:
    - `stop` 路由移除 `CoworkRunner.stopSession(...)` 兜底，只认 `HttpSessionExecutor.stopSession(...)`
    - `permission` 响应路由不再把审批结果回灌旧 runner，改为显式返回已移除旧审批桥接
  - 结果: Web 主链的停止与审批控制权不再残留在旧 runner 身上
  - 标签:
    - `{标记} P0-WEB-STOP-DIRECT`
    - `{标记} P0-WEB-PERMISSION-CUT`
  - 验证: `tsc -p tsconfig.json --noEmit` 已通过
  - 状态: 已完成

### 2026-03-25 06:53

- `R5` 已落地第一刀：
  - 文件:
    - `src/renderer/store/slices/coworkSlice.ts`
    - `src/renderer/services/cowork.ts`
  - 动作:
    - 新增 `clearPendingPermissionsForSession`
    - `stop` 成功后立即按 `sessionId` 回收审批残留
    - 收到 `sessionsChanged.reason === 'stopped' | 'aborted'` 时同步收尾
    - `complete / error` 事件也按 session 清理 pending permission
  - 结果:
    - stop 后不再把审批弹窗残留在前端
    - 当前会话 streaming 状态能稳定落回可继续输入
  - 验证: `tsc -p tsconfig.json --noEmit` 已通过
  - 状态: 部分完成
  - 备注: “已流出的 assistant 半成品消息如何做更细粒度收尾”仍可继续精修

### 2026-03-25 07:00

- `R9` 已落地：
  - 文件: `src/renderer/components/cowork/CoworkSessionDetail.tsx`
  - 动作: assistant 消息命中 `metadata.cacheHit` 时，直接显示“缓存命中”标签，并带 `cacheSource`
  - 结果: 后端已有的 turn cache 命中信息终于在聊天 UI 可见
  - 验证: `tsc -p tsconfig.json --noEmit` 已通过
  - 状态: 已完成

### 2026-03-25 07:09

- `R10` 已落地：
  - 文件: `src/renderer/components/Settings.tsx`
  - 动作:
    - 直接读取 KV `conversationFileCache.lastBackupDate`
    - 在“对话文件”页显示最近一次归档日期目录、归档路径、`manifest.json`
    - 补“刷新 / 打开归档目录 / 定位 manifest”操作
  - 结果: 后端已存在的每日对话归档终于在设置页可见，不再是黑盒
  - 验证: `tsc -p tsconfig.json --noEmit` 已通过
  - 状态: 已完成

### 2026-03-25 07:24

- `R11` 已落地第一刀：native direct turn 收口
  - 文件:
    - `src/shared/nativeCapabilities/imaAddon.ts`
    - `src/shared/nativeCapabilities/browserEyesAddon.ts`
  - 动作:
    - IMA 只在“明确可执行”的场景下 direct-handle；缺正文、缺 `doc_id/title` 不再 native 代答判死
    - 小眼睛 direct-turn 在“当前页缺失 / 观察失败”时不再抢答收口，改为放回 agent 主链
  - 结果:
    - agent-human 对话不再被 native 外挂轻易截胡
    - IMA / 小眼睛更像辅助能力，而不是抢嘴的硬拦截器
  - 标签:
    - `{标记} P0-NATIVE-DIRECT-FALLTHROUGH`
  - 状态: 已完成

- `R12` 已落地第一刀：Feishu 回帖不再只取最后一条 assistant
  - 文件:
    - `server/routes/feishuWebhook.ts`
    - `server/libs/feishuGateway.ts`
  - 动作:
    - 提取本轮所有新增且非 thinking 的 assistant 文本
    - 合并后再回帖，不再只取最后一条
    - 忙碌提示改为状态式表达；移除未接上线的假状态残片
    - 渠道补独立状态消息：收到请求即发 `[状态] 正在回复`，正文/附件发完后补 `[状态] 已发送`
    - 若本轮出现新的 `tool_use`，渠道轮询新增工具调用并发 `[状态] 正在调用工具：xxx`
  - 结果:
    - 多段 assistant 输出不再被渠道层截成“只剩最后一句”
    - 更贴近 agent 原始表达，不再像被强行掐短
    - 忙碌时给用户的是“正在回复上一条”的真实状态，而不是生硬挡回
    - 用户现在能直接判断“有没有开始处理、结果有没有发出去”，不会再像卡死
    - 工具调用过程现在对用户可见，不再像黑盒卡住
  - 标签:
    - `{标记} P0-FEISHU-ASSISTANT-AGGREGATE`
  - 状态: 已完成

### 2026-03-25 11:22

- `当前状态快照`
  - Feishu 一期主链：
    - 状态: 可用
    - 现状:
      - 已有 `[状态] 正在回复`
      - 已有 `[状态] 正在调用工具：人话工具名`
      - 已有 `[状态] 已发送`
      - 不再只吐最后一条 assistant
  - IMA：
    - 状态: 当前视作可用
    - 现状:
      - 已从“含糊请求直接硬拦截”收回到“明确可执行才 direct-handle”
      - 不再因为模糊提法就把 agent 对话掐死
  - 小眼睛：
    - 状态: 待评估，但不像本体损坏
    - 现状:
      - 脚本本体存在
      - 角色绑定存在
      - 已修 `browser_eyes_current_page_v1` 被空态/关闭即删的问题
      - 当前更像“页面状态生命周期太短 + 动态页面天然弱”，不是“能力彻底坏了”
  - Web 主链：
    - 状态: 仍以 `HttpSessionExecutor` 为现役主链
    - 现状:
      - 旧 `CoworkRunner` 已被多处切断输血
      - 但代码库仍脏，不能误以为已完全清洁

- `本轮复盘`
  - 真正有效的动作不是继续堆工程，而是把“捂嘴、截断、假状态、错误归因”逐条拔掉。
  - 当前已确认的真相：
    - agent 被错误提示带偏过一次，把“external MCP 受限”错误套到了小眼睛/IMA 上
    - Feishu 之前确实存在“黑盒感”，用户不知道到底有没有开始处理、有没有发出去
    - 小眼睛之前最大的真问题不是 skill 消失，而是“当前页状态太容易消失”
  - 当前仍未完全解决的主阻塞：
    - `上游返回了空响应，未产出最终 assistant 内容`
    - 这条仍需要继续做高可观测性排查；不要凭感觉修

### 2026-03-25 12:05

- `小眼睛现役修复`
  - 文件:
    - `src/shared/nativeCapabilities/browserEyesAddon.ts`
    - `SKILLs/blingbling-little-eye/scripts/observe-page.mjs`
    - `.uclaw/web/SKILLs/blingbling-little-eye/scripts/observe-page.mjs`
  - 动作:
    - 当前页观察命中登录/鉴权跳转时，不再把重抓结果伪装成“你眼前的真实当前页”
    - 对 URL 重定向增加显式 warning
    - 对登录/鉴权页增加显式 warning：`This observer does not inherit your in-browser session`
    - `pageGoalGuess` 与 warning 统一成鉴权语义，不再自相矛盾
    - 抓取头从自定义 bot UA 调整为更接近浏览器的轻量 header，公开页抓取恢复正常
  - 验证:
    - `https://aiimagetoimage.io/` 仍能返回正常结构化观察
    - `https://my.feishu.cn/wiki/EYRHw0XuHiQRpzkBapscaL0wnpe` 会明确暴露“已跳到 Feishu 登录页，且未继承浏览器登录态”
  - 真相:
    - 当前 `use_current_page` 仍然是“按 URL 重抓”，不是 page-agent 式 live DOM 观察
    - 所以公开页可用，登录态页面/动态页面仍有天然边界
  - 标签:
    - `{标记} P0-BROWSER-EYES-AUTH-TRUTH`
    - `{路标} 待评估-可能波及：src/shared/browserObserverRuntime.ts`
  - 状态: 已完成第一刀

### 2026-03-25 12:35

- `记忆身份边界紧急止血`
  - 文件:
    - `server/libs/httpSessionExecutor.ts`
    - `src/renderer/components/Settings.tsx`
  - 动作:
    - `HttpSessionExecutor` 的 turn cache 不再把非四主角色强行压回 `organizer`
    - 设置页记忆筛选不再只写死四主角色，开始按实际 `agentRoleKey` 动态显示
  - 现场真相:
    - 当前 `user_memories` 里只看到 `analyst / organizer / writer`
    - 当前 `identity_thread_24h` 里只看到 `organizer / writer`
    - 所以“设置页没看到小 agent 记忆”不是单纯前端展示问题，而是现役库里本来就没有小 agent 的长期记忆/热缓存桶
  - 结论:
    - 这次先止住继续污染
    - 已经被压进 `organizer` 的历史条目无法自动还原出原小 agent 身份，后续如要补救只能基于更早原始来源再评估
  - 标签:
    - `{标记} P0-IDENTITY-MEMORY-BUCKET`
    - `{路标} 待评估-可能波及：subagent 会话创建链 / identity_thread 写入入口 / daily memory 来源映射`
  - 状态: 已完成第一刀

- `脏工作区处理口径`
  - `现役修复文件`：
    - `server/libs/httpSessionExecutor.ts`
    - `server/routes/feishuWebhook.ts`
    - `server/libs/feishuGateway.ts`
    - `src/shared/nativeCapabilities/imaAddon.ts`
    - `src/shared/nativeCapabilities/browserEyesAddon.ts`
    - `src/renderer/App.tsx`
  - `待评估-可能波及`：
    - `server/src/index.ts`
    - `src/main/libs/coworkRunner.ts`
    - `src/main/libs/scheduler.ts`
    - `server/routes/cowork.ts`
    - `server/routes/dingtalkWebhook.ts`
    - `server/routes/store.ts`
  - `明显噪音/可清理`：
    - `.codex-server.stdout.log`
    - `.codex-server.stderr.log`
  - 处理原则:
    - 只清明确噪音
    - 主链附近脏改动先挂牌，不做误杀式回滚

- `下次接手最先看什么`
  - 先看本文件末尾这段状态快照
  - 再看 `R11 / R12`
  - 再排 `上游返回空`
  - 不要重新争论 IMA / 小眼睛是不是“完全坏了”；先沿现役证据走

### 2026-03-25 11:46

- `记忆条目管理补链`
  - 现象:
    - 设置页里新增/查看记忆时，容易出现“怎么没更新进来”的错觉
    - 某些条目缺少身份信息，列表筛到非 `organizer` 时尤其容易误判
    - 统计数字和当前筛选口径不一致
  - 真相:
    - 列表刷新动作本身是有的；新增/编辑/删除后前端会重新拉接口
    - 真断点在于：
      - 前端新增记忆时没有把当前身份传给后端，默认落到 `organizer`
      - store 映射没有把 `agent_role_key / model_id` 带回前端
      - stats 接口原本不吃筛选参数，显示的是全局口径
  - 本轮修复:
    - `src/main/coworkStore.ts`
      - 记忆映射补回 `agentRoleKey / modelId`
      - `getUserMemoryStats()` 支持按身份过滤
      - 记忆列表/统计入口移除 `modelId` 过滤口，避免误把模型当身份
    - `server/routes/cowork.ts`
      - `/api/cowork/memory/entries` 与 `/api/cowork/memory/stats` 只接受身份筛选
    - `src/renderer/components/Settings.tsx`
      - 新增记忆时，把“当前筛选身份”或“当前设置页角色”写入后端
      - stats 改成跟筛选口径一致
      - 撤掉记忆管理里的模型筛选，回到“身份是唯一隔离真理，all 只是展示层”
      - 新增手动 `刷新` 按钮，避免设置页停留时误以为没更新
      - create/update/delete 为空结果时不再假装成功
  - 标签:
    - `{标记} P0-MEMORY-MGMT-IDENTITY-CHAIN`
  - 状态: 已完成

### 2026-03-25 12:12

- `全盘查杀：modelId 越界复核`
  - 目标:
    - 清查全仓里是否还有把 `modelId` 当身份边界的活口
  - 真 bug:
    - `clean-room/spine/modules/channelSessionBinding.ts`
      - `findLatestScopedSession()` 原本按 `agent_role_key + model_id + scopeKey` 复用渠道会话
      - 风险: 同一身份换模型后，渠道会话会被误切成不同人
      - 处理: 已改为只按 `agent_role_key + scopeKey` 复用
    - `server/routes/dingtalkWebhook.ts`
      - 旧调用面仍把 `modelId` 带进会话复用判断
      - 处理: 已同步移除
  - 已扶正的新库边界:
    - `server/sqliteStore.web.ts`
    - `src/main/sqliteStore.ts`
    - 新建 `identity_thread_24h` 表时，唯一边界已改为 `agent_role_key`
    - 并补了按角色查询更直接的索引，避免未来实现继续围着 `model_id` 打转
  - 兼容残留，但当前主逻辑未越界:
    - `user_memories` / `scheduled_tasks` / `cowork_messages` / `user_memory_sources` 里仍保留 `model_id` 字段
    - 这些字段当前主要是元信息、配置回显、来源记录，不是身份判定主键
    - 旧索引仍有一部分包含 `model_id`，现阶段不作为逻辑边界使用
  - 纯元信息:
    - `agentRoleConfig.ts` 中的 `modelId`
    - 定时任务、角色配置、渠道绑定返回体里透传的 `modelId`
    - 这些都只是“当前开的车”，不是“这个员工是谁”
  - 文档处理:
    - 已改正 `AGENTS.md` 顶部口径，明确写成边界告示
    - 已把明显误导的旧图纸移入 `docs/旧文件/2026-03-25-误读风险/`
  - 标签:
    - `{标记} P0-IDENTITY-BOUNDARY-KILL`
  - 状态: 已完成

### 2026-03-25 15:37

- `CoworkRunner / store / service 边界继续收口`
  - 文件:
    - `src/main/libs/coworkRunner.ts`
    - `src/main/coworkStore.ts`
    - `clean-room/spine/modules/contracts.ts`
    - `src/renderer/services/cowork.ts`
    - `src/renderer/services/electronShim.ts`
  - 动作:
    - `CoworkRunner` 新增 `SessionIdentityContext` 注释口径，明确 `modelId` 只是运行时元信息
    - `conversation_search / recent_chats` 的 runner/store 签名不再携带 `modelId` 兼容入参
    - `memory_user_edits.list` 不再向 store 透传 `modelId`
    - `buildUserMemoriesXml / buildIdentityMemoryXml / buildPromptPrefix` 这些旧签名里多余的 `modelId` 入口已拔掉
    - clean-room 契约补注释，防止后续把 `SessionRecord.modelId` 误读成身份键
    - 前端 `getMemoryStats()` 服务签名也撤掉了 `modelId`
  - 真相:
    - 这轮清的是“误导后人继续污染”的活口，不是大重构
    - 现役搜索/最近会话/记忆统计链继续只按 `agentRoleKey` 归桶
    - `modelId` 仍允许存在于 session / memory 记录里作为回显元信息，但不参与身份判断
  - 标签:
    - `{标记} P0-IDENTITY-SIGNATURE-CLEANUP`
    - `{路标} 待评估-可能波及：server/libs/feishuGateway.ts`
    - `{路标} 待评估-可能波及：subagent/room 本地链与真实 cowork memory 链之间的缺口`
  - 状态: 已完成

- `设置-记忆管理 现役真相复核`
  - 文件:
    - `src/renderer/components/Settings.tsx`
    - `server/routes/cowork.ts`
    - `src/main/coworkStore.ts`
  - 真相:
    - 设置页“记忆管理”当前读/统计都只按 `agentRoleKey`，不是按 `modelId`
    - 当筛选为 `all` 时，新增记忆会写到“当前设置页 activeRole”，而不是任意小 agent
    - 小 agent 只有在 `user_memories` 当前结果里已经出现过对应 `agentRoleKey` 时，筛选下拉才会把它显示出来
    - 所以“看不到小 agent 记忆”有两种高概率真相：
      - 写入链没传身份，最终默认落到了 `organizer`
      - 那批小 agent 记忆根本没落进 `user_memories` 主表，只存在于别的本地链/旧链
  - 结论:
    - 当前设置页不是新的污染源
    - 真正要盯的是“小 agent -> user_memories / identity_thread_24h` 的写入链是否真实接上”
  - 标签:
    - `{标记} P0-MEMORY-PANEL-TRUTH`
    - `{路标} 待评估-可能波及：subagent 会话链 / room 本地链 / 长期记忆落库入口`
  - 状态: 已确认真相

- `主线数据库现役桶核对`
  - 时间:
    - `2026-03-25 15:xx` 现场只读检查
  - 结果:
    - `user_memories`
      - `analyst = 8`
      - `organizer = 8`
      - `writer = 5`
    - `identity_thread_24h`
      - `organizer = 1`
      - `writer = 1`
  - 结论:
    - 当前正式主线库里没有任何“小 agent”长期记忆桶
    - 当前正式主线库里也没有任何“小 agent”24h 线程桶
    - 所以“设置页没显示小 agent 记忆”不是这个页自己过滤错了，而是主线库本来就没落进去
  - 边界提醒:
    - `Room` 是二期实验室壳，不纳入这次主线记忆真相判断
    - 现阶段主线只继续盯 `cowork / Feishu / scheduler / user_memories / identity_thread_24h`
  - 标签:
    - `{标记} P0-MAINLINE-DB-TRUTH`
  - 状态: 已确认真相

- `Web 主线入口身份止血`
  - 文件:
    - `server/routes/cowork.ts`
  - 动作:
    - 拆开 `resolveIdentityRoleKey(...)` 和 `resolveRuntimeWebRoleKey(...)`
    - Web 新建/续聊入口不再把真实 `agentRoleKey` 先强压成四主角色类型
    - session/request/trace 继续保留原始身份
    - 只有 runtime model 与 role skill config/secret 检查时，才映射到 `organizer / writer / designer / analyst`
  - 结论:
    - 主线入口层现在不再先把任意身份“抹平成 organizer”
    - `agentRoleKey` 作为 session / memory / thread 身份边界继续保留
    - `modelId` 与 runtime skill 文件解析仍走四主角色槽，但仅限运行时配置层
  - 验证:
    - `tsc -p tsconfig.json --noEmit` 通过
    - `tsc -p server/tsconfig.json` 当前仍卡在 `server/src/index.ts:445` 的旧类型问题，和本次改动无直接关系
  - 标签:
    - `{标记} P0-WEB-IDENTITY-ENTRY-FIX`
  - 状态: 已完成

- `1.0 纯净交付包落盘`
  - 时间:
    - `2026-03-25 16:59`
  - 目录:
    - `delivery-mainline-1.0-clean/`
  - 已纳入:
    - `src/`
    - `server/`（排除 `server/dist` 和运行态库）
    - `SKILLs/`（排除嵌套 `node_modules`）
    - `scripts/`
    - `patches/`
    - `public/`
    - `docs/REPAIR_CHECKLIST_2026-03-25_06-07.md`
  - 新增文档:
    - `delivery-mainline-1.0-clean/README.md`
    - `delivery-mainline-1.0-clean/docs/MAINLINE_1.0_BOUNDARY.md`
    - `delivery-mainline-1.0-clean/docs/RUNBOOK_1.0.md`
    - `delivery-mainline-1.0-clean/docs/PURE_PACKAGE_FILETREE.md`
  - 结论:
    - 主线可运行源码、环境样板、运行说明、边界说明已从脏工作区抽离成独立纯净目录
    - `Room / clean-room / 备份 / node_modules / .uclaw / dist` 不进入本次 1.0 交付包
  - 标签:
    - `{标记} P1-CLEAN-PACKAGE`
  - 状态: 已完成

- `飞书多条消息不再 busy 硬拦`
  - 时间:
    - `2026-03-25 17:xx`
  - 文件:
    - `server/libs/feishuGateway.ts`
  - 动作:
    - 去掉 `session active -> busy message -> return` 的硬拦截
    - 新增 `chatTurnQueues`，同一 `chatId` 改为顺序串行执行
    - 去重改为 `processingMessages` 占位，成功后才写入 `processedMessages`
    - 前置绑定/建会话失败时会释放占位并回错误，不再把消息吞进 dedup 黑洞
    - 保留原有 `正在回复 / 已发送 / 工具状态` 可见反馈
  - 结论:
    - 飞书通道不再把 agent 锁成“一次一句”的 RPA
    - 同一 chat 连续多条消息会继续进入同一条会话链顺序处理
  - 验证:
    - `tsc -p tsconfig.json --noEmit` 通过
    - 夏夏手动实测：`有了 / 可以了`
  - 标签:
    - `{标记} P0-FEISHU-QUEUE-COMPAT`
  - 状态: 已完成

- `PC 端外渠道会话可见性补强`
  - 时间:
    - `2026-03-25 17:xx`
  - 文件:
    - `src/renderer/components/cowork/CoworkView.tsx`
    - `src/renderer/store/slices/coworkSlice.ts`
  - 动作:
    - 首页“最近一个对话”不再只筛 `desktop`
    - “所有记录”入口改为 `all`
    - 当前会话写回列表摘要时补带 `sourceType`
  - 结论:
    - 外渠道新会话在 PC 首页和对话记录入口都更容易被看见
    - 会话来源信息不再在前端摘要同步时丢失
  - 验证:
    - `tsc -p tsconfig.json --noEmit` 通过
    - 夏夏手动实测：外渠道会话已可见
  - 标签:
    - `{标记} P1-CHANNEL-VISIBILITY-FIX`
  - 状态: 已完成

- `全局项目根目录真理源收口`
  - 时间:
    - `2026-03-25 18:xx`
  - 文件:
    - `src/shared/runtimeDataPaths.ts`
    - `server/src/index.ts`
    - `server/routes/files.ts`
    - `docs/PROJECT_CONSTITUTION_2026-03-25_00-42.md`
  - 动作:
    - 在共享路径层新增全局项目根目录 setter/getter，`project root` 不再只靠瞬时 `process.cwd()`
    - 服务启动时显式把 `workspace` 写入全局根目录真理源，并同步 `UCLAW_APP_ROOT / UCLAW_WORKSPACE`
    - 同步刷新 server shim 的 `process.resourcesPath`，避免出现第二套旧根目录
    - 文件路由不再旁路读取 `workspace env / process.cwd()`，统一回到同一个根目录入口
    - 宪法补充“项目必须独立、可移动、可换目录、可放在 U 盘运行”的边界条款
  - 结论:
    - 主链现在有明确的全局根目录定义
    - 服务启动后 `.env / .uclaw / workspace` 的定位不再跟着当前 `cwd` 漂移
    - “当前机器路径即真理”的污染继续被收口
  - 验证:
    - `tsc -p server/tsconfig.json` 通过
    - `tsc -p tsconfig.json --noEmit` 通过
  - 标签:
    - `{标记} P0-PROJECT-ROOT-TRUTH`
  - 状态: 已完成

- `主链 process.cwd() 旁路第二批收口`
  - 时间:
    - `2026-03-25 18:xx`
  - 文件:
    - `server/libs/httpSessionExecutor.ts`
    - `src/shared/browserObserverRuntime.ts`
    - `server/routes/skillsMcpHelper.ts`
    - `src/main/libs/coworkRunner.ts`
  - 动作:
    - 小眼睛 observer 脚本的项目内 fallback 从 `process.cwd()/SKILLs/...` 改为 `getProjectRoot()/SKILLs/...`
    - Skills/MCP helper 的 prompt 路径、bundled skills 根目录、workspace 展示统一回到项目根目录真理源
    - CoworkRunner 的 host workspace fallback、session cwd 解析、project skills 根目录不再依赖 `process.cwd()`
  - 结论:
    - `workspace / SKILLs / observer script` 这三条主链旁路继续回收到了统一根目录定义
    - 第二批完成后，全仓源码口径 `process.cwd()` 从 `33` 处降到 `25` 处
    - 剩余污染主要集中在 `feishuGateway.ts / skillManager.ts / cowork.ts / dialog.ts / coworkUtil.ts / sqliteStore.ts`
  - 验证:
    - `tsc -p server/tsconfig.json` 通过
    - `tsc -p tsconfig.json --noEmit` 通过
  - 标签:
    - `{标记} P1-PROCESS-CWD-CUT-BATCH2`
  - 状态: 已完成

- `运行入口 process.cwd() 旁路第三批收口`
  - 时间:
    - `2026-03-25 18:xx`
  - 文件:
    - `server/libs/feishuGateway.ts`
    - `server/routes/cowork.ts`
    - `server/routes/dialog.ts`
  - 动作:
    - 飞书网关执行 turn、收集产物、建会话时的 workspace fallback 从 `process.cwd()` 改为 `getProjectRoot()`
    - Web cowork 新建/续聊入口没有 cwd 时，默认回到 `req.app workspace / getProjectRoot()`，不再跟随 shell 当前目录
    - dialog 浏览/目录推断的兜底根从 `process.cwd()` 改为当前 app workspace
  - 结论:
    - 飞书入口、Web 对话入口、目录浏览入口都已接入统一根目录真理源
    - 第三批完成后，全仓源码口径 `process.cwd()` 从 `25` 处降到 `18` 处
    - 剩余旁路主要集中在 `skillManager / coworkUtil / sqliteStore / server index 辅助路径`
  - 验证:
    - `tsc -p server/tsconfig.json` 通过
    - `tsc -p tsconfig.json --noEmit` 通过
  - 标签:
    - `{标记} P1-PROCESS-CWD-CUT-BATCH3`
  - 状态: 已完成

- `数据/技能/运行资源路径第四批收口`
  - 时间:
    - `2026-03-25 18:xx`
  - 文件:
    - `src/main/sqliteStore.ts`
    - `src/main/skillManager.ts`
    - `src/main/libs/coworkUtil.ts`
    - `server/src/index.ts`
  - 动作:
    - legacy `MEMORY.md` 迁移候选不再从 `process.cwd()` 读取，统一回到 `getProjectRoot()`
    - skillManager 的 `mingit` 开发态候选路径、`SKILLs` 根目录候选改为 `getProjectRoot()`
    - coworkUtil 的 `mingit` / `SKILLs` 候选改为项目根目录真理源
    - server 内置 Playwright MCP 入口和 `.playwright-browsers` 路径不再绑定 shell cwd
  - 结论:
    - 数据迁移辅助、技能运行环境、运行资源定位、内置 MCP 入口这四条高风险链继续回收到统一根目录定义
    - 第四批完成后，全仓源码口径 `process.cwd()` 从 `18` 处降到 `10` 处
    - 剩余 10 处主要是边角 fallback / CLI / 兼容 shim / 少量辅助逻辑
  - 验证:
    - `tsc -p server/tsconfig.json` 通过
    - `tsc -p tsconfig.json --noEmit` 通过
  - 标签:
    - `{标记} P1-PROCESS-CWD-CUT-BATCH4`
  - 状态: 已完成

- `Git Bash 一期硬兜底 + 每日记忆摘要归属核真`
  - 时间:
    - `2026-03-26 00:5x`
  - 文件:
    - `src/main/libs/coworkUtil.ts`
    - `src/main/libs/coworkRunner.ts`
    - `server/libs/dailyMemoryPipeline.ts`
    - `server/routes/dailyMemory.ts`
  - 动作:
    - Windows 本地执行链补一期兼容：当 Git Bash 健康检查失败但标准安装位存在时，允许回落到 `C:\Program Files\Git\bin\bash.exe` / `usr\bin\bash.exe` 继续执行，不再直接把主链判死
    - 核真每日记忆摘要链路：当前 `dailyMemoryPipeline` 不走 `CoworkRunner`，而是直接从 `app_config.agentRoles` 里取“第一个启用且配置完整的角色”作为摘要模型来源
    - 记录当前边界：`agentRoleKey` 仍是长期记忆唯一身份；但“每日摘要调用哪个模型”目前仍是漂浮选择，不是按身份绑定
  - 结论:
    - `CoworkRunner` 仍是旧兼容执行缝，但 Web 1.0 现役主链不再直接回退它
    - 本次 Windows Git Bash 卡点确实发生在旧本地执行链环境准备阶段，已加最小兜底
    - 每日记忆摘要“没有归属”的感觉是对的：它现在绑的是“首个可用角色配置”，不是固定身份，也不是专门的 memory role
  - 验证:
    - `tsc -p tsconfig.json --noEmit` 通过
  - 标签:
    - `{标记} P0-GIT-BASH-EMERGENCY-FALLBACK`
    - `{标记} P0-DAILY-MEMORY-FLOATING-OWNER`
  - 状态: 已完成

- `每日记忆摘要改为独立 API + 轻执行器释放中间发言`
  - 时间:
    - `2026-03-26 01:0x`
  - 文件:
    - `server/libs/dailyMemoryPipeline.ts`
    - `server/libs/httpSessionExecutor.ts`
    - `.env`
    - `.env.example`
  - 动作:
    - 每日记忆摘要新增独立环境变量入口：优先读取 `UCLAW_DAILY_MEMORY_*`，只有未配置时才回退旧的角色槽位
    - 当前先绑定 `SiliconFlow / Qwen/Qwen3.5-4B` 作为摘要模型，避免继续占用主对话角色链
    - 轻执行器在工具回环中不再吞掉 assistant 的中间发言；模型在调工具前先说出的那句话现在会直接落消息
    - 对“明显要做事且当前有可用工具”的请求，放宽进入受控工具回环的门槛
  - 结论:
    - 每日记忆摘要不再是漂浮 owner，可先稳定走独立便宜模型
    - agent 在工具前的表达被还原，不再只剩最后一条 assistant
    - 一期仍保留 `10 步 / 90 秒` 的安全边界，但不再默认把大量任务压回 single-shot
  - 验证:
    - `tsc -p tsconfig.json --noEmit` 通过
  - 标签:
    - `{标记} P0-DAILY-MEMORY-DEDICATED-API`
    - `{标记} P0-EXECUTOR-PRE-TOOL-VOICE-RESTORED`
  - 状态: 已完成

- `MCP 一期前端收线 + 纯净 web 包重建`
  - 时间:
    - `2026-03-26 05:xx`
  - 文件:
    - `src/renderer/components/mcp/McpManager.tsx`
    - `scripts/refresh-clean-web-package.mjs`
    - `package.json`
    - `delivery-mainline-1.0-clean/README.md`
    - `delivery-mainline-1.0-clean/docs/MAINLINE_1.0_BOUNDARY.md`
    - `delivery-mainline-1.0-clean/docs/RUNBOOK_1.0.md`
    - `delivery-mainline-1.0-clean/docs/PURE_PACKAGE_FILETREE.md`
  - 动作:
    - MCP 管理页隐藏一期未收口的“自定义”入口，仅保留“当前支持 / 可接入”两栏
    - 保留已安装 MCP 的按角色可见性核对能力，不动底层角色绑定存储
    - 新增 `npm run package:web-clean`，可一键重建 `delivery-mainline-1.0-clean`
    - 纯净包重建时主动排除 `node_modules / server/dist / server/public / clean-room / .uclaw`
  - 结论:
    - 一期前端不再把半成品 MCP 入口暴露给用户
    - 当前交付包已经是 web 版纯净源码包，可直接 `npm install && npm run dev:web`
    - 交付目录内旧的脏运行物已清掉，不再混入依赖和构建产物
  - 验证:
    - `tsc -p tsconfig.json --noEmit` 通过
    - `node scripts/refresh-clean-web-package.mjs` 已成功重建 `delivery-mainline-1.0-clean`
    - 复查：`delivery-mainline-1.0-clean/node_modules` 不存在
    - 复查：`delivery-mainline-1.0-clean/server/dist` 不存在
    - 复查：`delivery-mainline-1.0-clean/server/public` 不存在
  - 标签:
    - `{标记} P1-MCP-UI-HIDE-CUSTOM`
    - `{标记} P1-CLEAN-WEB-PACKAGE-REFRESH`
  - 状态: 已完成

- `文档解析口径写回主线文档`
  - 时间:
    - `2026-03-26 05:xx`
  - 文件:
    - `docs/AGENTS.md`
    - `scripts/refresh-clean-web-package.mjs`
  - 动作:
    - 明确写回：PDF / Word / 常见附件解析属于系统底层通用能力，不依赖单独 skill
    - 标注当前实现位于 `server/libs/fileParser.ts`
    - 明确 `SKILLs/` 不是系统基础能力全集，不能因为缺少同名目录就误判为“不支持文档”
  - 结论:
    - 后续 agent / 文档 / 交付说明不会再把“没有 pdf/word skill”误解成“没有文档处理能力”
  - 状态: 已完成
