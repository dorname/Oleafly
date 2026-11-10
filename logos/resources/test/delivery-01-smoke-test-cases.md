## delivery 模块部署后冒烟测试用例（现状基线）

> **基线口径**：桌面 `0.4.11`，Server crate `0.1.1`，CLI crate `0.1.0`；绑定提交 `9c307bf3c`（HEAD，领先 `v0.4.11` 标签 3 个提交）。
>
> **口径声明（强制）**：本文件是**只读静态盘点**产物。本次基线**未运行任何测试，未执行任何真实部署、发布、安装、升级或回滚动作**，未运行 `deploy/server/smoke-test.sh`。表中「预期结果」全部是**设计值**（依据部署方案与现有实现推导出的判定条件），**不是实测结论，不得预填 PASS**。实际结果须由执行方在部署完成后按「实际结果 / 结论」两列现场填录（PASS / FAIL / BLOCKED），BLOCKED 须注明解除条件。
>
> **事实来源**：主依据为 `deltas/prd/3-technical-plan/3-deployment/delivery-01-deployment.md`（三条发布线、Server 部署拓扑、安装器与校验、运维 smoke、升级与回滚约束）；辅以提案 `inventory.md` 的 delivery 段（S50/S51/S52）与「架构与测试要点 → 部署资产 / 数据资产」行、同目录 `deltas/prd/1-product-requirements/delivery-01-requirements.md` 与 `deltas/prd/2-product-design/1-feature-specs/delivery-01-feature-specs.md` 的 delivery 章节。
>
> **编号规则**：`SMOKE-delivery-01-NN`，`NN` 从 `01` 起连续递增、不跳号、不重复。
>
> **本文性质**：存量部署现状基线。只登记部署方案中**已存在**的发布/部署检查项，**不新增部署步骤、不发明新的检查项**；部署方案未定义的检查一律不在此列。

---

## 一、冒烟测试范围

| 环境 | 覆盖范围 | 说明 |
|---|---|---|
| **local（开发/本机）** | ① Server 容器与 Compose 部署形态（`deploy/server/docker-compose.yml` + `Caddyfile`）；② 容器镜像静态属性（非 root、无 shell、体积预算、泄漏检查）；③ `/healthz` / `/readyz` 双探针语义；④ Server schema 18 迁移与关键表；⑤ blob 存储（fs 模式）；⑥ 环境变量必填与占位值检查；⑦ setup code 初始化 → 登录 → 创建项目 → 写入 → 读取最小链路；⑧ 容器日志无阻断性错误；⑨ CLI（`oleaflyc`）主命令与 `version` / `doctor` 冒烟；⑩ 桌面端本地库版本（library.db / catalog / tasks） | 本档使用**本地构建或本地拉取的镜像**，数据落在本地卷；用于开发自检与发布前回归。桌面本地库只在**桌面端实际运行**的机器上核对，故 local 档包含本机桌面端启动。 |
| **staging（预发）** | ① 与 local 相同的 Server 部署检查项，但以**预发实例 + 预发域名 + 预发 TLS 入口**执行；② 容器 HEALTHCHECK 生效与 `healthy` 状态；③ `server_id` 重启前后持久；④ Litestream 可选 profile 的启用边界；⑤ 安装器 `install` / `update` 的 SHA256 校验与 `.env` 权限；⑥ Server 升级（migration）路径与备份恢复演练入口；⑦ CLI 7 target 冒烟中的可执行子集；⑧ 发布线隔离（server-v 不抢占 desktop latest） | 本档用于**发布前**验证预发实例可接流量，结论作为 production 放行依据。备份恢复演练与升级回滚只在本档做，**不在 production 做破坏性演练**。 |
| **production（生产）** | ① 只读与非破坏性检查：双探针语义、Server 主 API 与浏览器端入口、静态资源可达、关键表存在性、blob 存储可用性、环境变量与密钥非占位、部署后日志无阻断性错误、`server_id` 稳定性；② 核心链路最小路径（仅用**独立冒烟账号 / 项目**，验证后清理）；③ 发布线隔离复核；④ 无自动 rollback 的运维路径确认（人工恢复命令可取） | 本档**不执行**破坏性动作：不做版本回滚、不做 migration 降级、不做 Litestream 恢复演练、不做体积预算/泄漏解包检查（属发布侧动作，在 staging 或 CI 完成）。production 冒烟结论由**人类确认**后方可关闭。 |

**通用前置（三档共用）**

