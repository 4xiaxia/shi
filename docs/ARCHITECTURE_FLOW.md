# 🏗️ UCLAW 业务流架构图

> **增量批注（2026-03-26）**：当前分支已将 `DingTalk` 调整为软性收束：兼容入口保留，但不再进入现役执行链。本文内涉及钉钉客户端、`/webhook/dingtalk`、钉钉执行流的图示与表格，当前应按历史架构参考或兼容壳理解，不再代表现役部署面；现役 IM 主链以飞书为准。
>
> 本文档展示从数据库到前端的完整业务流向，帮助理解系统架构和数据流转。

---

## 📊 系统整体架构

```mermaid
graph TB
    subgraph Client[客户端层]
        Browser[浏览器/Web]
        FeishuClient[飞书客户端]
        DingTalkClient[钉钉客户端]
    end
    
    subgraph Frontend[前端层 - React + Redux]
        Components[UI Components]
        Store[Redux Store
              - coworkSlice
              - skillSlice
              - mcpSlice
              - scheduledTaskSlice]
        Services[API Services
                 - cowork.ts
                 - skill.ts
                 - mcp.ts]
    end
    
    subgraph Backend[后端层 - Express]
        Routes[API Routes
               - cowork.ts
               - skills.ts
               - mcp.ts
               - feishuWebhook.ts]
        Libs[Business Logic
             - httpSessionExecutor.ts
             - sessionExecutorAdapter.ts
             - turnCache.ts]
        Middleware[Middleware
                   - Error Handler
                   - Auth]
    end
    
    subgraph Data[数据层]
        SQLite[(SQLite
                - sessions
                - messages
                - tasks
                - config)]
        FileSystem[File System
                   - /uploads
                   - /.uclaw]
    end
    
    subgraph External[外部服务]
        LLM[LLM APIs
            - OpenAI
            - Anthropic
            - DeepSeek]
        FeishuAPI[飞书 API]
        DingTalkAPI[钉钉 API]
    end
    
    subgraph Skills[Skill 系统]
        SkillRegistry[Skill Registry]
        SkillRuntime[Skill Runtime]
        MCP[MCP Servers]
    end
    
    Client <-- HTTP/WebSocket --> Frontend
    Frontend <-- API Calls --> Backend
    Backend <-- SQL --> Data
    Backend <-- HTTP --> External
    Backend <-- Internal --> Skills
```

---

## 🔄 核心业务流

### 1. 协作会话创建流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant UI as CoworkView.tsx
    participant Store as coworkSlice
    participant Service as cowork.ts
    participant Route as cowork.ts (Route)
    participant Lib as httpSessionExecutor
    participant DB as SQLite
    
    User->>UI: 点击"新建会话"
    UI->>Store: dispatch(createSession())
    Store->>Service: createSession(params)
    Service->>Route: POST /api/cowork/sessions
    Route->>Route: 验证参数
    Route->>DB: INSERT INTO sessions
    DB-->>Route: sessionId
    Route->>Lib: createPreferredSessionExecutor()
    Lib-->>Route: executor
    Route-->>Service: { success: true, session }
    Service-->>Store: 更新状态
    Store-->>UI: 导航到新会话
```

### 2. 消息发送与 AI 响应流程

```mermaid
sequenceDiagram
    participant User as 用户
    participant Input as CoworkPromptInput.tsx
    participant Store as coworkSlice
    participant Service as cowork.ts
    participant Route as cowork.ts (Route)
    participant Executor as httpSessionExecutor
    participant LLM as LLM API
    participant DB as SQLite
    
    User->>Input: 输入消息
    Input->>Store: dispatch(sendMessage())
    Store->>Service: sendMessage(sessionId, content)
    Service->>Route: POST /api/cowork/sessions/:id/continue
    Route->>DB: 保存用户消息
    Route->>Executor: executeTurn()
    
    loop 流式响应
        Executor->>LLM: POST /chat/completions
        LLM-->>Executor: SSE 流式数据
        Executor->>Route: 流式转发
        Route->>Service: WebSocket 推送
        Service->>Store: 更新消息状态
        Store->>Input: 显示 AI 回复
    end
    
    Executor->>DB: 保存完整对话
```

### 3. Skill 执行流程

```mermaid
sequenceDiagram
    participant Executor as httpSessionExecutor
    participant Adapter as sessionExecutorAdapter
    participant SkillRuntime as Skill Runtime
    participant Skill as Skill 模块
    participant Tool as Tool 函数
    
    Executor->>Executor: 解析 tool_calls
    Executor->>Adapter: 调用 skill handler
    Adapter->>SkillRuntime: 解析 skill ID
    SkillRuntime->>Skill: 加载 SKILL.md
    Skill->>Skill: 匹配 tool 定义
    Skill->>Tool: 执行 handler(args)
    
    alt 需要浏览器
        Tool->>Browser: Playwright 操作
        Browser-->>Tool: 返回结果
    else 需要文件操作
        Tool->>FS: 读写文件
        FS-->>Tool: 返回结果
    else 需要网络请求
        Tool->>HTTP: API 调用
        HTTP-->>Tool: 返回结果
    end
    
    Tool-->>Skill: { text, isError? }
    Skill-->>SkillRuntime: 格式化结果
    SkillRuntime-->>Adapter: 返回
    Adapter-->>Executor: tool_result
