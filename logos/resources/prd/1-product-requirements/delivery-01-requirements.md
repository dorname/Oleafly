## Oleafly 工程交付（delivery）需求文档（现状基线）

> module: delivery | 基线口径：桌面 0.4.11，Server crate 0.1.1，CLI crate 0.1.0，绑定提交 `9c307bf3c`（HEAD，领先 v0.4.11 标签 3 个提交）
> 本文档为存量产品现状基线：只描述已实现能力，验收条件以实现与测试证据为准（见提案 `inventory.md`）。未经动态验证的行为均在边界中声明。

# Oleafly 工程交付 需求文档

> 最后更新：2026-11-09

## 一、产品背景与目标

### 1.1 产品定位（本模块范围内）

delivery 模块承载 Oleafly 三个可分发组件的工程交付闭环：**桌面应用的发布与自动更新（S50）→ 协作 Server 的部署与运维恢复（S51）→ CLI 的独立发布分发（S52）**。它不改变产品功能，只固化"构建 → 签名 → 发布 → 分发 → 更新 → 部署 → 恢复"的既有工程链路；三条发布线版本独立（桌面 0.4.11、Server 0.1.1、CLI 0.1.0），互不抢占渠道。

### 1.2 核心目标

- 一次触发产出全平台、可验证、带 SBOM 与 attestation 的发布资产，缺陷产物被 draft 门禁拦截，不得流出不完整正式版本；
- 客户端升级经验签保护，升级失败不破坏既有安装；更新信任链（minisign）与 OS 安装包签名链明确分离；
- 自托管 Server 具备多路径部署、明确语义的健康检查、事务化 migration 与可演练的备份恢复；
- desktop / server / CLI 三条版本线独立发布，latest 更新通道只归属桌面发布。

### 1.3 目标用户画像

- **发布维护者**：打 tag 或手动触发发布工作流、审阅 draft 资产并手动 Publish 的项目维护者；
- **自托管运维者**：以安装器 / Docker Compose / systemd / Render 部署协作 Server，并负责升级、健康判定与备份恢复演练的运维人员；
- **终端用户**：通过桌面端 updater 或独立分发的 CLI 获得新版本的研究写作者（其视角只关心升级安全与可用）。

## 二、用户痛点分析（本模块相关）

### P01: 跨平台发布流程繁琐易错
因为桌面发布需汇集三平台安装包、latest.json、SBOM 与 attestation 等大量资产 → 导致人工发布极易遗漏产物 → 造成不完整版本流出、用户升级失败。

### P02: 更新分发信任链不清
因为更新包与安装包各自需要可验证来源 → 导致签名语义混淆、篡改包可能被安装 → 造成用户既有环境被破坏。

### P03: 自托管部署与运维门槛高
因为部署方式、健康判定、升级 migration 与故障恢复各有细节 → 导致把进程存活误判为可接流量、对新库做破坏性回滚 → 造成服务不可用或数据不可恢复。

### P04: 多端版本线混淆
因为 desktop / Server / CLI 三条发布线并存 → 导致发布互相覆盖更新通道、过时文档误导分发方式 → 造成渠道与版本混乱。

## 三、场景总览

| 编号 | 场景名称 | 触发条件 | 关联痛点 | 优先级 |
|------|---------|---------|---------|--------|
| S50 | 桌面发布与自动更新 | 发布新版本 / 客户端检查升级 | P01、P02 | P1 |
| S51 | Server 部署与运维恢复 | 自托管部署 / 升级 / 故障恢复 | P03 | P1 |
| S52 | CLI 独立发布分发 | 分发独立 CLI 版本 | P04 | P2 |

## 四、核心场景详述

### S50: 桌面发布与自动更新

- **触发条件**：需要发布桌面新版本（tag 或手动触发），或已安装客户端检查升级。
- **用户价值**：一次触发产出全平台可验证资产，客户端验签安全升级（← P01、P02）。
- **优先级**：P1
- **主路径**：tag / 手动触发发布工作流（release.yml）→ draft release 汇集全平台资产、latest.json、SBOM 与 attestation → 人工审阅后手动 Publish → 已安装客户端经 updater 验签升级。