- 部署资产齐备：镜像 `ghcr.io/oleafly/oleafly-server`（或本地构建镜像）、`docker-compose.yml`、`Caddyfile`、`.env`、`litestream.yml`、`install.sh`、`SHA256SUMS`（部署方案 §二 / §三）。
- 记录被测构建标识：Server 版本串、CLI 版本串、桌面版本号（应为 `0.4.11` 基线口径）。
- 冒烟执行窗口内保持单一变量：除被测目标版本外不改配置，不在中途切换发布线。

---

## 二、冒烟测试用例

### 2.1 健康检查

| ID | 描述 | 来源 | 目标环境 | 前置条件 | 操作 | 预期结果（设计值） |
|---|---|---|---|---|---|---|
| SMOKE-delivery-01-01 | Server `/healthz` 存活探针 | 部署方案 §四 运维 smoke 检查项 9；§五 约束 4 | local / staging / production | Server 容器已启动并监听 `0.0.0.0:8080` | `GET /healthz` | HTTP 200，响应体为 `{"status":"ok"}`；该端点**仅**表示进程存活，不代表可接流量 |
| SMOKE-delivery-01-02 | Server `/readyz` 就绪探针 | 部署方案 §四 检查项 9；§五 约束 4；§2.5 Render 模板 | local / staging / production | Server 容器已启动，数据库可打开 | `GET /readyz` | HTTP 200，响应体为 `{"status":"ready"}`；**只有**该端点通过才可把流量接入 |
| SMOKE-delivery-01-03 | 双探针语义不得混用（`/healthz` 不可当就绪探针） | 部署方案 §五 约束 4（"用 `/healthz` 当就绪探针会在数据库不可用时仍放行流量"） | local / staging | 具备可临时阻断数据库访问的手段（如停库 / 只读改配置） | 数据库不可用期间分别 `GET /healthz` 与 `GET /readyz` | `/healthz` 仍返回 `{"status":"ok"}`（进程仍存活），`/readyz` 不返回 ready；据此确认就绪判定确实取自 `/readyz` |
| SMOKE-delivery-01-04 | 容器 HEALTHCHECK 生效，容器状态为 healthy | 部署方案 §2.1 容器镜像（HEALTHCHECK：interval 30s / timeout 5s / start-period 30s / start-interval 2s / retries 3，命令 `oleafly-server healthcheck`）；§四 检查项 2 | local / staging / production | 容器已启动 | 观察 `docker inspect` 的 `Healthcheck` 配置与容器 `Status` | `Config.Healthcheck` 非 `null`；容器在 start-period 后状态变为 `healthy`；健康检查命令为 `oleafly-server healthcheck` |
| SMOKE-delivery-01-05 | Server 版本输出 | 部署方案 §四 检查项 7；§2.1 | local / staging / production | 镜像已拉取或构建完成 | 执行 `oleafly-server --version` | 输出以 `oleafly-server ` 开头；版本串与被测 Server crate 版本（基线 `0.1.1`）一致 |
| SMOKE-delivery-01-06 | CLI `version` 冒烟：输出与 tag 版本一致 | 部署方案 §一 1.3 CLI 发布线（每个 target 的 smoke：`version` 核对输出与 tag 版本一致，不一致即失败） | local / staging | 已取得 CLI 发布产物（7 target 中本档可执行的子集） | 执行 `oleaflyc version` | 退出码 0；输出中的版本与该产物对应的 `cli-vX.Y.Z` tag 版本一致；不一致即判失败 |
| SMOKE-delivery-01-07 | CLI JSON 冒烟：`--json version` 与 `--json doctor` 退出码语义 | 部署方案 §一 1.3（`--json version` JSON 输出；`--json doctor` 允许退出码 `0` 与 `4`，**其余退出码视为崩溃并失败**） | local / staging | CLI 产物可执行 | 依次执行 `oleaflyc --json version`、`oleaflyc --json doctor` | `--json version` 输出合法 JSON 且退出码 0；`--json doctor` 退出码 ∈ {`0`（全部找到）, `4`（缺件）}，不得出现其它退出码；注意 CLI JSON 输出在 1.0 前不稳定，不作为契约断言 |
| SMOKE-delivery-01-08 | CLI `help` 冒烟与退出码文档可达 | 部署方案 §一 1.3（`help`（`help exit-codes`）） | local / staging | CLI 产物可执行 | 执行 `oleaflyc help`、`oleaflyc help exit-codes` | 两条命令均退出码 0 并输出帮助文本；`help exit-codes` 列出各命令退出码含义 |
| SMOKE-delivery-01-09 | 桌面应用安装后首次启动 | 部署方案 §一 1.1 桌面发布线（发布资产含各目标平台桌面安装包） | local / staging / production | 桌面安装包已安装（本地构建或已发布安装包） | 启动桌面应用 | 应用进程正常启动并进入主界面，无启动期崩溃；桌面版本号为 `0.4.11` 基线口径 |
| SMOKE-delivery-01-10 | 桌面端「检查更新」入口存在（人工区域，不自动断言） | 部署方案 §一 1.1（auto-updater 为 **manual-only**，不在自动化 E2E 内验证）；§七（人工测试区域） | local / staging / production | 桌面应用已启动 | 打开「检查更新」入口 | 入口存在且可触发；本项属**人工区域**，自动化不产出 PASS/FAIL，仅记录人工观察 |

