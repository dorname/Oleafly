## ADDED — Oleafly 全局架构总纲（现状基线）

> **基线口径**：桌面 `0.4.11`（`package.json` / `src-tauri/Cargo.toml` / `src-tauri/tauri.conf.json` 三处一致），Server crate `0.1.1`（`crates/oleafly-server/Cargo.toml`），CLI crate `0.1.0`（`crates/oleafly-cli/Cargo.toml`）；绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 `a0154c69c` 3 个提交）。
> **口径声明（强制）**：本文件是**只读静态盘点**产物。基线盘点**未运行任何测试、未执行任何构建/发布/部署动作**，因此文中一切「覆盖」「检查」「门禁」只描述**已存在于仓库中的代码、配置与工作流所定义的静态行为**，**不代表任何动态验证通过**。`openlogos verify` 阶段取证时，测试结果只能声明「未执行 / 环境未装依赖」。
> **事实来源**：提案 `logos/changes/add-baseline-docs/inventory.md` 的「模块划分」表与「架构与测试要点」段（本文所有条目均可回指该两段）；文中括注的仓库路径为盘点时的证据指针，用于让读者按图索骥复核，不作为「已验证」声明。
> **本文性质**：存量架构现状基线。**全局唯一**的架构总纲，供六份模块需求文档（core / research / ai / collab / sync / delivery）共同引用；只记录已存在的技术栈、组件、进程边界、数据流与信任边界，**不新增架构决策、不发明实现细节、不承诺未验证的运行时行为**。
> **模块划分（引自 inventory.md，本文件不改写）**：core（本地写作核心）、research（研究与文献）、ai（AI 与 agent）、collab（实时协作）、sync（云同步与在线服务）、delivery（工程交付）。场景编号 S01-S52 全局唯一，`scenario_counter.next_id = 53`。

---

### 一、技术栈与工具链

#### 1.1 单仓双工作区（Monorepo）

| 层 | 构成 | 证据 |
|---|---|---|
| 前端工作区 | pnpm workspace，成员为 `packages/*` | `pnpm-workspace.yaml`（`packages: - "packages/*"`） |
| 后端工作区 | Cargo workspace，成员为 `crates/*` + `src-tauri` | `Cargo.toml`（`members = ["crates/*", "src-tauri"]`、`resolver = "2"`） |
| 应用壳 | `src/`（应用壳、store、Tauri 适配器、contribution、UI）、`src-tauri/src/`（IPC 命令、项目沙箱、Git、引擎、下载、secrets） | `docs/architecture.md` L46-48 |
| 浏览器端 | `web/`（独立前端工程，含 `web/src/compile/engines.ts`） | `web/src/`、`docs/architecture.md` L211-214 |
| 内嵌资源 | `src-tauri/resources/`（模板、许可证、固定版本的运行时资源） | `docs/architecture.md` L48 |

#### 1.2 工具链版本与锁定

| 项 | 版本/约束 | 证据 |
|---|---|---|
| Node | `>=22.13 <25` | `package.json` → `engines.node` |
| pnpm | `11.9.0` | `package.json` → `packageManager: "pnpm@11.9.0"` |
| Rust | `1.98.1`（含 `rustfmt` + `clippy`，`profile = "minimal"`） | `rust-toolchain.toml` → `toolchain.channel` |
| Rust MSRV | `1.87`（与工具链版本是两条独立承诺，单独用 `cargo +1.87.0` 校验） | `crates/oleafly-core/Cargo.toml` → `rust-version`；`rust-toolchain.toml` 注释 |
| 桌面端 | Tauri 2（`tauri = { version = "2", features = ["macos-private-api", "unstable"] }`） | `src-tauri/Cargo.toml` |

#### 1.3 依赖治理

- **workspace 包以 TypeScript source 消费**：`tsconfig.json` 的 `paths` 把每个包别名直接指向 `packages/<name>/src/index.ts`（含若干子路径导出，如 `@oleafly/editor/CodeMirrorEditor`、`@oleafly/preflight/pdf-extract`、`@oleafly/compile-port/testing`），`main`/`types`/`exports` 同指源码（例：`packages/backend-port/package.json` → `"main": "src/index.ts"`）。
- **包不得导入 Zustand / Tauri API / `@/` 应用模块**：该约束是包边界能独立于桌面运行时测试、并避免依赖环的前提；具体宿主适配器一律建在 `src/` 内。
- **包新增需三处同步**：`tsconfig.json`、`vite.config.ts`、`vitest.config.ts` 的别名保持一致，并在根 `package.json` 登记 workspace 依赖。
- **npm 依赖安全覆盖**：`pnpm-workspace.yaml` 的 `overrides` 固定了一批安全公告修复版本（`decode-uri-component`、`nanoid`、`postcss`、`undici`、`dompurify`、`markdown-it`、`solid-js` 等），`patchedDependencies` 固定三个 patch（`@replit/codemirror-emacs`、`emscripten-wasm-loader`、`hunspell-asm`）。
- **Rust 侧 vendored patch**：`Cargo.toml` 的 `[patch.crates-io]` 把 `tauri-plugin-playwright`、`portable-pty`、`tauri-plugin-single-instance` 指向仓库内 `vendor/` 副本（其中 playwright 副本改走 webview map 解析，规避宿主机在承载第二个 webview 时丢弃窗口导致 eval 失败）。
- **pnpm 侧 `catalog` 与 `allowBuilds`**：`katex` 固定在 `0.18.7`（同时经 `overrides` 把多条传递依赖收敛到同一份 KaTeX），`allowBuilds` 只放行 `esbuild`。

