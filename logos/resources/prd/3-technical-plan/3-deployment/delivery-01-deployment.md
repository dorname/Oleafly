## Oleafly 部署方案（现状基线）

> **基线口径**：桌面 `0.4.11`，Server crate `0.1.1`，CLI crate `0.1.0`；绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）。
> **口径声明（强制）**：本文件是**只读静态盘点**产物。本次基线**未实际执行任何部署、发布、安装、升级或回滚动作**，也未运行 `deploy/server/smoke-test.sh`、未构建任何镜像、未触发任何发布工作流。文中所有「覆盖」「检查」「门禁」「断言」均描述**已存在于仓库中的脚本/工作流/配置所定义的静态行为**，**不代表任何动态验证通过**。verify 阶段取证前，测试结果只能声明「未执行 / 环境未装依赖」。
> **事实来源**：提案 `inventory.md` 的 delivery 段（S50-S52）、「架构与测试要点 → 部署资产」行与 S51 行；同目录 `deltas/prd/1-product-requirements/delivery-01-requirements.md` 与 `deltas/prd/2-product-design/1-feature-specs/delivery-01-feature-specs.md` 的 delivery 章节。文中括注的仓库路径为盘点时的证据指针。
> **本文性质**：存量部署现状基线。只记录已存在的发布线、部署拓扑、安装器与运维约束，不新增流程、不发明实现细节、不承诺未验证的运行时行为。

---

### 一、三条发布线（互不抢占更新渠道）

Oleafly 有 **desktop / Server / CLI 三条彼此独立的版本线**。三者各自触发、各自产出 draft、各自手动 Publish，**任何一条线的发布不得改写另一条线的更新渠道**。

#### 1.1 桌面发布线（desktop，`0.4.11`）

- **触发**：打发布 tag 或手动触发发布工作流（`.github/workflows/release.yml`）。
- **draft 门禁**：发布工作流把本次构建的产物汇总成 **draft release**，资产与 attestation 未齐备时**保持 draft，不 Publish**，因此不会产生一个不完整的正式版本。人工审阅后才手动 Publish。
- **发布资产构成**（发布产物至少包含以下几类）：

  | 资产类别 | 内容 | 说明 |
  |---|---|---|
  | 安装包 | 各目标平台的桌面安装包 | CI 覆盖 NSIS / MSI 等安装包构建 |
  | updater 分片 | 每个 rust target 各自产出 `latest.json` 片段（updater-fragment-`<target>`） | 各 target 并行产出，先分片后合并 |
  | 更新清单 | 合并后的规范化 `latest.json` | **updater feed**；只有 Publish 才写入，客户端按它升级 |
  | SBOM | 每个 target 一份 SPDX JSON（`Oleafly-<version>-<target>.spdx.json`） | 与 provenance 主体对齐后上传 |
  | attestation | 每个 target 的构建/来源证明 | 缺失则不得 Publish |

- **升级语义**：已安装客户端按 `latest.json` 下载更新并校验 updater minisign 签名；**updater 失败不改现有安装**，成功后**无自动 rollback**（新版本有问题只能再发新版修复）。
- **两条签名链**：OS 安装包签名与 updater minisign 签名是两条独立信任链，不能互相替代。
- **人工区域**：auto-updater 明确为 **manual-only**，不在自动化 E2E 内验证。

#### 1.2 Server 发布线（`server-vX.Y.Z`，独立发布）

- **独立版本号空间**：Server 使用 `server-vX.Y.Z` 形式标签（如 `server-v0.1.0`）独立发布，**不参与桌面 `vX.Y.Z` 标签序列**。
- **双架构镜像**：镜像同时构建 `linux/amd64` 与 `linux/arm64`，发布后**两个平台各跑一遍镜像 smoke**。
- **静态二进制**：同时产出 x86-64 与 ARM Linux 的**单一静态链接**可执行程序；工作流检查其确实为 statically linked / static-pie linked，不合格即报错。
- **校验清单**：发布附带 `SHA256SUMS`，覆盖 `*.tar.gz` 与 `install.sh`、`docker-compose.yml`、`Caddyfile`、`env.example`、`litestream.yml`；**每个下载都可用 SHA256SUMS 校验**。
- **不得抢占 desktop latest**：Server 发布后，工作流有一个专门的 `desktop-latest` 作业把 **latest 标签还给最新的桌面正式版**（已发布、非预发布、且带 `latest.json` 的版本）。原因是 web 表单默认勾选「Set as the latest release」，Server release 一旦占用该标签，**所有已安装桌面端就再也看不到更新**。若找不到可接管的桌面版，该作业**报错失败**而非静默通过。