### 2.2 核心入口

| ID | 描述 | 来源 | 目标环境 | 前置条件 | 操作 | 预期结果（设计值） |
|---|---|---|---|---|---|---|
| SMOKE-delivery-01-11 | Server 主 API 清单端点 | 部署方案 §四 检查项 10（`/.well-known/oleafly-server` 含 `server_id`） | local / staging / production | Server 已启动 | `GET /.well-known/oleafly-server` | HTTP 200；响应含非空 `server_id`；全新实例的 `needs_setup` 为 `true` |
| SMOKE-delivery-01-12 | Server 主 API 鉴权边界（未授权请求不报 5xx） | 部署方案 §五 约束 4（接流量判定）；S51 主路径（部署后开始提供服务） | local / staging / production | Server 已启动，尚未携带访问令牌 | 不带令牌访问主 API 的受保护路由（如项目列表 / 创建项目） | 返回 401/403 等**鉴权类**状态码，且响应体为结构化错误；不得出现 5xx |
| SMOKE-delivery-01-13 | 浏览器端入口可访问 | 部署方案 §2.1（构建阶段把 SyncTeX 交叉编译为 WebAssembly **供浏览器端使用**）；§2.5（`OLEAFLY_WEB` 为 Server 环境开关） | local / staging / production | 使用**含浏览器应用**的镜像（官方镜像或以 `web` feature 构建），且 `OLEAFLY_WEB` 生效 | 浏览器打开 Server 根路径 | 返回浏览器端应用页面（HTML），非 404 / 非服务端错误占位页 |
| SMOKE-delivery-01-14 | 浏览器端静态资源与 SyncTeX WASM 资源可达 | 部署方案 §2.1（SyncTeX 交叉编译为 WebAssembly 供浏览器端使用） | local / staging / production | 同 SMOKE-delivery-01-13 | 加载页面引用的静态资源与 SyncTeX WASM 资源 | 所引用静态资源全部返回 200，无 404；SyncTeX WASM 资源可下载并被浏览器实例化，无 500 |
| SMOKE-delivery-01-15 | CLI 主命令族可用 | 部署方案 §一 1.3（CLI 独立分发，产物经 version / help / JSON / doctor 冒烟后 Publish） | local / staging | CLI 产物可执行 | 对 CLI 各主命令执行 `--help` | 各主命令均返回退出码 0 并输出用法；命令名与发布产物所属版本线一致（`oleaflyc`） |
| SMOKE-delivery-01-16 | CLI `doctor` 自检结果可解析 | 部署方案 §一 1.3（doctor 允许退出码 `0`（全部找到）与 `4`（缺件）） | local / staging | CLI 产物可执行 | 执行 `oleaflyc doctor` | 输出为可解析的检查清单；退出码 ∈ {`0`, `4`}，不出现其它退出码 |

### 2.3 数据库迁移与版本