#### 1.4 构建 profile（按产物形态分档）

| profile | 关键参数 | 面向产物 | 证据 |
|---|---|---|---|
| `release` | `opt-level = "s"`、`lto = true`、`codegen-units = 1`、`strip = true` | 桌面 bundle（按体积构建） | `Cargo.toml` |
| `release.package.oleafly-server` | `opt-level = 3` | 协作 Server（时间花在 JSON / base64 / 文档重放上，按速度构建） | `Cargo.toml` 注释 + 段 |
| `server-release` | `inherits = "release"` + `opt-level = 3`，`server-release.package."*"` 全体 `opt-level = 3` | Server 镜像与其 release 二进制 | `Cargo.toml` |
| `wasm-release` | `inherits = "release"`、`opt-level = "s"`、`panic = "abort"` | 浏览器端 SyncTeX WebAssembly（每个读者都要下载，故按体积构建；panic 直接 abort，不带展开代码） | `Cargo.toml` 注释 + 段 |

---

### 二、组件清单

#### 2.1 Rust 组件（四组）

**（1）项目与编译共享（跨运行时复用，不依赖 Tauri）**

| crate | 职责 | 证据 |
|---|---|---|
| `crates/oleafly-core/` | 项目 manifest、路径安全、构建目录策略、TeX 发现、编译时限、编译器日志读取；持有两运行时必须一致的编译约定（`tex_distro`、`compile_limit`、`tex_errors`/`tex_failure`/`tex_outputs`/`pandoc_log`） | `docs/architecture.md` L11、L188-193 |
| `crates/oleafly-history/` | 内容寻址的编译检查点存储（`FORMAT_VERSION = 2`） | `crates/oleafly-history/src/lib.rs` L15 |
| `crates/oleafly-preflight/` | Rust 侧预检，结果与桌面面板一致，供 `oleafly check` 与 research task 复用 | `docs/architecture.md` L24 |
| `crates/oleafly-lint/` | LaTeX / BibTeX / 拼写 / 语法检查，供 `oleafly lint` | `docs/architecture.md` L25 |
| `crates/oleafly-doctools/` | 文档统计、SyncTeX 文件读取、Pandoc 导出，桌面与 CLI 共用 | `docs/architecture.md` L26 |
| `crates/oleafly-synctex/` | SyncTeX 解析与正反向检索，**不做文件访问**，桌面 / CLI / 浏览器三方共用 | `docs/architecture.md` L27 |
| `crates/oleafly-synctex-wasm/` | `oleafly-synctex` 的 WebAssembly 构建，供浏览器端使用（`pnpm synctex:wasm` → `scripts/build-synctex-wasm.mjs`，`target = wasm32-unknown-unknown`，`PROFILE = "wasm-release"`） | `docs/architecture.md` L28；`scripts/build-synctex-wasm.mjs` |
| `crates/oleafly-downloads/` | TeX 工具链、Typst、模板包下载，桌面与 CLI 共用 | `docs/architecture.md` L29 |
| `crates/oleafly-s3/` | AWS Signature Version 4 请求签名，桌面与 Server 共用（盘点补充项，见下方说明） | `crates/oleafly-s3/Cargo.toml` → `description` |

**（2）可执行（面向用户的进程入口）**

| 组件 | 职责 | 证据 |
|---|---|---|
| `src-tauri/`（crate `oleafly`，版本 `0.4.11`，lib 名 `oleafly_lib`） | 桌面 Tauri 应用；Tauri IPC 命令注册表在 `src-tauri/src/lib.rs` L523-1251 | `src-tauri/Cargo.toml`、`src-tauri/src/lib.rs` |
| `crates/oleafly-cli/`（版本 `0.1.0`，二进制名 `oleaflyc`） | 命令行：`oleafly` 的命令集、原生编译器适配器、JSON 契约、MCP server、agent、daemon | `crates/oleafly-cli/Cargo.toml` → `[[bin]] name = "oleaflyc"` |

**（3）Agent 与研究**

