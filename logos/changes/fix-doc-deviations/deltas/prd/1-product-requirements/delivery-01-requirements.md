<!-- fix-doc-deviations: D11 标注转终态 -->
## MODIFIED — 5.2 现状声明（未验证项）

- 本基线为静态盘点：上文行为均有实现与工作流 / 文档证据，但**未在本次执行任何发布、升级或部署**；发布工作流、updater、migration、备份恢复均在 verify / 部署阶段单独取证。
- auto-updater 属 CI 已知人工区域（与 OS 原生拖放、真实 AI 端到端并列），无自动化端到端覆盖。
- CLI 独立发布工作流已存在（原偏差 D11）：`docs/development.md` 曾表述 "no standalone package yet"，已由 fix-doc-deviations 对齐为 release-cli.yml 现状，基线以实现为准。

## MODIFIED — 5.3 "不做"清单（本基线范围）

- 不新增任何功能或流程；只固化现状。
- 不在本模块内描述协作 Server 的业务行为（S29-S42 属 collab 模块）与云同步分发（sync 模块）；备份的 fs/S3 具体语义见 collab 模块，本模块只约束部署侧的演练入口。
- 不修复文档偏差本身（如 D11 的文档已由 fix-doc-deviations 对齐），基线一律以实现为准。
- 不为 verify 预填任何测试 PASS。
