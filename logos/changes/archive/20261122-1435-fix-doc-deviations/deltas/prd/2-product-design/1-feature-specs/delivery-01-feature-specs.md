<!-- fix-doc-deviations: D11 标注转终态 -->
<!-- 「#### 功能入口与表面」「#### 能力与限制」等小节标题在本文件内多处重复，故 S52 两处修改合并为所属场景 ### 标题的块（标题与主文档逐字一致）；块内仅偏差标注句变化，其余逐字保留 -->
## MODIFIED — S52: CLI 独立发布分发（简要）

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

## MODIFIED — UI 表面清单（现状清单，非原型）

> 以下表面由 inventory.md 证据文件与需求文档主路径推得，仅列现状存在的表面，不设计新交互。

| 表面 | 所属模块 | 关联场景 | 主要入口 / 证据 |
|---|---|---|---|
| 桌面客户端更新入口（About/菜单更新入口：检查新版本，updater 按 latest.json 验签升级） | delivery | S50 | 已安装客户端 updater 路径；`docs/updates.md` L18-108、`docs/signing.md` L3-82 |
| draft release 审阅与手动 Publish（全平台资产 + latest.json + SBOM + attestation） | delivery | S50、S52 | 发布维护者审阅路径；`docs/releasing.md` L5-90、`release.yml` L14-872、`release-cli.yml` L142-197 |
| Server 安装器（SHA256 校验）与四路径部署资产（Compose / systemd / Render） | delivery | S51 | 安装器 / 部署路径；`deploy/server/install.sh`、`deploy/server/*`（compose、Caddyfile、`.env.example`、`oleafly-server.service`、`smoke-test.sh`）、`Dockerfile` L31-89、`release-server.yml` L3-697 |
| Server 初始化与健康探测（setup code 初始化首个 admin；/healthz 与 /readyz） | delivery | S51 | 部署后初始化与接流量判定；`collaboration-server.md` L1147-1155、`Dockerfile` healthcheck |
| CLI 安装（7 个 target 产物独立分发，version/help/JSON/doctor 冒烟后 Publish） | delivery | S52 | `cli-vX.Y.Z` 标签触发分发；`release-cli.yml` L142-197（原偏差 D11，docs/development.md 已对齐） |