| crate | 职责 | 证据 |
|---|---|---|
| `crates/oleafly-agent/` | 与厂商无关的 agent 运行时（对四类 provider 线格式说话，不决定模型可信度） | `docs/architecture.md` L13、L231 |
| `crates/oleafly-acp/` | CLI agent 的 Agent Client Protocol 客户端，基于官方 Rust SDK | `docs/architecture.md` L19 |
| `crates/oleafly-research/` | Research task：store、调度器、run 与执行器（local / SSH / Slurm / Cua Spaces）、文献与引用工具（`SCHEMA_VERSION = 5`） | `docs/architecture.md` L20；`crates/oleafly-research/src/store/mod.rs` L2792 |
| `crates/oleafly-sandbox/` | 任务命令与 run 的隔离（macOS Seatbelt、Linux bubblewrap、Windows AppContainer）与 run profile | `docs/architecture.md` L21 |
| `crates/oleafly-secrets/` | 加密 secret store、数据目录与私有文件辅助，桌面与 CLI 共用（AES-256-GCM 文件，unix 0600 / Windows owner-only ACL） | `docs/architecture.md` L22；`crates/oleafly-secrets/src/lib.rs` L1-15 |
| `crates/oleafly-forge/` | Git 托管账号、token 与服务端 API，**无 Tauri 依赖**以便 CLI 复用 | `docs/architecture.md` L15 |
| `crates/oleafly-online/` | 在线 LaTeX 服务客户端：会话、项目列表、目录导入、浏览器 cookie 读取、Git 桥同步 | `docs/architecture.md` L23 |

**（4）协作**

| crate | 职责 | 证据 |
|---|---|---|
| `crates/oleafly-collab-protocol/` | 桌面与协作 Server 共享的消息与能力协商（`PROTOCOL_VERSION = 1`，`ProtocolRange { min, max }`，取交集后择最高共同版本） | `docs/architecture.md` L16；`crates/oleafly-collab-protocol/src/capabilities.rs` L4、L9-10、L84-88 |
| `crates/oleafly-collab/` | 实时协作客户端：共享项目文档、同步与评论（基于 Loro CRDT） | `docs/architecture.md` L17；`crates/oleafly-collab/Cargo.toml` → `loro = "=1.16.2"` |
| `crates/oleafly-server/` | 协作 Server，Axum + SQLite（版本 `0.1.1`） | `docs/architecture.md` L18；`crates/oleafly-server/Cargo.toml` |

> **盘点补充项（可核对，非编造）**：inventory.md 的四组分组文字未点名 `oleafly-s3` 与 `oleafly-synctex-wasm` 两个 crate，但两者确实存在于 `crates/` 且各有明确归属 —— `oleafly-s3` 是桌面与 Server 共用的 SigV4 签名实现（`crates/oleafly-s3/Cargo.toml`；使用点 `src-tauri/src/cloud/s3.rs`、`crates/oleafly-server/src/blobs.rs`），`oleafly-synctex-wasm` 是 `oleafly-synctex` 的 WASM 构建产物（`crates/oleafly-synctex-wasm/`）。二者已按职责归入上表相应组别，仅是归类表达，不改变 inventory.md 的四组口径。

#### 2.2 TypeScript 包（17 个，三组）

所有包 `private: true`、`type: module`、`main`/`types`/`exports` 同指 `src/index.ts`。

**（1）编辑与呈现（7 个）**

| 包 | 职责 | 证据 |
|---|---|---|
| `@oleafly/editor` | 与引擎无关的编辑器与语言服务原语（CodeMirror、语言原语、校对、编辑器控制器） | `docs/architecture.md` L31、L164-165 |
| `@oleafly/wysiwyg` | Tiptap schema 与可视编辑节点 | `docs/architecture.md` L32 |
| `@oleafly/preview` | PDF.js 预览器与 SyncTeX 页面控制器（含 `controller` / `mainThreadWorker` / `pdfWorkerRuntime` 子路径） | `docs/architecture.md` L33 |
| `@oleafly/latex` | LaTeX 解析、掩码与源码操作（纯逻辑） | `docs/architecture.md` L34、L166 |
| `@oleafly/latex-intelligence` | 补全用的 LaTeX 命令 / 环境 / 宏包目录 | `docs/architecture.md` L35 |
| `@oleafly/pdf-to-latex` | PDF → LaTeX 转换 | `docs/architecture.md` L36 |
| `@oleafly/diagram` | 与宿主无关的图表 Composer（含 `fletcher` 导入与版本映射） | `docs/architecture.md` L41；`packages/diagram/src/index.ts` |

**（2）契约与注册（5 个）**

| 包 | 职责 | 证据 |
|---|---|---|
| `@oleafly/backend-port`（**BackendPort v7**） | 前端壳与其后端之间的类型化契约：`PROTOCOL_VERSION = 7`，`BACKEND_CAPABILITIES` 共 12 项（`agent-server`、`agent-stream`、`chats`、`checkpoints`、`collab`、`compile`、`git`、`initial-state`、`mcp`、`search`、`synctex`、`templates`） | `packages/backend-port/src/index.ts` L1-16；inventory.md「架构与测试要点·API 资产」 |
| `@oleafly/compile-port` | 桌面与浏览器共用的编译契约：`CompilePort`（`supports` / `compile` / `stop` / `syncTex`）与浏览器内引擎（`packages/compile-port/src/browser.ts`）；`compile-port/testing` 供开发测试用 fake engine | `packages/compile-port/src/port.ts` L42-47；`docs/architecture.md` L45 |
| `@oleafly/registry` | contribution 契约（rail tab、命令、toolset、上下文提供者）；**内部注册表，不是动态第三方插件 SDK** | `docs/architecture.md` L38、L176-177 |
| `@oleafly/i18n-contract` | 支持的 locale、catalog 辅助与 translator 契约（含 `i18n-contract/testing`） | `docs/architecture.md` L46 |
| `@oleafly/search-query` | GitHub 风格检索查询的解析、执行、建议与编辑 | `docs/architecture.md` L39 |