| ID | 描述 | 来源 | 目标环境 | 前置条件 | 操作 | 预期结果（设计值） |
|---|---|---|---|---|---|---|
| SMOKE-delivery-01-17 | Server schema 18 迁移完成 | 部署方案 §五 约束 2（migration 逐个事务化并做外键检查）；S51 升级 migration（migration 0001-0018 链） | local / staging / production | Server 已完成首次启动且数据目录 `/data` 可写 | 读取 Server SQLite 的 `PRAGMA user_version` | `user_version` 为 `18`（与当前二进制认识的迁移数一致）；无"半迁移"残留 |
| SMOKE-delivery-01-18 | Server 关键表存在 | 部署方案 §四 检查项 12（重启后 `server_id` 持久，依赖数据落库）；S51 主路径（setup code 初始化首个 admin 后提供协作能力） | local / staging / production | SMOKE-delivery-01-17 通过 | 检查 Server 数据库中 0001-0018 迁移引入的关键表（至少含账号 / 设备 / 项目 / 会话类表，如 `accounts`、`devices`、`projects`、`web_sessions`） | 上述关键表均存在且可查询（返回 0 行或业务数据均可，但不得报表不存在） |
| SMOKE-delivery-01-19 | migration 逐个事务化 + 迁移后外键校验 | 部署方案 §五 约束 2（每个 migration 独立事务执行，避免半迁移状态；迁移后做 FK 校验） | local / staging | 以**旧 schema** 数据目录启动新版本 Server，触发升级 | 观察启动日志与升级后数据库状态 | 迁移无中断性报错；数据库 `PRAGMA foreign_key_check` 无违规行；不存在"部分迁移"的混合状态 |
| SMOKE-delivery-01-20 | DB 比程序新时拒绝打开 | 部署方案 §五 约束 1（数据库版本比程序新时，旧程序拒绝打开该数据库，而不是降级读取） | local / staging | 具备一份 schema 高于当前二进制的数据库副本 | 用较旧的 Server 二进制启动该数据目录 | 进程**拒绝打开该数据库**并给出明确错误，不静默运行、不降级读写 |
| SMOKE-delivery-01-21 | 旧二进制不接管新 DB（回滚边界） | 部署方案 §五 约束 3（旧二进制不能简单回滚新 DB；回滚必须同时回滚数据） | local / staging | 已应用新 migration 的数据目录 | 用旧二进制尝试直接接管该数据目录 | 旧二进制不能直接接管新 DB（表现为拒绝打开或明确失败）；恢复须走备份恢复流程，不得以"直接降级启动"作为恢复手段 |
| SMOKE-delivery-01-22 | 桌面本地库 `library.db` 版本 | 部署方案 §五 约束 2（数据库版本核对口径）；数据资产基线：`library.db` schema 3 | local / staging | 桌面应用已启动（SMOKE-delivery-01-09） | 读取 `library.db` 的 `PRAGMA user_version` | `user_version` 为 `3`；低于该值时桌面端应已执行升级 |
| SMOKE-delivery-01-23 | 桌面本地库 `catalog.sqlite3` 版本 | 部署方案 §五 约束 2（数据库版本核对口径）；数据资产基线：checkpoint catalog format 2 | local / staging | 桌面应用已启动且已产生检查点目录数据 | 读取 `catalog.sqlite3` 的版本标识 | 版本标识为 format `2`；与 `library.db` / `tasks.sqlite3` 的版本语义**互不通用**，不可互相比较 |
| SMOKE-delivery-01-24 | 桌面本地库 `tasks.sqlite3` 版本 | 部署方案 §五 约束 2（数据库版本核对口径）；数据资产基线：`tasks.sqlite3` research schema 5 | local / staging | 桌面应用已启动且已使用 Research Task 存储 | 读取 `tasks.sqlite3` 的 `PRAGMA user_version` | `user_version` 为 `5`；版本语义与 `library.db`（3）、`catalog.sqlite3`（2）互不通用 |

### 2.4 存储就绪

| ID | 描述 | 来源 | 目标环境 | 前置条件 | 操作 | 预期结果（设计值） |
|---|---|---|---|---|---|---|
| SMOKE-delivery-01-25 | Server blob 存储（文件系统模式）可用 | 部署方案 §2.3（"Litestream **只复制 SQLite 数据库**，**不替代 S3 对象存储中文件本身的备份**（对象存储由 `OLEAFLY_BLOB_STORE` 侧的备份策略承担）"） | local / staging / production | `OLEAFLY_BLOB_STORE` 配置为文件系统后端，数据目录可写 | 触发一次 blob 写入（见 SMOKE-delivery-01-39）并读取 | blob 写入成功；同一 hash 读取内容一致；对象落在 blob 存储侧且未被 Litestream 语义误当作"已备份" |
| SMOKE-delivery-01-26 | Server blob 存储（S3 兼容模式）可用 | 部署方案 §2.3（`OLEAFLY_BLOB_STORE` 侧的对象存储由 S3 兼容存储承担）；§2.5（凭据由运维填写） | staging / production | `OLEAFLY_BLOB_STORE` 配置为 S3 模式，S3 端点 / region / 凭据已配置且网络可达 | 触发一次 blob 写入并按 hash 读取 | blob 写入与读取均成功；S3 端点无鉴权错误；对象在 S3 侧可列出。**本档不执行对象删除与恢复演练** |
| SMOKE-delivery-01-27 | 数据目录权限与属主 | 部署方案 §2.1（数据目录 `/data`，以 `chown=10001:10001`、`chmod=0700` 拷入并声明为 `VOLUME`）；§2.4（`StateDirectoryMode=0700`） | local / staging / production | 容器或 systemd 服务已启动 | 检查数据目录属主与权限 | 数据目录属主为 UID/GID `10001:10001`（systemd 形态为动态非特权用户 + `0700`）；权限为 `0700`，非 world-readable |
| SMOKE-delivery-01-28 | Litestream 可选 profile 默认不启动 | 部署方案 §2.3（`profiles: [litestream]`，**只有显式启用该 profile 才运行**） | local / staging | Compose 启动且未显式启用 profile | 检查容器列表与复制目标 | 默认部署下 `litestream` 服务**不运行**；主链路不依赖 Litestream，冒烟不因缺 profile 失败 |