```

### 4. 飞书消息处理流程

```mermaid
sequenceDiagram
    participant Feishu as 飞书服务器
    participant Gateway as feishuGateway.ts
    participant Webhook as feishuWebhook.ts
    participant SessionMgr as Session Manager
    participant Executor as httpSessionExecutor
    participant DB as SQLite
    
    Feishu->>Gateway: WebSocket 消息推送
    Gateway->>Gateway: 验证签名
    Gateway->>Gateway: 去重检查
    
    alt 新会话
        Gateway->>Webhook: getOrCreateSession()
        Webhook->>DB: 查询历史会话
        DB-->>Webhook: session 或 null
        Webhook->>SessionMgr: createSession()
        SessionMgr->>DB: INSERT new session
    else 现有会话
        Gateway->>DB: getSession(sessionId)
    end
    
    Gateway->>Executor: orchestrateWebTurn()
    Executor-->>Gateway: AI 回复
    Gateway->>Feishu: 发送回复消息
    Gateway->>DB: 保存对话记录
```

### 5. 定时任务执行流程

```mermaid
sequenceDiagram
    participant Scheduler as Node Scheduler
    participant TaskStore as scheduledTaskStore.ts
    participant TaskRoute as scheduledTasks.ts
    participant Runner as coworkRunner.ts
    participant DB as SQLite
    
    Scheduler->>TaskStore: 触发任务
    TaskStore->>TaskRoute: 获取任务配置
    TaskRoute->>DB: SELECT task by id
    DB-->>TaskRoute: task config
    
    TaskRoute->>Runner: 创建执行上下文
    Runner->>Runner: 解析 prompt
    Runner->>Runner: 调用 LLM
    Runner-->>TaskRoute: 执行结果
    
    TaskRoute->>DB: 记录执行日志
    TaskRoute->>TaskStore: 更新任务状态
    
    alt 需要通知
        TaskRoute->>Feishu: 发送通知
        TaskRoute->>DingTalk: 发送通知
    end