**（3）规则与工具（5 个）**

| 包 | 职责 | 证据 |
|---|---|---|
| `@oleafly/preflight` | 源、PDF、ATS、可访问性与参考文献规则，**不 import 应用 store**（`pdf-extract` 因引入 pdf.js 而单独走子路径导出） | `docs/architecture.md` L40、L167-168；`packages/preflight/src/index.ts` 注释 |
| `@oleafly/conversion-registry` | 转换矩阵背后的导入 / 导出路由（含 `table`、`matrix` 子路径） | `docs/architecture.md` L37 |
| `@oleafly/templates` | 模板画廊契约与宿主集成 | `docs/architecture.md` L42 |
| `@oleafly/ai-core` | provider 与 agent 事件 / 线程项边界 | `docs/architecture.md` L43 |
| `@oleafly/ai-tools` | 工具边界与审批风险规则（`approval-risk` 子路径；默认审批模式 `approve-for-me`） | `docs/architecture.md` L43；`packages/ai-tools/src/approval-risk.ts` |

#### 2.3 数据存储资产

- **Server 侧**：SQLite，schema 18（migration `0001`–`0018`，WAL，4 reader / 64 write group）。证据：`crates/oleafly-server/migrations/`（末位 `0018_web_sessions.sql`）。
- **本地侧五库**：`library.db`（schema 3，`src-tauri/src/library_db.rs` L11）、`catalog.sqlite3`（检查点 format 2，`crates/oleafly-history/src/lib.rs` L15）、`tasks.sqlite3`（research schema 5，`crates/oleafly-research/src/store/mod.rs` L2792）、`literature-cache.sqlite3`（`crates/oleafly-cli/src/commands/cite.rs`）、`sessions.sqlite`（`src-tauri/src/agent/acp_usage.rs`）。

---

### 三、进程与仓库边界

#### 3.1 桌面进程（Tauri 应用）

- 形态：`src-tauri` 编译出的 Tauri 2 应用（crate `oleafly`，lib 名 `oleafly_lib`），Rust 侧承载 IPC 命令、项目沙箱、Git、引擎调度、下载与 secrets。
- 窗口与 webview：**只有主窗口自身的 webview 可调用全部应用命令**；update / preview / presentation / admin console 窗口只拿到各自视图用到的少数命令，**子 webview 一条命令都拿不到**（`src-tauri/src/window_commands.rs` L3-5、L87-113；测试 `a_child_webview_reaches_nothing_even_in_the_main_window` L134-137）。每个窗口另有自己的 Tauri capability 文件限定插件权限（`src-tauri/capabilities/`：`default` / `preview` / `presentation` / `update` / `admin-console`）。
- 对外能力文件：对外的原生打开/保存对话框在 Rust 侧执行（`src-tauri/src/path_grants.rs`），项目外的导入导出**只接受用户在该对话框里选过的路径**（Linux 上另接受刚拖到窗口上的路径）。

#### 3.2 CLI 进程（`oleaflyc`）

- 形态：`crates/oleafly-cli` 产出的二进制 `oleaflyc`（版本 `0.1.0`），命令面覆盖 `build` / `watch` / `open` / `init` / `clean` / `project` / `doctor` / `version` / `help` / `completions` / `man` 等（子命令唯一性由 `crates/oleafly-cli/src/commands/mod.rs` L64-91 的测试守护）。
- 编译适配差异：**桌面在项目沙箱内跑引擎，`oleaflyc` 直接对它被指向的项目目录跑引擎**（`docs/architecture.md` L190-193）。
- 发布形态：独立 `cli-vX.Y.Z` 标签线，7 个 target（`aarch64-apple-darwin`、`x86_64-apple-darwin`、`x86_64-unknown-linux-gnu`、`aarch64-unknown-linux-musl`、`aarch64-unknown-linux-musl`、`x86_64-pc-windows-msvc` 等，见 `.github/workflows/release-cli.yml` L35-53）。macOS 有证书才签名、有凭据才公证；**Windows Authenticode 当前未接线（明确警告）**；CLI JSON 契约在 1.0 前不稳定。

#### 3.3 引擎与语言服务子进程：externalBin 与非 externalBin 的差别

这是本仓一条**必须显式区分**的边界：

| 类别 | 成员 | 分发方式 | 证据 |
|---|---|---|---|
| **externalBin（Tauri sidecar，随包分发）** | `binaries/tectonic`、`binaries/tectonic-biber`、`binaries/pandoc`、`binaries/typst` | 打包进安装包，按 target-triple 后缀命名（如 `tectonic-x86_64-unknown-linux-gnu`），由 Tauri 的 sidecar 机制按当前平台解析 | `src-tauri/tauri.conf.json` L49-54；`scripts/smoke-document-engines.mjs` L14 |
| **非 externalBin（按需下载 / 从资源归档安装）** | TexLab 5.26.0、Tinymist 0.15.8 两个语言服务 | 由 `scripts/language-servers/manifest.json` 单一权威清单驱动：TexLab 走**需用户同意的 app-data 下载**（`runtimeLocation = "app-data"`、`defaultPolicy = "app-data-download"`、`requiresUserConsent = true`、`bundleStatus = "blocked-pending-maintainer-approval"`），Tinymist 走**资源归档**（`runtimeLocation = "app-data-from-resource"`、`defaultPolicy = "resource-archive"`、`bundleStatus = "allowed-with-license-notices"`）。**两者都明确不在 `bundle.externalBin` 中**（`tauri_external_bin` 字段均为 `None`） | `scripts/language-servers/manifest.json`；`scripts/fetch-language-servers.node-tests.mjs` L828-844（断言 `externalBin` 不含 `binaries/texlab` 与 `binaries/tinymist`）；`docs/language-server-toolchain.md` |