### 2.5 配置与密钥

| ID | 描述 | 来源 | 目标环境 | 前置条件 | 操作 | 预期结果（设计值） |
|---|---|---|---|---|---|---|
| SMOKE-delivery-01-29 | 核心环境变量存在且非空 | 部署方案 §2.2（Compose 强制 `OLEAFLY_PUBLIC_URL=https://${OLEAFLY_DOMAIN}`、`OLEAFLY_BIND=0.0.0.0:8080`、`OLEAFLY_DATA_DIR=/data`、`OLEAFLY_BEHIND_PROXY=true`）；§2.5（Render：`PORT=8080`、`OLEAFLY_BIND`、`OLEAFLY_DATA_DIR`、`OLEAFLY_BEHIND_PROXY`、`OLEAFLY_PUBLIC_URL`） | local / staging / production | 已写入 `.env` / 平台环境变量 | 逐项核对必填变量的存在性与取值 | 全部必填变量存在且非空；`OLEAFLY_BIND` 为 `0.0.0.0:8080`；`OLEAFLY_DATA_DIR` 为 `/data`；`OLEAFLY_BEHIND_PROXY=true`；`OLEAFLY_PUBLIC_URL` 为 `https://<实际域名>` |
| SMOKE-delivery-01-30 | 必填变量缺失时启动即失败（`OLEAFLY_DOMAIN` 必填） | 部署方案 §2.2（"未设 `OLEAFLY_DOMAIN` 时 Compose 直接报错"） | local / staging | 具备一份去掉 `OLEAFLY_DOMAIN` 的副本配置 | 用该副本启动 Compose | Compose **直接报错**退出，不启动出"无域名可用"的服务；错误信息指向缺失的 `OLEAFLY_DOMAIN` |
| SMOKE-delivery-01-31 | 配置中无测试占位值 | 部署方案 §2.2（`OLEAFLY_DOMAIN` / `OLEAFLY_PUBLIC_URL` 由运维域名驱动）；§2.5（GitHub / OIDC 凭据由运维自行填写） | staging / production | `.env` 已就位 | 扫描域名、URL、SMTP、OIDC issuer、GitHub URL 等取值 | 生产 / 预发配置中不出现示例域（`example.org` / `example.com` 等）、`changeme` / `your-*` / `test-*` / `localhost` 等占位值；凭据字段非空且非占位 |
| SMOKE-delivery-01-32 | 登录方式配置齐备（GitHub 或 OIDC 至少一套生效） | 部署方案 §四 检查项 8（未配置 GitHub 与 OpenID Connect 时容器应以退出码 2 退出） | staging / production | `.env` 已就位 | 核对 `OLEAFLY_GITHUB_*` 与 `OLEAFLY_OIDC_UNIVERSITY_*` 配置 | 至少一套登录方式（GitHub 或 OIDC）的必需项齐备且非占位；部署后服务正常启动、不进入"未配置登录方式"退出分支 |
| SMOKE-delivery-01-33 | 无登录方式时拒绝启动（退出码 2） | 部署方案 §四 检查项 8（未配置 GitHub 与 OpenID Connect 时，容器应以**退出码 2** 退出，且日志含 `No sign-in method is set up`） | local / staging | 具备一份清空 GitHub / OIDC 配置的副本 | 用该副本启动容器 | 容器以**退出码 2** 退出；日志含 `No sign-in method is set up`；不静默启动成无鉴权服务 |
| SMOKE-delivery-01-34 | `.env` 文件权限 | 部署方案 §3.3（写 `.env` 时以 `install -m 600 -o 0 -g 0` 写入（**仅 root 可读**）） | staging / production | 经安装器或等价流程写入 `.env` | 检查 `.env` 的权限位与属主 | 权限为 `0600`、属主为 root，其它用户不可读 |
| SMOKE-delivery-01-35 | 安装器下载产物 SHA256 校验 | 部署方案 §三 3.2（逐个文件与 `SHA256SUMS` 中的期望摘要比对；**`SHA256SUMS` 缺少某文件的行即中止**；摘要不符即中止并明确告知"未改动任何东西"） | staging | 可访问发布来源（`OLEAFLY_RELEASE_URL`） | 执行安装器 `install`（或 `status` 触发既有校验路径），核对 `SHA256SUMS` 与 `install.sh` / `docker-compose.yml` / `Caddyfile` / `env.example` / `litestream.yml` | 全部文件摘要一致才继续；任一不符或缺行时**中止**并输出"未改动任何东西"，不落地半套文件 |

