# 🤖 Agent 自我修养指南 - 错题集

> **给未来的自己**：这是我在项目维护中踩过的坑、犯过的错，以及解决方案。不要重复踩坑！

---

## 📋 目录

1. [工具调用踩坑记录](#一工具调用踩坑记录)
2. [代码审查常见陷阱](#二代码审查常见陷阱)
3. [类型安全最佳实践](#三类型安全最佳实践)
4. [项目维护 checklist](#四项目维护-checklist)
5. [快速诊断手册](#五快速诊断手册)

---

## 一、工具调用踩坑记录

### 🔴 严重错误模式

#### 1.1 类型断言滥用 (`as any`)
**错误示例**：
```typescript
// ❌ 错误：掩盖了真正的类型问题
const result = await apiClient.get('/api/data') as any;
const data = result.data as any;
```

**后果**：
- 编译时无法发现类型错误
- 运行时可能出现 `undefined` 访问错误
- 类型系统形同虚设

**正确做法**：
```typescript
// ✅ 正确：定义明确的接口
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

const result = await apiClient.get<ApiResponse<UserData>>('/api/data');
if (result.success) {
  const data = result.data; // 类型安全
}
```

**项目现状**：本项目有 **314 处 `any` 类型使用**，主要集中在：
- `src/shared/nativeCapabilities/` - 工具函数 handler
- `src/renderer/services/electronShim.ts` - IPC 通信层
- `server/routes/` - 请求处理函数
- `server/libs/httpSessionExecutor.ts` - 执行器核心

---

#### 1.2 忽略 ESLint 警告
**错误配置**：
```javascript
// .eslintrc.cjs - 当前配置过于宽松
rules: {
  '@typescript-eslint/no-explicit-any': 'off',  // ❌ 危险！
  '@typescript-eslint/no-unused-vars': 'off',   // ❌ 隐藏问题
  'no-constant-condition': 'off',               // ❌ 允许死代码
}
```

**后果**：
- 代码质量持续衰减
- 潜在 bug 无法被及时发现
- 技术债务累积

**正确做法**：
```javascript
// ✅ 建议配置
rules: {
  '@typescript-eslint/no-explicit-any': 'warn',  // 警告而非禁止
  '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  'no-constant-condition': 'error',
}
```

---

#### 1.3 错误处理不一致
**错误示例**：
```typescript
// ❌ 错误：有的路由打印日志，有的不打印
try {
  // ...
} catch (error) {
  // 缺少错误日志
  res.status(500).json({ success: false, error: 'Failed' });
}
```

**正确做法**：
```typescript
// ✅ 正确：统一错误处理
import { logger } from '@/utils/logger';

try {
  // ...
} catch (error) {
  logger.error('Operation failed:', error);
  res.status(500).json({ 
    success: false, 
    error: error instanceof Error ? error.message : 'Unknown error' 
  });
}
```

---

### 🟡 常见问题模式

#### 1.4 请求参数未验证
**错误示例**：
```typescript
// ❌ 错误：直接使用 req.body
app.post('/api/users', (req, res) => {
  const { name, email } = req.body; // 可能为 undefined
  // ...
});
```

**正确做法**：
```typescript
// ✅ 正确：使用 Zod 验证
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

app.post('/api/users', (req, res) => {
  const result = UserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  const { name, email } = result.data;
  // ...
});
```

---

#### 1.5 重复代码未提取
**错误示例**：
```typescript
// ❌ 错误：重复的错误响应逻辑
// 路由 A
catch (error) {
  res.status(500).json({
    success: false,
    error: error instanceof Error ? error.message : 'Failed to create',
  });
}

// 路由 B
catch (error) {
  res.status(500).json({
    success: false,
    error: error instanceof Error ? error.message : 'Failed to update',
  });
}
```

**正确做法**：
```typescript
// ✅ 正确：提取统一处理函数
function handleError(res: Response, error: unknown, context: string) {
  const message = error instanceof Error ? error.message : `Failed to ${context}`;
  logger.error(`${context} failed:`, error);
  res.status(500).json({ success: false, error: message });
}

// 使用
catch (error) {
  handleError(res, error, 'create session');
}
```

---

## 二、代码审查常见陷阱

### 2.1 不要只关注修改的文件
**教训**：修复一个 bug 时，发现 `server/routes/cowork.ts` 有类型问题，但只修复了当前文件。后来在其他路由文件发现了相同的问题。

**正确做法**：
```bash
# 搜索项目中相同的问题模式
grep -r "as any" --include="*.ts" src/ server/
grep -r "req.body" --include="*.ts" server/routes/ | grep -v "validation"
```

### 2.2 检查类型定义同步
**教训**：修改了 API 接口，但忘记更新对应的 TypeScript 类型定义，导致前端调用时出现类型错误。

**正确做法**：
- 修改 API 时，同时检查 `src/renderer/types/`
- 使用 `webApiContract.ts` 定义前后端契约
- 运行 TypeScript 编译检查：`tsc --noEmit`

### 2.3 不要忽视警告
**教训**：ESLint 配置中关闭了太多规则，导致潜在问题无法被发现。

**当前项目 ESLint 问题**：
```javascript
// 过于宽松的规则（需要逐步收紧）
'@typescript-eslint/no-explicit-any': 'off',
'@typescript-eslint/no-unused-vars': 'off',
'@typescript-eslint/ban-ts-comment': 'off',
'react-hooks/exhaustive-deps': 'off',
```

---

## 三、类型安全最佳实践

### 3.1 优先使用 `unknown` 而非 `any`
```typescript
// ❌ 错误
function parseData(input: any): any {
  return JSON.parse(input);
}

// ✅ 正确
function parseData<T>(input: unknown): T {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }
  return JSON.parse(input) as T;
}
```

### 3.2 使用 Zod 进行运行时验证
本项目已依赖 `zod`，但使用不充分：

```typescript
// ✅ 在 API 层使用 Zod
import { z } from 'zod';

const CreateSessionSchema = z.object({
  title: z.string().min(1).max(200),
  agentRoleKey: z.enum(['organizer', 'writer', 'designer', 'analyst']),
  workingDir: z.string().optional(),
});

type CreateSessionRequest = z.infer<typeof CreateSessionSchema>;
```

### 3.3 定义明确的错误类型
```typescript
// ✅ 定义应用错误类型
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}
```

---

## 四、项目维护 checklist

### 每日检查
- [ ] 运行 `npm run lint` 检查代码规范
- [ ] 检查控制台是否有未处理的错误日志
- [ ] 确认测试用例通过

### 每周检查
- [ ] 审查新增的 `any` 类型使用
- [ ] 检查文档与代码是否同步
- [ ] 审查 TODO/FIXME 注释
- [ ] 更新依赖包（安全检查）

### 每月检查
- [ ] 代码覆盖率报告
- [ ] 性能基准测试
- [ ] 技术债务清单更新
- [ ] 架构文档更新

### 代码审查 checklist
- [ ] 类型定义是否完整？
- [ ] 错误处理是否完善？
- [ ] 是否有重复代码？
- [ ] 是否添加了必要的注释？
- [ ] 是否更新了相关文档？
- [ ] 是否引入了新的技术债务？

---

## 五、快速诊断手册

### 5.1 编译错误
```bash
# 检查 TypeScript 错误
npx tsc --noEmit

# 检查特定文件
npx tsc --noEmit src/renderer/components/MyComponent.tsx
```

### 5.2 运行时错误
```bash
# 查看日志
tail -f logs/app.log

# 搜索特定错误
grep -r "Error:" logs/ | tail -20
```

### 5.3 性能问题
```bash
# 检查包大小
npm run build
ls -lh server/public/assets/

# 分析依赖
npm ls --depth=0
```

### 5.4 数据库问题
```bash
# 检查 SQLite 数据库
sqlite3 .uclaw/web/data.db ".schema"
sqlite3 .uclaw/web/data.db "SELECT COUNT(*) FROM sessions;"
```

---

## 六、重要记忆点

### 6.1 项目特定约定
- **身份唯一真理**：`agentRoleKey`
- **模型只是配置**：`modelId`
- **四固定角色**：`organizer / writer / designer / analyst`
- **环境变量前缀**：`UCLAW_*`（新）兼容 `LOBSTERAI_*`（旧）

### 6.2 关键文件位置
```
核心配置：
- .env.example          # 环境变量模板
- server/tsconfig.json   # 服务端 TS 配置
- src/renderer/types/    # 前端类型定义

核心业务：
- server/routes/         # API 路由
- server/libs/           # 业务逻辑
- src/renderer/services/ # 前端服务
- src/renderer/store/    # 状态管理
```

### 6.3 常见命令
```bash
# 开发
npm run dev:web          # 启动开发服务器
npm run server:dev       # 启动服务端开发

# 构建
npm run build            # 完整构建
npm run lint             # 代码检查

# 测试
npm run test:server      # 服务端测试
npm run smoke:cowork     # 冒烟测试
```

---

## 七、待办事项

### 高优先级
- [ ] 修复 314 处 `any` 类型使用
- [ ] 收紧 ESLint 规则配置
- [ ] 统一错误处理模式
- [ ] 添加请求参数验证

### 中优先级
- [ ] 提取重复的错误响应逻辑
- [ ] 完善 API 文档
- [ ] 增加单元测试覆盖率

### 低优先级
- [ ] 优化构建配置
- [ ] 更新依赖包

---

> **最后更新**：2026-03-26
> 
> **记住**：代码质量是团队的共同责任，每一行代码都要对质量负责！