- 下载侧的硬约束：清单限制下载主机（`allowed_download_hosts`）与目标三元组白名单；归档上限 128 MiB、二进制上限 256 MiB、归档成员上限 256、重定向上限 5；下载超时 30 分钟、停滞超时 30 秒；安装目录用 `secure_install_directory` 落到 app-data。
- 运行时 profile 是权威的：每个 profile 声明进程参数、初始化选项与可选的 `workspace/didChangeConfiguration` 负载；这些 profile **刻意阻止**文档分析会话顺带产出构建产物（Tinymist 设 `exportPdf = "never"` + `compileStatus = "disable"`，TexLab 设 `build.onSave = false`）。

#### 3.4 协作 Server 进程（`oleafly-server`）

- 形态：`crates/oleafly-server`，Axum + SQLite，版本 `0.1.1`，**独立 `server-vX.Y.Z` 版本线**，不参与桌面标签序列。
- 对外面：HTTP + WebSocket 路由全集在 `crates/oleafly-server/src/routes/`（`auth` / `code_sign_in` / `email_sign_in` / `projects` / `ws` / `poll` / `comments` 相关 / `guests` / `access_log` / `admin` / `console` / `devices` / `outputs` / `meta` / `landing` 等）。
- 浏览器应用是同一 crate 的**可选特性**（`web = ["dep:oleafly-collab", "dep:rust-embed"]`）；构建未开 `web` 特性时启动即告警「浏览器访问保持关闭」（`crates/oleafly-server/src/config.rs` L492-496）。
- 就绪语义：`/healthz` 只表示进程存活，`/readyz` 才可接流量；DB 比程序新时拒绝打开。

#### 3.5 浏览器端与 WASM

- `web/` 是独立前端工程，经 `@oleafly/compile-port` 走同一编译契约：一次请求读全部文本文件，叠加编辑器未发送的改动，再跑 `web/src/compile/engines.ts` 里列出的引擎。
- **生产浏览器没有编译引擎**：`web/src/compile/engines.ts` 仅在 DEV 且 `VITE_OLEAFLY_FAKE_ENGINE=1` 时装载 fake engine，其余返回空数组（浏览器端编译引擎列表为空是现状，不是待实现项）。
- 点击到源在浏览器端跑的是**桌面同一份 Rust 代码**编译出的 WASM：`crates/oleafly-synctex` → `crates/oleafly-synctex-wasm` → `web/src/synctex/oleafly_synctex.wasm`（`web/src/synctex/index.ts` L1-12）。
- 启动预算受 `pnpm check:web-budget` 约束，每个 WebAssembly 模块另有独立体积上限。
- 浏览器端会话安全：30 天 HttpOnly / Secure / Lax cookie；写请求精确校验 Origin + `X-Oleafly-Requested-With`；严格 CSP 禁 framing。浏览器端**只有 WS 重连、无 long-poll 回退**。

#### 3.6 仓库外边界

- 本仓只覆盖上述代码路径；**外部 `Oleafly` / `oleafly-server` 仓库仅作发布分发 adapter，不可据本仓推断其实际状态**（inventory.md「部署资产」行）。
- 外部世界依赖（不归本仓实现、也不可视为本仓保证）：TeX 发行版与 latexmk/Biber、Tectonic 上游与镜像、TinyTeX、Typst 上游、模型 provider 与 CDN、在线 LaTeX 服务、Git 托管平台、Zotero、arXiv、alphaXiv、SMTP、协作 Server 所用数据库与对象存储。

---

### 四、关键数据流

#### 4.1 编译主链路（inventory.md 口径）

```
engine descriptor → 项目索引 → typed IPC → Rust sandbox 引擎
   → 规范化日志 / 诊断 / artifact → PDF.js + SyncTeX
```

- **PDF 不走 base64 JSON**：artifact 走文件路径 / 流式通道返回，前端以 `invoke<ArrayBuffer>("read_compiled_pdf")` 形式读取（`src/lib/tauri.ts` L214）。
- 引擎能力由 `DocumentEngine` 契约声明（源扩展名、格式化 profile、编译策略、SyncTeX / 离线 / 隔离编译能力、转换导出），**UI 不得从文件扩展名推断引擎行为**（`docs/architecture.md` L195-199）。
- 日志解析在 `oleafly-core::parse_latex_log`；桌面编译结束调用一次，返回分组结果 `CompileResult.diagnostics`，日志面板不再对每个流式分块重解析整篇日志；`@oleafly/latex` 的 TS 解析器保留为「后端未发送该字段」时的兜底（`docs/architecture.md` L200-204）。
- Markdown → PDF 走固定 Pandoc 链：`mermaid-figures` → `image-compat` → `markdown-bibliography` filter，再 `--citeproc`，再 `default-fonts`；参数由 `oleafly-core` 的 `markdown_pdf_args` 为两个运行时共同构造。