#### 验收条件

##### 正常：draft 资产齐备后手动 Publish
- **GIVEN** tag 或手动触发后发布工作流运行完成
- **WHEN** 全平台资产、latest.json、SBOM 与 attestation 齐备
- **THEN** release 以 draft 形式汇集全部产物，人工手动 Publish 后才成为正式发布

##### 异常：资产或 attestation 缺失
- **GIVEN** 工作流产出的资产或 attestation 不齐
- **WHEN** 该 release 进入审阅
- **THEN** release 保持 draft 不发布（draft 门禁），不产生不完整正式版本

##### 正常：客户端验签升级
- **GIVEN** 已安装客户端检测到新版本
- **WHEN** updater 按 latest.json 下载更新并校验 minisign 签名
- **THEN** 验签通过后完成升级；OS 安装包签名与 updater minisign 是两条独立信任链，各自校验

##### 异常：升级失败不破坏现有安装
- **GIVEN** updater 下载或验签失败
- **WHEN** 升级过程中断
- **THEN** 现有安装保持不变；升级成功后也无自动 rollback——新版本有问题只能再发新版本修复

##### 边界：首个发布只建 baseline
- **GIVEN** 当前只有首个发布、尚无前一版本
- **WHEN** updater 检查更新
- **THEN** 首个发布只建立 baseline，不构成真实升级路径；需存在两个版本后才有真实升级路径

##### 边界：auto-updater 为人工测试区域
- **GIVEN** 真实三平台 E2E 覆盖范围
- **WHEN** 评估 auto-updater 的自动化验证
- **THEN** auto-updater 明确为 manual-only 人工区域，不在自动化 E2E 中验证

### S51: Server 部署与运维恢复

- **触发条件**：自托管部署协作 Server、升级版本或故障恢复演练。
- **用户价值**：多路径部署、健康语义明确、升级与恢复可控（← P03）。
- **优先级**：P1
- **主路径**：以安装器 / Docker Compose / systemd / Render 模板之一部署 → 首个 admin 用 setup code 初始化 → 健康检查确认后接入流量 → 升级时执行 migration → 按部署资产（smoke-test.sh 等）做备份恢复演练。

#### 验收条件

##### 正常：部署与 setup code 初始化
- **GIVEN** 运维者选择安装器 / Compose / systemd / Render 之一完成部署
- **WHEN** 服务启动并以 setup code 完成首个 admin 初始化
- **THEN** 服务正常提供服务；安装器提供 SHA256 校验，部署资产齐备（compose / Caddyfile / .env.example / systemd 服务单元 / smoke-test.sh / Dockerfile healthcheck）

##### 正常：健康检查语义
- **GIVEN** Server 进程运行中
- **WHEN** 分别探测 /healthz 与 /readyz
- **THEN** /healthz 只表示进程存活；仅当 /readyz 通过才可将流量接入，不得以 /healthz 作为接流量依据

##### 正常：升级 migration
- **GIVEN** 新版本 Server 启动且数据库为旧 schema（migration 0001-0018 链）
- **WHEN** 执行 migration
- **THEN** 逐个 migration 以事务执行并做 FK check；重启后 server_id 持久不变

##### 异常：DB 比程序新
- **GIVEN** 数据库 schema 比当前二进制更新（例如误用旧版本二进制启动）
- **WHEN** Server 启动
- **THEN** 拒绝打开数据库，不静默运行

##### 边界：旧二进制不能简单回滚新 DB
- **GIVEN** 新 migration 已应用后尝试回滚到旧二进制
- **WHEN** 旧版本 Server 启动
- **THEN** 旧二进制不能简单回滚新 DB（明确边界）；如需恢复，走备份恢复流程而非直接降级启动