#### 1.3 CLI 发布线（`cli-vX.Y.Z`，独立发布）

- **独立标签**：`cli-vX.Y.Z` 工作流，与桌面应用解耦分发。
- **七个构建 target**：

  | # | target | 平台 |
  |---|---|---|
  | 1 | `aarch64-apple-darwin` | macOS arm64 |
  | 2 | `x86_64-apple-darwin` | macOS Intel |
  | 3 | `x86_64-unknown-linux-gnu` | Linux x64 (glibc) |
  | 4 | `aarch64-unknown-linux-gnu` | Linux arm64 (glibc) |
  | 5 | `x86_64-unknown-linux-musl` | Linux x64 (musl) |
  | 6 | `aarch64-unknown-linux-musl` | Linux arm64 (musl) |
  | 7 | `x86_64-pc-windows-msvc` | Windows x64 |

- **每个 target 的 smoke**：依次执行 `version`（核对输出与 tag 版本一致，不一致即失败）、`help`（`help exit-codes`）、`--json version`（JSON 输出）、`--json doctor`（doctor 允许退出码 `0`（全部找到）与 `4`（缺件），**其余退出码视为崩溃并失败**）。
- **macOS 签名与公证**：**有 Apple 证书才签名**——缺 `APPLE_CERTIFICATE` / `APPLE_SIGNING_IDENTITY` 时打 warning 并交付**未签名**二进制；**有公证凭据才公证**——缺 `APPLE_ID` / `APPLE_PASSWORD` / `APPLE_TEAM_ID` 时只签名不公证并打 warning。
- **Windows Authenticode 未接线**：Windows 步骤在检测到 Azure 签名端点缺失时打 warning 并交付未签名二进制；**即使端点存在，工作流也只打印「Windows Authenticode signing for the CLI is not wired up yet」的明确警告**，不执行实际签名。这是**已知能力缺口**，基线不得写成「Windows 已签名」。
- **CLI JSON 输出在 1.0 前不稳定**，不应作为稳定契约承诺。

---

### 二、Server 部署拓扑

Server 面向**自托管**场景，提供镜像 / Compose / systemd / Render 四条部署路径。

#### 2.1 容器镜像（`crates/oleafly-server/Dockerfile`）

| 维度 | 现状 |
|---|---|
| 运行时基础镜像 | **distroless**（`gcr.io/distroless/static-debian13`，按 digest 钉住），`scratch` 中间层导出静态二进制 |
| 构建阶段 | `tonistiigi/xx` 跨架构工具链 + Rust / Node 多阶段构建；SyncTeX 交叉编译为 WebAssembly 供浏览器端使用 |
| 静态性校验 | 构建阶段用 `xx-verify --static` 校验二进制确为静态链接 |
| 运行用户 | **非 root，UID/GID `10001:10001`** |
| 数据目录 | `/data`，以 `chown=10001:10001`、`chmod=0700` 拷入并声明为 `VOLUME` |
| 监听地址 | `OLEAFLY_BIND=0.0.0.0:8080`，`EXPOSE 8080` |
| 健康检查 | `HEALTHCHECK`（interval 30s / timeout 5s / start-period 30s / start-interval 2s / retries 3），命令为 `oleafly-server healthcheck` |
| 入口 | `ENTRYPOINT ["/usr/local/bin/oleafly-server"]` |

#### 2.2 Docker Compose + Caddy（`deploy/server/docker-compose.yml` / `Caddyfile`）

