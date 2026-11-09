# 验收例外记录

- 提案：`add-malp-protocol`
- 记录日期：2026-11-09
- 例外类型：在 `openlogos verify` 失败的情况下，由 operator 明确授权归档

## verify 实际结果

2026-11-09 执行 `openlogos verify`，退出码为 1，未形成验收通过结论。

预跑命令 `npm test` 未能启动测试：

```text
> oleafly@0.4.11 test
> vitest run --maxWorkers=4

sh: 1: vitest: not found
```

CLI 提示预跑命令失败后继续检查已有结果，随后因缺少测试用例规格而终止：

```text
Error: 未找到测试用例规格文件（logos/resources/test/）。
请先完成测试设计（Step 3a）。
```

## 例外原因与授权

本提案仅铺设 MALP 协作协议资产与 OpenLogos 主从集成规则，不涉及业务功能。本项目通过 adopted 模式接入 OpenLogos，测试用例基线尚未建立，导致本提案无法通过正常 verify 流程释放 guard；若在本提案内补齐全部测试基线，会不当扩大变更范围。

operator 已明确确认：「确认在 verify 失败情况下归档 add-malp-protocol，并记录例外原因」。

## 结论边界

- 本次归档是 operator 授权的例外关闭，**不代表测试通过或工程验收通过**。
- 当前环境无法找到 `vitest` 可执行文件的问题仍未解决。
- `logos/resources/test/` 测试用例规格缺失的问题仍未解决。
- 后续 `add-baseline-docs` 变更应建立需求、架构、场景与测试基线，并明确测试依赖安装及验收路径。
