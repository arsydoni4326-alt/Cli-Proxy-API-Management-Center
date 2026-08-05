# CLI Proxy API 管理中心

用于管理与故障排查 **CLI Proxy API** 的单文件 Web UI（React + TypeScript），通过 **Management API** 完成配置、凭据与日志等管理操作。

[English](README.md)

**主项目**: https://github.com/router-for-me/CLIProxyAPI  
**示例地址**: https://remote.router-for.me/  
**最低版本要求**: ≥ 7.1.0（推荐最新）

从6.0.19版本开始，Web UI 随主程序一起提供；服务运行后，通过 API 端口上的"/management.html"访问它。

### 后端版本强制要求

登录时 Web UI 会**强制执行 ≥ 7.1.0 的最低版本要求**。UI 会从 CLI Proxy API 在每个 Management API 响应中携带的 `X-CPA-Version` 响应头中跟踪后端版本，并与内置下限比较（`MIN_BACKEND_VERSION`，见 `src/utils/version.ts`）。登录采用**失败即关闭（fail-closed）**策略：若上报版本低于 7.1.0，或后端完全未上报版本（例如引入版本响应头之前的旧版本），连接将被拒绝，并显示独立的本地化诊断信息——「CLI Proxy API 后端版本过低或未上报版本号，请将后端升级到 v7.1.0 或更高版本。」——而不是笼统的连接错误。该检查在每次登录时、初次拉取配置之后评估一次。

## 这是什么（以及不是什么）

- 本仓库只包含 Web 管理界面本身，通过 CLI Proxy API 的 **Management API**（`/v0/management`）读取/修改配置、上传凭据与查看日志。
- 它 **不是** 代理本体，不参与流量转发。

## 快速开始

### 方式 A：使用 CLI Proxy API 自带的 Web UI（推荐）

1. 启动 CLI Proxy API 服务。
2. 打开：`http://<host>:<api_port>/management.html`
3. 输入 **管理密钥** 并连接。

页面会根据当前地址自动推断 API 地址，也支持手动修改。

### 方式 B：开发调试

```bash
bun install --frozen-lockfile
bun run dev
```

打开 `http://localhost:5173`，然后连接到你的 CLI Proxy API 后端实例。

### 方式 C：构建单文件 HTML

```bash
bun install --frozen-lockfile
bun run build
```

- 构建产物：`dist/index.html`（资源已全部内联）。
- 在 CLI Proxy API 的发布流程里会重命名为 `management.html`。
- 本地预览：`bun run preview`

提示：直接用 `file://` 打开 `dist/index.html` 可能遇到浏览器 CORS 限制；更稳妥的方式是用预览/静态服务器打开。

### 方式 D：使用 Docker 构建（无需本地工具链）

仓库自带的 `Dockerfile` 可直接构建出 CLI Proxy API 所需的自包含 `management.html` —— 适用于离线/隔离环境、版本锁定或 CI 流水线：

```bash
# 构建并把产物提取到当前目录：
docker build --output . .
# → ./management.html
```

也可以把 builder 阶段打成镜像再拷贝出来（最终阶段基于 `scratch`，故优先推荐上面的 `--output` 方式）：

```bash
docker build --target builder -t cpamc-panel .
docker run --rm -v "$(pwd):/out" --entrypoint sh cpamc-panel -c "cp /management.html /out/"
```

将生成的 `management.html` 放入 CLI Proxy API 的面板目录（例如 `config.yaml` 旁的 `./static/`，或 `$MANAGEMENT_STATIC_PATH`）；如需锁定该版本，设置 `remote-management.disable-auto-update-panel: true`，后端便不会自动覆盖它。

## 连接说明

### API 地址怎么填

以下格式均可，Web UI 会自动归一化：

- `localhost:8317`
- `http://192.168.1.10:8317`
- `https://example.com:8317`
- `http://example.com:8317/v0/management`（也可填写，后缀会被自动去除）

### 管理密钥（注意：不是 API Keys）

管理密钥会以如下方式随请求发送：

- `Authorization: Bearer <MANAGEMENT_KEY>`（默认）

这与 Web UI 中"API Keys"页面管理的 `api-keys` 不同：后者是代理对外接口（如 OpenAI 兼容接口）给客户端使用的鉴权 key。

### 远程管理

当你从非 localhost 的浏览器访问时，服务端通常需要开启远程管理（例如 `allow-remote-management: true`）。  
完整鉴权规则、服务端限制与边界情况请参考 CLI Proxy API 服务端文档或配置注释。

## 功能一览（按页面对应）