- **服务构成**：`oleafly-server`（后端）+ `caddy`（TLS 反向代理）+ `litestream`（可选，见 2.3）。
- **后端服务**：镜像 `ghcr.io/oleafly/oleafly-server`，`restart: unless-stopped`，从 `.env` 读配置，强制 `OLEAFLY_PUBLIC_URL=https://${OLEAFLY_DOMAIN}`（**未设 `OLEAFLY_DOMAIN` 时 Compose 直接报错**）、`OLEAFLY_BIND=0.0.0.0:8080`、`OLEAFLY_DATA_DIR=/data`、`OLEAFLY_BEHIND_PROXY=true`；数据落在命名卷 `oleafly-data:/data`。
- **Caddy**：`caddy:2.11.7`，`depends_on: oleafly-server`；宿主端口 **80:80、443:443、443:443/udp**；`Caddyfile` 以只读方式挂载，内容为按 `{$OLEAFLY_DOMAIN}` 站点的 `reverse_proxy oleafly-server:8080`；证书与配置分别落在 `caddy-data` / `caddy-config` 卷。
- **IPv6**：默认网络 `enable_ipv6` 由 `.env` 的 `OLEAFLY_IPV6` 决定，默认 `false`。
- **其它变体**：仓库同时提供 `docker-compose.build.yml`（本地源码构建）与 `docker-compose.coolify.yml` / `docker-compose.coolify-image.yml`（Coolify 部署变体）。

#### 2.3 Litestream（可选 profile）

- **默认不启动**：`litestream` 服务带 `profiles: [litestream]`，**只有显式启用该 profile 才运行**。
- **运行形态**：`litestream/litestream:0.5.17`，以 `user: "10001:10001"` 运行，`depends_on: oleafly-server: condition: service_healthy`（**等后端健康后才开始复制**）；命令 `replicate -config /etc/litestream.yml`；以只读方式挂载 `deploy/server/litestream.yml`。
- **复制范围**：`litestream.yml` 只复制 `/data/oleafly-server.sqlite3` 一个数据库到 S3 兼容存储（`type: s3`，url/endpoint/region 由环境变量注入），快照间隔 `24h`、保留 `168h`。
- **边界**：Litestream **只复制 SQLite 数据库**，**不替代 S3 对象存储中文件本身的备份**（对象存储由 `OLEAFLY_BLOB_STORE` 侧的备份策略承担）。

#### 2.4 systemd 硬化（`deploy/server/oleafly-server.service`）

以 systemd 部署二进制（非容器）时使用该 unit：

| 加固项 | 取值 |
|---|---|
| 运行身份 | `DynamicUser=yes`（动态分配非特权用户，无固定 UID） |
| 状态目录 | `StateDirectory=oleafly-server`，`StateDirectoryMode=0700`，`Environment=OLEAFLY_DATA_DIR=/var/lib/oleafly-server` |
| 文件描述符 | `LimitNOFILE=65536`（长连接与数据库文件需要） |
| 权限提升 | `NoNewPrivileges=yes`；`CapabilityBoundingSet=` 与 `AmbientCapabilities=` 均置空 |
| 文件系统 | `ProtectSystem=strict`、`ProtectHome=yes`、`PrivateTmp=yes`、`PrivateDevices=yes` |
| 内核面 | `ProtectKernelTunables/Modules/Logs/ControlGroups=yes`、`ProtectClock=yes`、`ProtectHostname=yes`、`ProtectProc=invisible` |
| 系统调用 | `SystemCallFilter=@system-service` 并排除 `~@privileged @resources`，违规返回 `EPERM`；`SystemCallArchitectures=native` |
| 其他 | `MemoryDenyWriteExecute=yes`、`LockPersonality=yes`、`RestrictNamespaces=yes`、`RestrictRealtime=yes`、`RestrictSUIDSGID=yes`、`RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX` |
| 重启策略 | `Restart=on-failure`，`RestartSec=5` |

#### 2.5 Render 模板（`render.yaml`）

托管形态的单服务模板：`type: web` / `runtime: image` / 镜像 `ghcr.io/oleafly/oleafly-server`；**健康检查路径为 `/readyz`**（不是 `/healthz`）；`plan: 0.5c-512mb`；持久盘 `oleafly-data` 挂在 `/data`（1GB）；环境变量含 `PORT=8080`、`OLEAFLY_BIND=0.0.0.0:8080`、`OLEAFLY_DATA_DIR=/data`、`OLEAFLY_BEHIND_PROXY=true`、`OLEAFLY_PUBLIC_URL` 取自 Render 的 `RENDER_EXTERNAL_URL`，以及 `OLEAFLY_OPEN_SIGNUP=false` 等配额与开关项（GitHub / OIDC 凭据由运维自行填写）。

---

### 三、安装器与校验（`deploy/server/install.sh`）