##### 边界：Server 发布渠道独立
- **GIVEN** server-v 独立发布线与 desktop 发布线并存
- **WHEN** 发布 Server 新版本
- **THEN** 不得抢占 desktop 的 latest 更新通道，两条发布线互不影响

### S52: CLI 独立发布分发（简要）

- **触发条件**：需要分发独立于桌面应用的 CLI 版本。
- **用户价值**：CLI 独立版本线，产物经冒烟验证后分发（← P04）。
- **优先级**：P2
- **主路径**：cli-vX.Y.Z 标签触发工作流（release-cli.yml）→ 7 个 target 构建 → 对产物运行 version / help / JSON / doctor 冒烟 → draft release → 手动 Publish。

#### 验收条件

##### 正常：CLI 发布流水线
- **GIVEN** cli-vX.Y.Z 标签触发
- **WHEN** 构建与冒烟完成
- **THEN** 7 个 target 产物进入 draft release，经 version / help / JSON / doctor 冒烟后手动 Publish

##### 异常/边界：签名公证条件与未接线项
- **GIVEN** macOS 构建有证书才签名、有凭据才公证；Windows Authenticode 当前未接线
- **WHEN** 产物生成
- **THEN** 未签名 / 未公证时如实产出并明确警告（Windows Authenticode 未接线为明确警告项），不伪装已签名；CLI JSON 输出在 1.0 前不稳定（明确边界）

## 五、约束与边界

### 5.1 技术约束

- **draft 发布门禁**：桌面发布缺资产或 attestation 时保持 draft，人工手动 Publish 才正式发布（`docs/releasing.md`、`release.yml`）。
- **updater 失败语义**：升级失败不改现有安装；升级成功后无自动 rollback（`docs/updates.md`）。
- **两条签名链**：OS 安装包签名与 updater minisign 签名是两条独立信任链（`docs/signing.md`）；auto-updater 在 E2E 中为 manual-only 人工区域。
- **升级路径前提**：首个发布只建 baseline，需两版本才有真实升级路径。
- **发布渠道隔离**：Server 独立发布（server-v）不得抢占 desktop 的 latest 更新通道。
- **健康检查语义**：/healthz 只表示进程存活，/readyz 才可接流量。
- **Server 升级约束**：DB 比程序新拒绝打开；migration 逐个事务 + FK check；旧二进制不能简单回滚新 DB；重启后 server_id 持久。
- **CLI 发布约束**：Windows Authenticode 当前未接线（明确警告）；macOS 有证书才签名、有凭据才公证；CLI JSON 1.0 前不稳定。
- **部署资产基线**：Dockerfile（distroless，端口 10001/8080，healthcheck）、Compose + Caddy 2.11.7、Litestream 可选、systemd 硬化、Render 模板、安装器（SHA256 校验）、smoke-test.sh。
- **分发仓库边界**：外部 Oleafly / oleafly-server 仓库仅作发布分发 adapter，不可据此推断其实际状态。

### 5.2 现状声明（未验证项）

- 本基线为静态盘点：上文行为均有实现与工作流 / 文档证据，但**未在本次执行任何发布、升级或部署**；发布工作流、updater、migration、备份恢复均在 verify / 部署阶段单独取证。
- auto-updater 属 CI 已知人工区域（与 OS 原生拖放、真实 AI 端到端并列），无自动化端到端覆盖。
- `docs/development.md` "no standalone package yet" 表述已过时——release-cli.yml 工作流已存在（偏差 D11），基线以实现为准，文档回补另立变更。

### 5.3 "不做"清单（本基线范围）

- 不新增任何功能或流程；只固化现状。
- 不在本模块内描述协作 Server 的业务行为（S29-S42 属 collab 模块）与云同步分发（sync 模块）；备份的 fs/S3 具体语义见 collab 模块，本模块只约束部署侧的演练入口。
- 不修复文档偏差本身（如 D11 的文档回补另立变更），基线一律以实现为准。
- 不为 verify 预填任何测试 PASS。
