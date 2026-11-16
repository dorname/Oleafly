## Oleafly 工程交付（delivery）功能规格（现状基线）

> module: delivery | 基线口径：桌面 `0.4.11`，Server crate `0.1.1`，CLI crate `0.1.0`，绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）
> 本规格为存量产品现状基线：只描述已实现的工程交付链路，不新增任何功能或流程；全部事实仅来自提案 `inventory.md`（delivery 段 S50-S52 与架构/部署要点）与需求文档 `delivery-01-requirements.md`。本次为只读静态盘点，未执行任何发布、升级或部署动作，发布工作流、updater、migration、备份恢复的动态行为均在各场景「能力与限制」中声明，verify / 部署阶段单独取证。

### 三条发布线互不抢占（口径声明）

**desktop / Server / CLI 是三条独立的版本线，互不覆盖渠道。**

- 桌面（desktop）：`0.4.11`，发布产物走 draft release，**latest 更新通道只归属桌面发布**，是唯一驱动客户端自动更新的发布线。
- 协作 Server（server-v）：crate `0.1.1`，独立发布，**不得抢占 desktop 的 latest 更新通道**；部署侧以安装器 / Compose / systemd / Render 四条路径分发。
- CLI：crate `0.1.0`，独立发布线（`release-cli.yml`），与桌面应用解耦分发。
- 三条线各自触发、各自 draft、各自手动 Publish；任何一条线的发布不得改写另一条线的更新渠道。外部 `Oleafly` / `oleafly-server` 仓库仅作发布分发 adapter，不可据此推断其实际状态。

---

### S50: 桌面发布与自动更新

#### 功能入口与表面

- **发布触发方式**：发布 tag 或手动触发发布工作流（`release.yml`，证据：`release.yml` L14-872；流程文档 `docs/releasing.md` L5-90）。
- **审阅表面**：draft release 汇集全平台安装包、latest.json、SBOM 与 attestation，供发布维护者审阅后手动 Publish。
- **安装渠道**：draft release 中的三平台安装包（CI 覆盖 NSIS/MSI 等安装包构建），Publish 后成为正式分发渠道；已安装客户端经 updater 按 latest.json 升级（证据：`docs/updates.md` L18-108、`docs/signing.md` L3-82）。

#### 关键交互

1. 发布维护者打 tag 或手动触发发布工作流（`release.yml`）。
2. 工作流以 draft release 形式汇集全平台资产、latest.json、SBOM 与 attestation。
3. 维护者人工审阅 draft：资产与 attestation 齐备则手动 Publish，缺资产或 attestation 则保持 draft 不发布（draft 门禁）。
4. 已安装客户端检测到新版本，updater 按 latest.json 下载更新并校验 minisign 签名。
5. 验签通过后完成升级；验签或下载失败时升级中断，现有安装保持不变。

#### 能力与限制

- **draft 门禁**：缺资产或 attestation 的 release 保持 draft，不产生不完整正式版本（证据：`docs/releasing.md` L5-90）。
- **updater 失败语义**：升级失败不改现有安装；升级成功后**无自动 rollback**——新版本有问题只能再发新版本修复（证据：`docs/updates.md` L18-108）。
- **两条签名链**：OS 安装包签名与 updater minisign 签名是两条独立信任链，各自校验（证据：`docs/signing.md` L3-82）。
- **升级路径前提**：首个发布只建 baseline，需存在两个版本后才有真实升级路径。
- **人工测试区域**：auto-updater 明确为 manual-only，不在自动化 E2E 中验证（与 OS 原生拖放、真实 AI 端到端并列的 CI 已知人工区域）。
- **现状声明**：本次未实际触发发布或升级；发布工作流与 updater 行为均基于工作流定义与文档的静态证据，verify 阶段单独取证。

#### 关联需求

- S50 ← P01（跨平台发布流程繁琐易错）：一次触发产出全平台可验证资产，draft 门禁拦截不完整版本。
- S50 ← P02（更新分发信任链不清）：minisign 验签升级，OS 签名与更新签名两条链明确分离。

---

### S51: Server 部署与运维恢复

#### 功能入口与表面

- **部署触发方式**：运维者按四条路径之一部署协作 Server——安装器 / Docker Compose / systemd / Render 模板（证据：`deploy/server/*`，含 compose / Caddyfile / `.env.example` / `oleafly-server.service` / `smoke-test.sh` / `install.sh`；`release-server.yml` L3-697；`Dockerfile` L31-89）。
- **安装渠道**：安装器提供 SHA256 校验；Server 独立发布线（server-v）经自己的发布工作流出产物。
- **运维表面**：setup code 首个 admin 初始化、`/healthz` 与 `/readyz` 健康探测端点、migration 升级路径、`smoke-test.sh` 备份恢复演练入口（证据：`collaboration-server.md` L1147-1155）。

#### 关键交互

1. 运维者以安装器 / Compose / systemd / Render 之一完成部署；走安装器渠道时经 SHA256 校验产物。
2. 服务启动后，用 setup code 完成首个 admin 初始化，服务开始提供协作能力。
3. 接流量前分别探测 `/healthz` 与 `/readyz`：`/healthz` 只确认进程存活，`/readyz` 通过才可将流量接入。
4. 升级版本时，新版本 Server 对旧 schema 数据库（migration 0001-0018 链）逐个执行 migration（每步事务 + FK check）；重启后 server_id 持久不变。
5. 按部署资产（`smoke-test.sh` 等）做备份恢复演练；如需从异常状态恢复，走备份恢复流程而非降级启动。