#### 3.1 安装器命令与入口

- **入口**：`curl -fsSL https://oleafly.com/server/install.sh | sudo sh`。
- **子命令**：`install`（默认，装机或修复）、`update`（取新版文件与镜像，保留 `.env`，版本变化时先备份数据）、`status`（显示运行状态、HTTPS 可达性与 setup code）、`uninstall`（停并删容器，数据默认保留）。
- **选项**：`-y/--yes`（非交互，从环境变量或 `OLEAFLY_ANSWERS_FILE` 读设置）、`--version`、`--help`。
- **平台前置**：仅 Linux（x86-64 / aarch64）；**WSL 被明确拒绝**（会随 Windows 休眠且外部不可达）；要求 `curl awk sed od tr mktemp sha256sum install printenv`；要求 IPv4 连通性。

#### 3.2 下载来源与校验

- **下载来源**：默认从 **`Oleafly/oleafly-server` 仓库的 release** 取文件——未发布版安装器取 `releases/latest/download`，已发布版取 `releases/download/server-v<version>`；可用 `OLEAFLY_RELEASE_URL`（必须是 `https://` 或 `file://`）改写来源。
- **下载文件集**：`SHA256SUMS` + `install.sh`、`docker-compose.yml`、`Caddyfile`、`env.example`、`litestream.yml`。
- **传输约束**：走 `curl` 时强制 `--proto '=https' --proto-redir '=https' --tlsv1.2`，并带重试与连接超时。
- **SHA256 校验**：逐个文件与 `SHA256SUMS` 中的期望摘要比对；**`SHA256SUMS` 缺少某文件的行即中止**（不做「无校验放行」）；摘要不符即中止并明确告知「未改动任何东西」。
- **Docker 安装脚本同样校验**：安装器要代装 Docker 时，下载的 `get-docker.sh` 先按**固定 commit + 固定 SHA256** 校验，不符则拒绝执行；Compose 插件下载也按 x86-64 / aarch64 各自的 SHA256 校验。

#### 3.3 暂存替换（避免半截安装）

- **先暂存再落位**：所有发布文件先复制到 `$dir/.release-incoming`（`0700`）中，**全部就位后**才逐个 `mv -f` 到安装目录（`docker-compose.yml`、`Caddyfile`、`litestream.yml`、`install.sh`、`.env.example`）。这样磁盘写满也不会留下**截断的 `docker-compose.yml`**，也不会出现**两个版本文件混放**。
- **失败恢复**：落位过程中失败则删除暂存目录；若部分文件已替换，则用 `*.previous` 副本回滚，并尽力把旧服务重新拉起。
- **配置保留**：`update` 保留 `.env`；写 `.env` 时以 `install -m 600 -o 0 -g 0` 写入（**仅 root 可读**），若安装期间 `.env` 已被他人创建则中止且不改动。
- **降级拦截**：安装器会读出已装版本与目标版本比较，**已装版本更新时拒绝覆盖**（提示改用 `update`）。

---

### 四、运维 smoke（`deploy/server/smoke-test.sh`）

该脚本面向**镜像**做发布前检查，**静态定义了下列断言项**（本次基线**未实际运行**）：

| # | 检查项 | 断言 |
|---|---|---|
| 1 | **非 root 运行** | 镜像 `Config.User` 的 UID 不为空且不为 `0`/`root` |
| 2 | **HEALTHCHECK 存在** | 镜像配置中 `Healthcheck` 不为 `null` |
| 3 | **镜像内无 shell** | 以 `/bin/sh` 为入口执行必须失败 |
| 4 | **解包体积预算** | 导出 rootfs 后按 `MAX_IMAGE_MB`（默认 **40 MB**）判定，超预算即失败 |
| 5 | **泄漏检查** | 文件清单中不得出现 `.rs`、`Cargo.toml` / `Cargo.lock`、`.private`、`.env`、`.git/`、`src/` 下的源码文件 |
| 6 | **二进制本地路径泄漏** | 可执行文件中不得嵌入 `/Users/...` 或 `/home/...` 路径（`/home/web_user` 除外） |
| 7 | **版本输出** | `--version` 输出以 `oleafly-server ` 开头 |
| 8 | **无登录方式时拒绝启动** | 未配置 GitHub 与 OpenID Connect 时，容器应以**退出码 2** 退出，且日志含 `No sign-in method is set up` |
| 9 | **健康与就绪探针** | `/healthz` 返回 `{"status":"ok"}`；`/readyz` 返回 `{"status":"ready"}` |
| 10 | **清单与 setup code** | `/.well-known/oleafly-server` 含 `server_id`，且全新实例 `needs_setup` 为 `true`；容器日志含 `Setup code: ` 行 |
| 11 | **进程身份** | 容器内服务进程实际运行的 UID 与镜像 `User` 一致 |
| 12 | **重启后 server_id 持久** | `docker restart` 之后 `/.well-known/oleafly-server` 的 `server_id` **与重启前一致**（数据卷持久化验证） |

