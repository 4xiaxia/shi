# xhs-mcp - 小红书自动化工具

## 📝 技能介绍

`xhs-mcp` 是一个功能强大的小红书（XiaoHongShu）自动化工具，提供了统一的命令行入口和内置的 MCP 服务器。它主要用于小红书（xiaohongshu.com）的自动化操作，包括登录、发布、搜索、推荐等功能。

## ✨ 核心功能

### 🔐 认证管理
- **登录/登出** - 支持小红书账号登录状态管理
- **状态检查** - 查看当前登录状态
- **Cookie管理** - 自动处理登录凭证

### 📱 内容发布
- **图文发布** - 支持标题≤20字符、内容≤1000字符、最多18张图片
- **视频发布** - 支持MP4、MOV、AVI、MKV、WebM、FLV、WMV等格式
- **智能下载** - 支持图片URL自动下载到本地
- **混合模式** - 支持本地路径和URL混合使用
- **缓存机制** - 避免重复下载，提升效率

### 🔍 内容发现
- **推荐内容** - 获取推荐信息流
- **搜索功能** - 按关键词搜索笔记
- **详情查看** - 获取笔记详细信息
- **评论互动** - 对笔记进行评论

### 📝 用户笔记管理
- **列表查看** - 查看用户发布的笔记
- **删除管理** - 删除指定或最近的笔记

## 🚀 使用方法

### 启动 MCP 服务器

**Stdio 模式（默认）**
```bash
cd ~/.claude/skills/xhs-mcp
node dist/xhs-mcp.js mcp
```

**HTTP 模式**
```bash
cd ~/.claude/skills/xhs-mcp
node dist/xhs-mcp.js mcp --mode http --port 3000
```

### 基本命令

```bash
# 认证相关
node dist/xhs-mcp.js login --timeout 120
node dist/xhs-mcp.js logout
node dist/xhs-mcp.js status

# 浏览器管理
node dist/xhs-mcp.js browser [--with-deps]

# 内容发现
node dist/xhs-mcp.js feeds
node dist/xhs-mcp.js search -k 关键字

# 发布内容
# 使用本地图片
node dist/xhs-mcp.js publish --type image --title 标题 --content 内容 -m path1.jpg,path2.png --tags a,b

# 使用图片URL（自动下载）
node dist/xhs-mcp.js publish --type image --title 标题 --content 内容 -m "https://example.com/img1.jpg,https://example.com/img2.png" --tags a,b

# 发布视频
node dist/xhs-mcp.js publish --type video --title 视频标题 --content 视频描述 -m path/to/video.mp4 --tags a,b
```

## 🔧 配置说明

### 首次使用准备
```bash
# 安装 Puppeteer 浏览器（首次运行需要）
node dist/xhs-mcp.js browser
```

### 环境要求
- **Node.js**: >= 18.0.0
- **磁盘空间**: 建议至少 1GB 可用空间
- **网络连接**: 需要访问小红书网站
- **浏览器**: Puppeteer 自动安装 Chromium

## ⚠️ 注意事项

- **图文发布**: 标题≤20字符，内容≤1000字符，图片≤18张
- **视频发布**: 文件大小建议≤500MB
- **避免同账号多端同时网页登录**
- **合理控制发帖频率**
- **图片 URL 自动下载到 `./temp_images/` 目录（自动缓存）**
- **支持图片格式**: JPEG、PNG、GIF、WebP、BMP

## 📁 项目结构

```
xhs-mcp/
├── dist/                 # 编译后的可执行文件
├── src/                  # 源代码
├── config/              # 配置文件
├── docs/                # 文档
├── examples/            # 使用示例
├── tests/               # 测试文件
└── SKILL.md            # 技能说明
```

## 🎯 适用场景

- 📱 **社交媒体运营** - 自动化小红书内容管理
- 🤖 **AI工具集成** - 与AI模型配合使用
- 📊 **数据分析** - 收集小红书数据进行分析
- 🚀 **批量发布** - 批量发布图文和视频内容
- 🔍 **内容监控** - 监控热门内容和用户互动