#### 4.2 增量项目读取（`read_project_sources`）

- 项目源**通过单次 `read_project_sources` 批量调用读取**，而不是每个路径一次 `read_file`。Rust 为每个文件算哈希，**只在哈希与调用方已持有的内容不同时才回传文本**，因此改一处之后的重建只返回一个路径清单而非整个项目。
- 哈希缓存在 `src/lib/project-sources.ts`；批量命令缺失时**回退到逐文件读**（`fallbackReads` 计数可观测）。
- 批量有硬上限：单文件 2 MB（`MAX_SOURCE_FILE_BYTES`）、单批 10 MB（`MAX_SOURCE_BATCH_BYTES`）、单批路径数 20000（`MAX_SOURCE_BATCH_PATHS`），见 `src-tauri/src/project_sources.rs` L7-9。

#### 4.3 `document_stats` 与 `rag_retrieve` 的双实现与 golden 对齐

这两条链路是**同一语义、两种实现、由 golden fixture 锁死**的模式：

| 命令 | Rust 实现 | TS 兜底 | golden fixture |
|---|---|---|---|
| `document_stats` | `src-tauri/src/document_stats.rs` + `crates/oleafly-doctools/src/stats.rs`（掩码与计数都在 Rust 侧做，未保存缓冲随请求带过去，保证数字与屏幕一致） | `src/lib/document-stats.ts`（浏览器模式与「后端无该命令」时的兜底） | `src-tauri/src/fixtures/document-stats/`，Rust 测试 `every_golden_fixture_matches_the_typescript_counter_byte_for_byte`（`crates/oleafly-doctools/src/stats.rs` L4349-4371，fixture 数 ≥ 20） |
| `rag_retrieve` | `src-tauri/src/rag.rs`（在 Rust 侧遍历项目并对每个可索引 chunk 打分，**一条消息只花一次调用**而不是每文件一读；`CHUNK_LINES = 40` / `CHUNK_OVERLAP = 8` / `MAX_FILES = 40` / `MAX_QUERY_TOKENS = 32`） | `src/lib/ai-rag.ts`（命令缺失时仍逐文件读） | `src-tauri/tests/fixtures/rag/golden.json`，由 `src-tauri/tests/fixtures/rag/generate.mjs` 对同一批种子项目与查询生成，两个打分器不一致即让 Rust 测试失败 |

同类模式还出现在 LaTeX unit 解析：`src/lib/project-intelligence/latex-units.ts` 与 `crates/oleafly-core/src/context/units.rs` 实现同一遍扫描，由 `crates/oleafly-core/tests/fixtures/latex-units.json` 约束成同样答案（`docs/architecture.md` L127-130）。

#### 4.4 协作同步数据流

- 文档层：**Loro CRDT**（`loro = "=1.16.2"`），`crates/oleafly-collab/src/doc.rs` 用 `LoroDoc` / `LoroText` / `LoroTree` / `LoroMap`；Loro panic 的文档**留在内存里不 drop**（drop 会 panic 并 abort 进程）。
- 传输层：WebSocket 为主，**桌面端 WS 两次失败后回退 `/frames` + `/poll`**，每分钟重新探测；有 jitter 退避，429/503 busy 长等待，已确认 batch 重启后幂等不重复存储（inventory.md S31 行）。
- 冲突层：文本重叠由 Loro/OT **自动合并**，Merge Review 是**只读**审查（作者 + diff），不是让用户二选一；二进制/路径冲突保留副本并通知。
- 角色权限：Owner / Editor / Reviewer / Commenter / Viewer 五角色，**服务端逐 change 校验**，不只靠 UI（`crates/oleafly-collab-protocol/src/roles.rs` L17-21）。

#### 4.5 MCP 工具流与 renderer 降级

- MCP server **只绑回环地址（127.0.0.1）并要求 bearer 令牌**，bearer 用常量时间比较（`constant_time_eq`），工具调用超时 300 s，renderer 租约 TTL 45 s（`src-tauri/src/mcp/server.rs` L20、L26、L458）。
- 路由规则：`tool_route()` 先看 `crate::mcp::native::handles(name, policy)`（native 能处理就本地跑），否则若 renderer 会话新鲜则**转发给 renderer**，两条路都不通才报错；native 侧按 `READ_ONLY`（6 个只读工具：`read_file`、`list_files`、`search_project`、`list_skills`、`load_skill`、`read_skill_file`）与 `MUTATING`（14 个）分表，`is_mutating` 决定是否走审批（`src-tauri/src/mcp/native.rs` L10-33；`src-tauri/src/mcp/server_request.rs` L108-111、L395-404）。
- **renderer 断开后的降级**：Rust 侧只保留上表 6 个只读工具，写工具不再可用（inventory.md 偏差 D8；文档 mcp.md 的「renderer 断开后仍可写」与实现不符，按实现记录）。
- 请求侧限流：请求体上限 20 MiB、请求体超时 30 s、已认证并发上限 8、待转发调用上限 16。