> 另有 `deploy/server/tests/` 下的安装器 E2E、清理 E2E 与发布工作流测试脚本，作为部署资产的配套测试入口。

---

### 五、升级与回滚约束

以下均为**不可绕过的语义约束**，运维方案与文档不得与之冲突：

1. **数据库版本比程序新时拒绝打开**。若数据文件由更新版本的程序写入（migration 已推进到更高版本），旧程序**拒绝打开该数据库**，而不是降级读取。
2. **migration 逐个事务化并做外键检查**。每个 migration 独立事务执行，避免半迁移状态；迁移后做 FK 校验。
3. **旧二进制不能简单回滚新 DB**。已应用新 migration 的数据库无法被旧二进制直接接管；回滚必须**同时回滚数据**——安装器 `update` 在版本变化时**先停服并把数据卷整包备份**（`oleafly-data-<时间戳>.tar.gz`），并输出配套的恢复命令（清空数据卷后从备份解包 + 还原 `*.previous` 配置文件）。
4. **`/healthz` 与 `/readyz` 语义不同，不可混用**：
   - `/healthz` **只表示进程存活**（`{"status":"ok"}`）；
   - `/readyz` 才表示**可以接入流量**（`{"status":"ready"}`）。
   - 负载均衡 / 平台健康检查（Render 模板）必须指向 **`/readyz`**；用 `/healthz` 当就绪探针会在数据库不可用时仍放行流量。
5. **无自动 rollback**。桌面更新与 Server 更新**都没有自动回滚机制**：updater 失败只是「保持现有安装不变」；Server 更新失败则由安装器走「恢复旧文件 + 恢复旧数据 + 重新拉起」的人工路径，并**打印出可照抄的回滚命令**。
6. **setup code 每次启动重新生成**，直到有人完成 setup；完成 setup 后该 code 失效（同一 code 先到先得，成为 server admin）。

---

### 六、外部仓库边界

- 外部仓库 **`Oleafly/oleafly-server`** 在本方案中**仅作发布分发 adapter**：
  - 安装器与 `https://oleafly.com/server/install.sh` **从该仓库的 release 下载**发布文件（`install.sh`、`docker-compose.yml`、`Caddyfile`、`env.example`、`litestream.yml`、`SHA256SUMS`）；
  - Server 发布工作流在发布完成后触发该仓库的 `sync-release.yml`，把同一 `server-v*` tag 的 release **复制过去**，并等待其 `SHA256SUMS` 可下载后再判定同步成功（该仓库的每日复制作为兜底）。
- **边界声明**：该仓库的**实际 workflow 内容、镜像 digest、生产实例状态、是否与本仓库描述一致，均不在本仓库的可证范围内**。本基线只声明「发布产物会被复制到那里、安装器从那里下载」这一**接线关系**，**不得据此推断外部仓库的运行状态或任何未经本仓库验证的结论**。复制失败时工作流**报错并给出人工复制命令**，不静默降级。

---

### 七、基线未决与需在 verify / 部署阶段取证的事项

- 本文件所有行为均为**静态定义**，`deploy/server/smoke-test.sh`、安装器 E2E、发布工作流均**未在本次基线中执行**；verify 阶段须单独取证，**不得预填 PASS**。
- 外部仓库 `Oleafly/oleafly-server` 的同步与生产状态**超出本仓库可证范围**，如需结论须在外部仓库单独取证。
- Windows Authenticode 签名（CLI）是**已知未接线缺口**，不是待补的偶发问题；Windows 二进制目前为未签名交付。
- 桌面 auto-updater 属**人工测试区域**，无自动化 E2E 背书。