### 2.6 核心链路最小路径

| ID | 描述 | 来源 | 目标环境 | 前置条件 | 操作 | 预期结果（设计值） |
|---|---|---|---|---|---|---|
| SMOKE-delivery-01-36 | setup code 初始化首个 admin | 部署方案 §四 检查项 10（全新实例 `needs_setup` 为 `true`；容器日志含 `Setup code: ` 行）；§五 约束 6（setup code 每次启动重新生成，先到先得，成为 server admin） | local / staging | 全新实例（`needs_setup` 为 `true`），且已配置至少一种登录方式 | 从容器日志取出 setup code，用其认领首个 admin | 认领成功，该 code 成为 server admin；认领后实例不再处于 `needs_setup` 状态 |
| SMOKE-delivery-01-37 | 登录换取访问令牌 | 部署方案 §五 约束 6；S51 主路径（用 setup code 完成首个 admin 初始化后服务开始提供协作能力） | local / staging / production | 已有可用账号（冒烟专用账号） | 执行登录并换取访问令牌 | 成功取得访问令牌；后续受保护请求携带该令牌返回 2xx（未授权时已在 SMOKE-delivery-01-12 记录 401/403 行为） |
| SMOKE-delivery-01-38 | 创建项目 | 部署方案 §五 约束 4（仅 `/readyz` 通过才可接流量 —— 即服务进入可服务状态）；S51 主路径 | local / staging / production | SMOKE-delivery-01-37 通过，服务处于 ready | 创建项目 | 创建成功并返回项目标识；项目可在项目列表中查到 |
| SMOKE-delivery-01-39 | 写入（内容寻址 blob 上传） | 部署方案 §2.3（blob 存储由 `OLEAFLY_BLOB_STORE` 侧承担备份责任） | local / staging / production | SMOKE-delivery-01-38 通过；blob 存储已就绪（SMOKE-delivery-01-25 / -26） | 向项目写入一个内容寻址 blob（PUT 语义，路径含内容 hash） | 写入成功；blob 落在已配置的 blob 存储后端（fs 或 S3）；未出现 429/503 busy 之外的失败 |
| SMOKE-delivery-01-40 | 读取（同一 blob 回读） | 部署方案 §2.3；S51 主路径 | local / staging / production | SMOKE-delivery-01-39 通过 | 按同一 hash 路径读取该 blob | 读取成功，响应内容与写入内容**逐字节一致**；hash 与路径标识对应 |
| SMOKE-delivery-01-41 | setup code 生命周期语义 | 部署方案 §五 约束 6（setup code 每次启动重新生成，直到有人完成 setup；完成 setup 后该 code 失效，同一 code 先到先得） | local / staging | 具备可重启容器的权限；已完成 setup（SMOKE-delivery-01-36） | 重启容器并检查日志中的 setup code；再用旧 code 尝试认领 | 重启后日志输出**新生成**的 setup code；已完成 setup 的实例上旧 code 失效，认领不成立；同一 code 先到先得 |
| SMOKE-delivery-01-42 | `server_id` 重启后持久 | 部署方案 §四 检查项 12（`docker restart` 之后 `/.well-known/oleafly-server` 的 `server_id` 与重启前一致，验证数据卷持久化） | local / staging / production | 记录 SMOKE-delivery-01-11 取到的 `server_id` | `docker restart` 容器后重新 `GET /.well-known/oleafly-server` | 重启后 `server_id` 与重启前**完全一致**（数据卷持久化生效） |

### 2.7 日志、监控与发布后置检查

