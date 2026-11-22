<!-- fix-doc-deviations: D12 标注转终态 -->
## MODIFIED — 正常：重叠文本自动合并与 Merge Review

- **GIVEN** 两端离线期间对同一文本产生重叠编辑
- **WHEN** 恢复同步
- **THEN** 文本由 Loro/OT 自动合并，用户可在只读 Merge Review 中按作者与 diff 审查；并非所有重叠文本都要求人工二选一（原偏差 D12，README 已对齐）

## MODIFIED — 5.1 技术约束

- **项目内容不是端到端加密**：Server capability 明确 `encryption=None`；宿主、磁盘与备份运营者可读取项目内容。产品描述不得宣传为 E2E 加密。
- **四条同步路径不可混称**（见 1.2）：本模块只是路径①实时协作；与云同步、在线 LaTeX 服务桥、普通 Git hosting 互不替代。
- **README 离线冲突概括（原偏差 D12）**：实际行为是重叠文本 Loro 自动合并 + 只读 Merge Review，并非一切变更都先询问；README 已由 fix-doc-deviations 对齐。
- **浏览器传输回退差异**：桌面端 WS 两次失败可回退 `/frames`+`/poll` 并每分钟重探；**浏览器只有 WS 重连，无 long-poll 回退**，且无离线编辑能力。
- **生产浏览器无编译引擎**：浏览器只查看 Owner/Editor 上传的输出；fake engine 仅限开发与测试（Browser E2E 不等同生产）。
- 权限校验在服务端逐 change 执行，客户端 UI 不是安全边界；协作协议为 collab protocol v1（min/max 协商），协议不兼容停止同步。

## MODIFIED — 5.3 "不做"清单（本基线范围）

- 不新增任何功能或交互；只固化现状。
- 不在本模块内描述云同步（Dropbox/Drive/S3）、在线 LaTeX 服务桥与在线导入、普通 Git hosting（分属 sync/core 模块）。
- 不修复文档偏差本身（D12 等的文档已由 fix-doc-deviations 对齐），基线一律以实现为准。