- **仪表盘**：连接状态、服务版本/构建时间、关键数量概览、可用模型概览。
- **配置面板**：可视化编辑常用 `config.yaml` 字段、基础设置与代理 `api-keys`；也支持源码编辑、YAML 高亮/搜索与保存前差异预览。
- **AI 提供商**：
  - Gemini/Codex/Claude/Vertex 配置（Base URL、Headers、代理、模型别名、排除模型、Prefix）。
  - OpenAI 兼容提供商（多 Key、Header、自助从 `/v1/models` 拉取并导入模型别名、可选浏览器侧 `chat/completions` 测试）。
- **认证文件**：上传/下载/删除 JSON 凭据，筛选/搜索/分页，标记 runtime-only；查看单个凭据可用模型（依赖后端支持）；管理 OAuth 排除模型（支持 `*` 通配符）；配置 OAuth 模型别名映射。
- **OAuth**：对 Codex、Anthropic/Claude、Antigravity、Kimi、xAI/Grok 发起 OAuth/设备码流程并轮询状态；支持提交回调 URL 或 xAI/Grok 页面显示的 code；包含 Vertex JSON 凭据导入与 iFlow Cookie 导入。
- **配额管理**：管理 Claude、Antigravity、Codex、Kimi、xAI/Grok 等提供商的配额上限与使用情况。
- **日志**：增量拉取日志、自动刷新、搜索、隐藏管理端流量、清空日志；下载请求错误日志文件。
- **实时请求流**：通过 WebSocket 订阅 `/live-flow/ws` 实时可视化请求流向；使用 React Flow 画布渲染持久拓扑 —— 中央为 CLIProxyAPI 节点，所有已观测到的上游模型散布在其周围，每个进入的请求都会以按状态着色的流量脉冲动画从 CLIProxyAPI 流向目标模型；配合有界（200 条）最近事件表，支持暂停/继续与清空。仅在后端开启 `flow-visualization-enabled` 时显示。
- **系统信息**：快捷链接、版本检查、请求日志开关、本地登录信息清理，以及拉取 `/v1/models` 并分组展示（需要至少一个代理 API Key 才能查询模型）。

## 技术栈

- React 19 + TypeScript 6.0
- Vite 8（单文件构建）
- Zustand（状态管理）
- Axios（HTTP 客户端）
- react-router-dom v7（HashRouter）
- Motion（动效）
- CodeMirror 6（YAML 编辑器）
- SCSS Modules（样式）
- i18next（国际化）

## 多语言支持

目前支持四种语言：

- 英文 (en)
- 简体中文 (zh-CN)
- 繁体中文 (zh-TW)
- 俄文 (ru)

界面语言会根据浏览器设置自动切换，也可在登录页或顶部语言菜单手动切换。

## 浏览器兼容性

- 构建目标：`ES2020`
- 支持 Chrome、Firefox、Safari、Edge 等现代浏览器
- 支持移动端响应式布局，可通过手机/平板访问

## 构建与发布说明

- 使用 Vite 输出 **单文件 HTML**（`dist/index.html`），资源全部内联（`vite-plugin-singlefile`）。
- 打 `vX.Y.Z` 标签会触发 `.github/workflows/release.yml`，发布 `dist/management.html`。
- 系统信息页显示的 UI 版本在构建期注入（优先使用环境变量 `VERSION`，否则使用 git tag / `package.json`）。

## 安全提示

- 管理密钥会存入浏览器 `localStorage`，并使用轻量混淆格式（`enc::v1::...`）避免明文；仍应视为敏感信息。
- 建议使用独立浏览器配置/设备进行管理；开启远程管理时请谨慎评估暴露面。

## 常见问题

- **提示「后端版本过低或未上报版本号」**：后端低于 v7.1.0（或旧到不支持版本响应头），请升级 CLI Proxy API 至 v7.1.0+ 后重试；登录时会强制执行版本下限检查，详见上文「后端版本强制要求」。
- **无法连接 / 401**：确认 API 地址与管理密钥；远程访问可能需要服务端开启远程管理。
- **反复输错密钥**：服务端可能对远程 IP 进行临时封禁。
- **日志页面不显示**：需要在“基础设置”里开启“写入日志文件”，导航项才会出现。
- **功能提示不支持**：多为后端版本较旧或接口未启用/不存在（如：认证文件模型列表、排除模型、日志相关接口）。
- **OpenAI 提供商测试失败**：测试在浏览器侧执行，会受网络与 CORS 影响；这里失败不一定代表服务端不可用。

## 开发命令

```bash
bun run dev        # 启动开发服务器
bun run build      # tsc + Vite 构建
bun run preview    # 本地预览 dist
bun run test       # Bun 测试套件
bun run lint       # ESLint（warnings 视为失败）
bun run verify     # 测试 + lint + 构建
bun run format     # Prettier
bun run type-check # tsc --noEmit
```

## 贡献

欢迎提 Issue 与 PR。建议附上：

- 复现步骤（服务端版本 + UI 版本）
- UI 改动截图
- 验证记录（`bun run verify`，以及按需单独运行的 `bun run type-check`）

## 许可证

MIT