| ID | 描述 | 来源 | 目标环境 | 前置条件 | 操作 | 预期结果（设计值） |
|---|---|---|---|---|---|---|
| SMOKE-delivery-01-43 | 容器日志含 setup code 行 | 部署方案 §四 检查项 10（容器日志含 `Setup code: ` 行） | local / staging | 全新实例已启动 | 检查容器日志 | 日志中存在 `Setup code: ` 行；该行仅在 setup 未完成时存在 |
| SMOKE-delivery-01-44 | 部署后日志无阻断性错误 | 部署方案 §四 检查项 8 / §5.1 部署资产基线；§七（verify 阶段单独取证，不得预填 PASS） | local / staging / production | 部署完成并已跑完 2.6 最小链路 | 通读启动与链路期间的服务日志 | 无阻断性错误：不得出现"未配置登录方式"、"拒绝打开数据库"、配置校验失败、数据目录不可写、migration 中断等阻断类日志；非阻断级告警记录但不判失败 |
| SMOKE-delivery-01-45 | 容器进程身份与镜像 `User` 一致 | 部署方案 §四 检查项 11（容器内服务进程实际运行的 UID 与镜像 `User` 一致）；§2.1（非 root，UID/GID `10001:10001`） | local / staging | 容器运行中 | 比对容器内进程 UID 与镜像 `Config.User` | 两者一致；UID 非 `0`、非 root；容器内不存在以 root 运行的业务进程 |
| SMOKE-delivery-01-46 | 镜像静态属性复核（非 root / 无 shell / 体积预算 / 无源码与路径泄漏） | 部署方案 §四 检查项 1、3、4、5、6；§2.1（distroless、静态二进制校验） | staging / production | 镜像已拉取（发布侧资产） | 复核镜像 `Config.User`、`Config.Healthcheck`；以 `/bin/sh` 为入口执行须失败；导出 rootfs 核对解包体积（`MAX_IMAGE_MB` 默认 40 MB）；扫描文件清单与可执行文件内嵌路径 | 非 root 且 `Healthcheck` 非 `null`；镜像内无 shell；解包体积不超预算；文件清单中无 `.rs` / `Cargo.toml` / `Cargo.lock` / `.private` / `.env` / `.git/` / `src/` 源码文件；可执行文件不内嵌 `/Users/...`、`/home/...`（`/home/web_user` 除外）路径 |
| SMOKE-delivery-01-47 | 发布线隔离：server-v 发布不抢占 desktop latest | 部署方案 §一 1.2（专门的 `desktop-latest` 作业把 latest 标签还给最新的桌面正式版；找不到可接管的桌面版时**报错失败**而非静默通过） | staging / production | Server 走 `server-v` 独立发布线 | 检查 latest 标签指向与 `desktop-latest` 作业结论 | latest 标签仍指向**桌面正式版**（已发布、非预发布、且带 `latest.json`）；Server 发布未改写桌面更新通道；无可接管桌面版时作业报错而非静默通过 |
| SMOKE-delivery-01-48 | Server 升级失败走人工恢复路径（无自动 rollback） | 部署方案 §五 约束 3、5（安装器 `update` 在版本变化时**先停服并把数据卷整包备份**（`oleafly-data-<时间戳>.tar.gz`），并输出配套的恢复命令；**无自动 rollback**） | staging | 具备一次可控的升级演练条件 | 执行安装器 `update` 并制造一次失败（校验不通过 / 校验清单被篡改） | 升级失败后**不发生自动回滚**；安装器打印出可照抄的恢复命令（清空数据卷后从备份解包 + 还原 `*.previous` 配置文件）；`.env` 被保留；数据卷备份产物生成 |
| SMOKE-delivery-01-49 | 桌面 updater 验签失败不改现有安装（人工区域） | 部署方案 §一 1.1（updater 按 `latest.json` 下载更新并校验 minisign 签名；**updater 失败不改现有安装**，成功后**无自动 rollback**；OS 安装包签名与 updater minisign 是两条独立信任链） | local / staging / production | 桌面应用已安装；存在可破坏 updater 签名校验的构造条件 | 触发一次更新检查并令验签失败 | 现有安装保持不变（未损坏）；不出现"半升级"状态；注意本项与 SMOKE-delivery-01-10 同属**人工测试区域**，自动化不产出 PASS/FAIL，仅记录人工观察 |

---

## 三、覆盖度校验