---

### 五、本地与网络信任边界

#### 5.1 路径与进程校验

- Rust 在**任何文件系统、进程、Git、导出操作之前**先经沙箱解析用户路径：`src-tauri/src/sandbox.rs` 提供 `resolve` / `resolve_readable` / `resolve_in_project` / `resolve_within`。
- 项目外的打开/保存必须落在 `src-tauri/src/path_grants.rs` 授予的路径上（用户用原生对话框选过的路径）。
- shell escape 信任**按目录 + 机器记录，不随 `project.json` 迁移**（inventory.md S07 行）。

#### 5.2 窗口能力边界

- 次级窗口**默认拒绝**：只有主窗口自身 webview 能调全部命令；其他窗口只拿到自己视图用到的命令；子 webview 一条都拿不到；未知窗口一律拿不到（`src-tauri/src/window_commands.rs` L87-113、L184-195）。每个窗口另有独立 capability 文件限制插件权限。

#### 5.3 秘密与凭据

- **connector key 不回读 WebView**：WebView 只能保存或清除某个连接器的 key、查询「是否已保存」（布尔），**读不回明文**（`src-tauri/src/connectors.rs`：`connector_key_saved` / `set_connector_key` / `take_connector_key`，测试 `a_blank_key_is_not_saved_and_a_taken_key_is_gone`）。
- 长期凭据使用**应用管理的加密存储**（`crates/oleafly-secrets`：AES-256-GCM 文件，unix 0600、Windows owner-only ACL；不依赖 OS keychain，因为未签名开发构建每次启动代码身份都变、keychain 每次都要重新授权）。
- 外部连接器 token 只经**匹配 base URL 的 credential helper 与环境变量**传递，不进 argv、URL 或 `.git/config`；remote URL 含密码直接拒绝（inventory.md S49 行）。
- 保存带新 program / arguments / environment 的 stdio MCP server 时，先在原生对话框里征求同意。

#### 5.4 MCP 网络边界

- 仅监听 `127.0.0.1`、强制 bearer、默认关闭、默认每次询问；auto-approve **不含 delete**；内置助手调用外部 MCP 时对参数脱敏并截断（inventory.md S27 行）。

#### 5.5 下载供应链

- 下载的运行时**版本固定 + 校验**：TeX 工具链与 Typst 目录带 `archive_sha256` 与 `binary_sha256`，校验通过才安装；模板包按 sha256 分槽共享下载；安装用**原子替换**（`rename_tree_with_retry` / `persist_with_retry`），失败时回滚到先前目录；`tinytex_archive.rs` 在解包进 staging 之前先校验**精确的已审阅成员清单**（`docs/architecture.md` L310-311；`crates/oleafly-downloads/src/toolchain.rs` L82-105、L105-1065、L1710-1721）。

#### 5.6 模型信任状态

- 模型目录（`src-tauri/resources/ai-models.json`，列目录时从 CDN 刷新）把每个模型标为 **verified / blocked（带原因）/ untested**；**不再过滤掉任何模型**，目录尚未覆盖的模型仍出现在选择器里。
- `agent_run` 在发出第一个请求前**拒绝 blocked 模型**；对 untested 模型，仅当该次 run 声明了工具且其元数据表明不支持工具时才拒绝（chat-only 模式不发工具，放行）。每个模型另标 `trustSource`（`catalog` 或 `probe`），以区分目录判定与用户自己探针的判定。
- `blocked` 必须区分两类：**catalog blocked 一律永拒；probe blocked 可退化为无工具 plain chat**（inventory.md 偏差 D10）。
- 刷新有节流（30 s）与 24 h 自动刷新；失败保留旧列表；hosted probe 30 s / 自托管 120 s；**localhost 与私网一律按自托管策略**（inventory.md S24 行）。

#### 5.7 Server 保密性与代理边界

- **项目内容不是端到端加密**：宿主、磁盘与备份运营者均可读取（capability 明确 `encryption = None`，inventory.md collab 段说明）。
- **只有可信代理才采 `X-Forwarded-For`**：`OLEAFLY_TRUSTED_PROXIES` 列出可信代理网段，且仅在 `OLEAFLY_BEHIND_PROXY = true` 时生效；列表里出现覆盖过宽的网段会在启动时告警，直接写「相信全互联网的 X-Forwarded-For」的条目（如 `0.0.0.0/0`）会被配置校验拒绝（`crates/oleafly-server/src/config.rs` L433-440、L485-491、L1079-1089）。
- 浏览器写请求校验精确 Origin，Origin 不符判为 `cross_site`；会话过期即视为登出；`forbidden` / `not_found` / `removed` / `archived` 结束访问。

#### 5.8 更新与签名的两条独立链

- **OS 安装包签名**与 **updater minisign 签名是两条互不替代的信任链**：前者由平台签名体系担保安装包，后者由内嵌公钥校验更新下载物（`src/lib/updater.ts` L11；`docs/signing.md`、`docs/updates.md`）。
- updater 失败**不改动现有安装**；成功后**无自动 rollback**（新版本有问题只能再发新版修复）；auto-updater 明确为 manual-only，属人工区域。