```

---

## 🗄️ 数据模型关系

```mermaid
erDiagram
    SESSIONS {
        string id PK
        string title
        string agentRoleKey
        string modelId
        string workingDir
        boolean pinned
        datetime createdAt
        datetime updatedAt
    }
    
    MESSAGES {
        string id PK
        string sessionId FK
        string type
        string content
        json metadata
        datetime createdAt
    }
    
    SCHEDULED_TASKS {
        string id PK
        string name
        string prompt
        json schedule
        boolean enabled
        string agentRoleKey
        datetime createdAt
    }
    
    TASK_RUNS {
        string id PK
        string taskId FK
        string status
        string output
        datetime startedAt
        datetime completedAt
    }
    
    SKILLS {
        string id PK
        string name
        string path
        boolean enabled
        json config
    }
    
    MCP_SERVERS {
        string id PK
        string name
        string command
        json env
        boolean enabled
    }
    
    APP_CONFIG {
        string key PK
        json value
    }
    
    SESSIONS ||--o{ MESSAGES : contains
    SCHEDULED_TASKS ||--o{ TASK_RUNS : generates
    SESSIONS }o--o| SKILLS : uses
```

---

## 🔌 API 路由映射

### 核心 API 分组

```mermaid
graph LR
    subgraph API[API 路由 - server/routes/]
        direction TB
        
        subgraph Core[核心业务]
            COWORK[/api/cowork/*]
            SKILLS[/api/skills/*]
            MCP[/api/mcp/*]
        end
        
        subgraph System[系统功能]
            STORE[/api/store/*]
            FILES[/api/files/*]
            BACKUP[/api/backup/*]
        end
        
        subgraph Integration[外部集成]
            FEISHU[/webhook/feishu]
            DING[/webhook/dingtalk]
            SHELL[/api/shell]
        end
        
        subgraph Config[配置管理]
            APP[/api/app/*]
            API_CONFIG[/api/api-config/*]
            PERMS[/api/permissions/*]
        end
    end
    
    subgraph Frontend2[前端调用]
        Services2[services/*.ts]
        Store2[store/slices/*.ts]
    end
    
    Services2 --> COWORK
    Services2 --> SKILLS
    Services2 --> MCP
    Services2 --> STORE
    Store2 --> Services2
```

### 详细路由表

| 路由 | 文件 | 功能 | 前端对应 |
|------|------|------|----------|
| `GET /api/cowork/sessions` | cowork.ts | 获取会话列表 | cowork.ts#getSessions |
| `POST /api/cowork/sessions` | cowork.ts | 创建会话 | cowork.ts#createSession |
| `POST /api/cowork/sessions/:id/continue` | cowork.ts | 继续会话 | cowork.ts#sendMessage |
| `GET /api/skills` | skills.ts | 获取技能列表 | skill.ts#getSkills |
| `POST /api/skills/:id/enable` | skills.ts | 启用技能 | skill.ts#enableSkill |
| `GET /api/mcp/servers` | mcp.ts | 获取 MCP 服务器 | mcp.ts#getServers |
| `POST /api/mcp/servers` | mcp.ts | 创建 MCP 服务器 | mcp.ts#createServer |
| `GET /api/store/:key` | store.ts | 获取配置 | config.ts#get |
| `POST /api/store/:key` | store.ts | 保存配置 | config.ts#set |
| `POST /webhook/feishu` | feishuWebhook.ts | 飞书消息推送 | - |
| `POST /webhook/dingtalk` | dingtalkWebhook.ts | 钉钉消息推送 | - |

---

## 🎯 关键模块依赖

### 核心依赖图

```mermaid
graph TD
    subgraph Frontend3[前端]
        A[CoworkView.tsx]
        B[coworkSlice.ts]
        C[cowork.ts service]
    end
    
    subgraph Backend3[后端]
        D[cowork.ts route]
        E[httpSessionExecutor.ts]
        F[sessionExecutorAdapter.ts]
        G[turnCache.ts]
    end
    
    subgraph Data3[数据]
        H[SQLite Store]
        I[File System]
    end
    
    A -- dispatch --> B
    B -- call --> C
    C -- HTTP --> D
    D -- use --> E
    E -- use --> F
    E -- use --> G
    D -- SQL --> H
    E -- read/write --> I
```

### 模块稳定性矩阵

| 模块 | 入度 | 出度 | 稳定性 | 说明 |
|------|------|------|--------|------|
| `src/shared/*` | 15+ | 3 | 🔴 低 | 被多处依赖，修改影响大 |
| `server/libs/httpSessionExecutor.ts` | 5 | 8 | 🟡 中 | 核心业务逻辑 |
| `server/libs/feishuGateway.ts` | 3 | 6 | 🟢 高 | 飞书集成，相对独立 |
| `src/renderer/services/cowork.ts` | 8 | 5 | 🟡 中 | 前端核心服务 |
| `server/routes/cowork.ts` | 2 | 10 | 🟢 高 | 路由层，依赖多但稳定 |

---

## 🔍 关键数据流

### 配置数据流

```mermaid
flowchart LR
    A[.env 文件] -- 启动加载 --> B[环境变量]
    B -- 合并 --> C[SQLite app_config]
    C -- 读取 --> D[前端 Store]
    D -- 修改 --> E[API 调用]
    E -- 保存 --> C
    E -- 同步 --> A
```

### 会话数据流

```mermaid
flowchart TD
    A[用户输入] -- 创建 --> B[会话记录]
    B -- 包含 --> C[消息列表]
    C -- 发送 --> D[LLM API]
    D -- 响应 --> E[AI 消息]
    E -- 保存 --> C
    B -- 归档 --> F[每日记忆]
```

### Skill 数据流

```mermaid
flowchart LR
    A[SKILL.md 文件] -- 解析 --> B[Skill Registry]
    B -- 注册 --> C[Skill Manager]
    C -- 加载 --> D[Runtime]
    D -- 调用 --> E[Tool Handler]
    E -- 执行 --> F[业务逻辑]
```

---

## 📝 维护要点

### 修改影响范围检查清单

在修改以下模块时，请检查影响范围：

| 模块 | 影响范围 | 检查项 |
|------|----------|--------|
| `src/shared/*` | 全项目 | 前后端类型定义同步 |
| `server/libs/httpSessionExecutor.ts` | 所有会话功能 | 测试所有会话场景 |
| `server/routes/cowork.ts` | 前端 cowork 模块 | 前端 API 调用同步 |
| `src/renderer/types/*` | 全前端 | 后端 API 契约同步 |
| `server/libs/feishuGateway.ts` | 飞书集成 | 飞书消息收发测试 |

### 代码审查关注点

1. **类型安全**：新增代码是否避免使用 `any`？
2. **错误处理**：是否有完善的错误处理和日志？
3. **API 契约**：前后端类型定义是否同步？
4. **性能影响**：数据库查询是否有索引？是否有 N+1 问题？
5. **安全性**：用户输入是否验证？是否有注入风险？

---

> **文档版本**：1.0  
> **最后更新**：2026-03-26  
> **维护者**：Agent 团队