| 校验项 | 覆盖情况 | 对应用例 | 说明 |
|---|---|---|---|
| **健康检查** | ✅ 已覆盖 | SMOKE-delivery-01-01 ~ -10 | 含 Server `/healthz`（存活语义）、`/readyz`（可接流量语义）、双探针不可混用、容器 HEALTHCHECK/healthy、Server `--version`、CLI `version` / `--json version` / `--json doctor` / `help`、桌面应用首次启动、桌面「检查更新」入口 |
| **核心入口** | ✅ 已覆盖 | SMOKE-delivery-01-11 ~ -16 | Server 主 API 清单端点与鉴权边界、浏览器端入口、浏览器端静态资源与 SyncTeX WASM、CLI 主命令族、CLI `doctor` 自检 |
| **数据库迁移** | ✅ 已覆盖 | SMOKE-delivery-01-17 ~ -24 | Server schema 18 迁移完成、关键表存在、migration 事务化 + FK check、DB 比程序新拒绝打开、旧二进制不接管新 DB；桌面本地库 `library.db` schema 3 / `catalog.sqlite3` format 2 / `tasks.sqlite3` schema 5 |
| **存储就绪** | ✅ 已覆盖 | SMOKE-delivery-01-25 ~ -28 | Server blob 存储 fs 模式、blob 存储 S3 兼容模式、数据目录权限与属主（`10001:10001` / `0700`）、Litestream 可选 profile 默认不启动 |
| **配置与密钥** | ✅ 已覆盖 | SMOKE-delivery-01-29 ~ -35 | 核心环境变量存在且非空、`OLEAFLY_DOMAIN` 缺失即失败、无测试占位值、登录方式配置齐备、无登录方式时退出码 2、`.env` 权限 `0600`、安装器 SHA256 校验（含缺行即中止） |
| **静态资源** | ✅ 已覆盖 | SMOKE-delivery-01-13、-14、-46 | 浏览器端入口 HTML、浏览器端静态资源与 SyncTeX WASM 可达、镜像内无源码/无 shell/体积预算（发布后镜像复核） |
| **关键链路** | ✅ 已覆盖 | SMOKE-delivery-01-36 ~ -42 | setup code 初始化首个 admin → 登录换令牌 → 创建项目 → 写入 blob → 回读一致；另含 setup code 生命周期与 `server_id` 重启持久 |
| **日志与监控** | ✅ 已覆盖 | SMOKE-delivery-01-33、-43、-44、-45 | 部署后日志无阻断性错误、日志含 `Setup code: ` 行、无登录方式时的拒绝启动日志、容器进程身份与镜像 `User` 一致。**监控侧（如 Prometheus / 告警采集）**：部署方案未定义任何监控采集点或告警规则，故本基线**不设**监控用例——登记监控用例会构成"发明新的检查项"，超出部署方案范围；如需覆盖应先在部署方案中补齐监控定义再另立变更 |
| **发布线后置检查（补充项）** | ✅ 已覆盖 | SMOKE-delivery-01-47、-48、-49 | server-v 不抢占 desktop latest、Server 升级失败的人工恢复路径（无自动 rollback）、桌面 updater 验签失败不改现有安装 |

**未覆盖项与原因**

1. **桌面 auto-updater 的真实升级成功路径**（SMOKE-delivery-01-10 / -49 仅覆盖"入口存在"与"失败不改现有安装"侧）：部署方案明确 auto-updater 为 **manual-only**，不在自动化 E2E 内验证；且首个发布只建立 baseline，真实升级路径需存在两个版本后才成立。**解除条件**：存在两个已发布桌面版本且将 auto-updater 纳入自动化范围。
2. **Windows Authenticode 签名**：部署方案明确该项**未接线**（Windows 步骤只打印明确警告、不执行实际签名），属于已知能力缺口而非待测项，故不设用例。**解除条件**：Windows 签名端点接线完成。
3. **macOS 签名与公证**：部署方案规定"有证书才签名、有凭据才公证"，条件依赖运维持有的凭据，不属于部署后可由服务端侧验证的检查项，故不设用例。**解除条件**：明确凭据是否在预发环境提供并纳入验收清单。
4. **Litestream 复制与对象恢复演练**：部署方案只定义 Litestream **只复制 SQLite 数据库**，且为**可选 profile**；复制内容正确性与 S3 侧恢复属于备份恢复流程的一部分，部署方案未将其列为部署后检查项。本文件只登记"默认不启动"与"blob 备份责任边界"两条。**解除条件**：备份恢复流程在部署方案中补充明确的冒烟断言。
5. **外部仓库 `Oleafly/oleafly-server` 的同步结果与生产实例状态**：部署方案 §六 明确该仓库的实际 workflow 内容、镜像 digest、生产实例状态**不在本仓库的可证范围内**，仅登记"发布产物会被复制过去、安装器从那里下载"的接线关系，故不对其运行状态设用例。**解除条件**：在外部仓库单独取证。
6. **S3 对象存储的删除 / 恢复演练**：属破坏性动作，部署方案未定义对应冒烟断言，且 production 档不执行破坏性动作。**解除条件**：备份恢复流程补齐断言后另立变更。