---

### 六、模块依赖主线

#### 6.1 依赖主线（自上而下）

```
packages/*（17 个纯 TS 包：编辑/契约/规则）
    │  只允许经 BackendPort（@oleafly/backend-port）、CompilePort（@oleafly/compile-port）说话
    ▼
src/（应用壳、store、Tauri 适配器、contribution、UI）
    │  typed Tauri IPC（注册表 src-tauri/src/lib.rs L523-1251）
    ▼
src-tauri/src/（桌面 Rust 宿主：命令、沙箱、Git、引擎、下载、secrets）
    │
    ├──► crates/oleafly-core / history / preflight / lint / doctools / synctex / downloads / s3
    │        （项目与编译共享：桌面与 CLI 复用同一份语义）
    ├──► crates/oleafly-agent / acp / research / sandbox / secrets / forge / online
    │        （Agent 与研究：provider 中立、隔离执行、加密存储、Git 托管与在线服务）
    ├──► crates/oleafly-collab-protocol → crates/oleafly-collab → crates/oleafly-server
    │        （协议 v1 协商 → 客户端同步 → Server HTTP/WS）
    └──► crates/oleafly-cli（oleaflyc：同一批共享 crate 的另一进程入口）
             │
             └──► crates/oleafly-synctex-wasm → web/（浏览器端跑桌面同一份 SyncTeX 代码）
```

#### 6.2 三个关键依赖方向（不可逆）

| 方向 | 约束 | 证据 |
|---|---|---|
| 包 → 应用 | **单向**：包不得 import Zustand store、Tauri API 或 `@/` 应用模块；宿主适配器只建在 `src/` | `docs/architecture.md` L185-188 |
| 共享 crate → 桌面 | **共享 crate 不依赖 Tauri**：`oleafly-forge` 明确无 Tauri 依赖以便 CLI 复用；`oleafly-synctex` 明确不做文件访问以便桌面 / CLI / 浏览器三方共用 | `docs/architecture.md` L15、L27 |
| 引擎执行 → 沙箱 | 桌面在项目沙箱内跑引擎，`oleaflyc` 直接对被指向的项目目录跑；**普通终端有所有权与进程树 containment，但不等于 Research 级 OS sandbox**，两者不可混称 | `docs/architecture.md` L190-193；inventory.md S15 行 |

#### 6.3 模块与架构组件的对应

| 模块 | 主要架构组件 |
|---|---|
| core | `@oleafly/editor`、`@oleafly/wysiwyg`、`@oleafly/preview`、`@oleafly/latex`、`@oleafly/preflight`、`@oleafly/conversion-registry`、`@oleafly/templates`；`oleafly-core`、`oleafly-history`、`oleafly-doctools`、`oleafly-synctex`、`oleafly-lint`、`oleafly-downloads`；`src-tauri` 沙箱与引擎 |
| research | `oleafly-research`（文献与引用工具）、`oleafly-doctools`（Pandoc 导出）、`@oleafly/pdf-to-latex` |
| ai | `oleafly-agent`、`oleafly-acp`、`oleafly-research`（任务执行）、`oleafly-sandbox`、`oleafly-secrets`、`@oleafly/ai-core`、`@oleafly/ai-tools`；桌面侧 `ai_model_registry.rs` / `agent_probe_model` |
| collab | `oleafly-collab-protocol`、`oleafly-collab`、`oleafly-server`（含可选 `web` 特性的浏览器应用） |
| sync | `oleafly-online`（在线 LaTeX 服务与 Git 桥）、`oleafly-forge`（Git 托管账号与 token）、`oleafly-s3`（SigV4 签名） |
| delivery | `crates/oleafly-server`（Server 部署）、`crates/oleafly-cli`（CLI 独立分发）、桌面 updater 与签名链、CI 与 E2E 体系 |

#### 6.4 基线已知边界（架构层，需在后续变更中显式处理）

- **文档与实现存在至少 12 处语义偏差（D1-D12）**，本文件按实现记录；其中与架构相关的有 D8（MCP native 写能力）、D10（blocked 模型文案）、D11（CLI 独立包已存在）、D12（README 离线冲突概括）。偏差明细见 inventory.md「文档/实现偏差清单」。
- **E2E 明确的人工区域**：OS 原生拖放、auto-updater、真实 AI 端到端；三者不在自动化 E2E 内验证。
- **生产浏览器无编译引擎**；fake engine 仅开发测试可用。
- **Linux 大文档编译**是 CI 中记录的开放问题。
- **外部 `Oleafly` / `oleafly-server` 仓库状态不可推断**。
- 本基线为**静态盘点**：`npm test` 失败根因是 node_modules 未装（vitest 已声明于 devDependencies），正确流程为 `corepack enable && pnpm install --frozen-lockfile && pnpm test`；`logos.config.json` 的 `verify.pre_run_command` 仍为 `npm test`，与本仓 pnpm workspace 不符，需在 verify 前修正（另立小变更或人工修正）。