#### 能力与限制

- **健康检查语义**：`/healthz` 只表示进程存活，**不得以 `/healthz` 作为接流量依据**，仅 `/readyz` 通过才可接流量。
- **DB 比程序新**：数据库 schema 比当前二进制更新时（如误用旧版本二进制启动），Server 拒绝打开数据库，不静默运行。
- **migration 约束**：逐个 migration 以事务执行并做 FK check；重启后 server_id 持久。
- **回滚边界**：新 migration 已应用后，旧二进制不能简单回滚新 DB（明确边界）。
- **渠道隔离**：server-v 独立发布不得抢占 desktop 的 latest 更新通道。
- **部署资产基线**：Dockerfile（distroless，端口 10001/8080，healthcheck）、Compose + Caddy 2.11.7、Litestream 可选、systemd 硬化、Render 模板、安装器（SHA256 校验）、`smoke-test.sh`。
- **现状声明**：本次未实际部署或执行 migration / 恢复演练；备份的 fs/S3 具体语义属 collab 模块，本模块只约束部署侧的演练入口。动态行为在 verify / 部署阶段单独取证。

#### 关联需求

- S51 ← P03（自托管部署与运维门槛高）：多路径部署、健康语义明确（/readyz 才接流量）、事务化 migration 与可演练的备份恢复，避免误判健康与破坏性回滚。

---

### S52: CLI 独立发布分发（简要）

#### 功能入口与表面

- **发布触发方式**：`cli-vX.Y.Z` 标签触发独立 CLI 发布工作流（`release-cli.yml`，证据：`release-cli.yml` L142-197）。
- **审阅表面**：draft release 汇集 7 个 target 构建产物，经冒烟验证后手动 Publish。
- **安装渠道**：Publish 后的 7 个 target 产物独立分发，不依赖桌面应用安装（CLI 独立版本线）。注意：`docs/development.md` 曾表述 "no standalone package yet"（原偏差 D11），已由 fix-doc-deviations 对齐为 `release-cli.yml` 工作流现状，基线以实现为准。

#### 关键交互

1. 维护者打 `cli-vX.Y.Z` 标签触发 CLI 发布工作流。
2. 工作流对 7 个 target 逐一构建产物。
3. 对产物运行 version / help / JSON / doctor 冒烟验证。
4. 产物进入 draft release，维护者人工审阅后手动 Publish。

#### 能力与限制

- **macOS 签名公证条件**：有证书才签名、有凭据才公证；条件不满足时如实产出，不伪装已签名。
- **Windows Authenticode 当前未接线**（明确警告项），不声称 Windows 签名。
- **CLI JSON 输出在 1.0 前不稳定**（明确边界），不得宣传为稳定契约。
- **文档偏差 D11（已回补）**：`development.md` 曾表述 "no standalone package yet"，已由 fix-doc-deviations 对齐，以工作流实现为准。
- **现状声明**：本次未实际触发 CLI 发布；工作流行为基于 `release-cli.yml` 静态证据，verify 阶段单独取证。

#### 关联需求

- S52 ← P04（多端版本线混淆）：CLI 独立版本线与 desktop / Server 互不抢占渠道，产物经冒烟验证后分发，避免渠道与版本混乱。

## UI 表面清单（现状清单，非原型）

> 以下表面由 inventory.md 证据文件与需求文档主路径推得，仅列现状存在的表面，不设计新交互。

| 表面 | 所属模块 | 关联场景 | 主要入口 / 证据 |
|---|---|---|---|
| 桌面客户端更新入口（About/菜单更新入口：检查新版本，updater 按 latest.json 验签升级） | delivery | S50 | 已安装客户端 updater 路径；`docs/updates.md` L18-108、`docs/signing.md` L3-82 |
| draft release 审阅与手动 Publish（全平台资产 + latest.json + SBOM + attestation） | delivery | S50、S52 | 发布维护者审阅路径；`docs/releasing.md` L5-90、`release.yml` L14-872、`release-cli.yml` L142-197 |
| Server 安装器（SHA256 校验）与四路径部署资产（Compose / systemd / Render） | delivery | S51 | 安装器 / 部署路径；`deploy/server/install.sh`、`deploy/server/*`（compose、Caddyfile、`.env.example`、`oleafly-server.service`、`smoke-test.sh`）、`Dockerfile` L31-89、`release-server.yml` L3-697 |
| Server 初始化与健康探测（setup code 初始化首个 admin；/healthz 与 /readyz） | delivery | S51 | 部署后初始化与接流量判定；`collaboration-server.md` L1147-1155、`Dockerfile` healthcheck |
| CLI 安装（7 个 target 产物独立分发，version/help/JSON/doctor 冒烟后 Publish） | delivery | S52 | `cli-vX.Y.Z` 标签触发分发；`release-cli.yml` L142-197（原偏差 D11，docs/development.md 已对齐） |
