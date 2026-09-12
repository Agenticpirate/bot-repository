---
name: matlab-power-electronics-sim
description: >
  电力电子仿真 skill：通过 MATLAB MCP 工具搭建、修改、仿真和诊断 Simulink 电力电子模型。
  触发词：电力电子仿真、Simulink 建模、变换器、逆变器、整流器、PFC、MPPT、DAB、LLC、
  CLLLC、SOC/BMS、PMSM/FOC、HVDC/MMC、STATCOM、VSG、SiC/GaN、
  PWM/SVPWM/DPWM/PSM、PI/PR/MPC/ADRC 控制、.slx 模型分析。
---

# 电力电子 Simulink 仿真 Skill

本 skill 是工作区的本地入口。全局完整版（含所有资产和参考文档）位于：

```text
C:\Users\ffggf\.agents\skills\matlab-power-electronics-sim\
```

## 执行机制

本 skill 不直接运行仿真。Agent 读取 skill 获取工作流和领域规则，通过 MATLAB MCP Core Server 调用 MATLAB：

| MCP 工具 | 用途 |
|---|---|
| `detect_matlab_toolboxes` | 建模前确认 MATLAB 版本和所需产品 |
| `evaluate_matlab_code` | 短 MATLAB 探针、检查参数、查询端口 |
| `run_matlab_file` | 运行 `.m` 脚本（建模、修改、仿真） |
| `check_matlab_code` | Code Analyzer 静态检查 |

## 工作流程

1. 明确拓扑、额定值、控制目标、开关频率、MATLAB 版本。
2. 运行 `detect_matlab_toolboxes` 确认环境。
3. 按需加载全局 skill 的 `reference/` 参考文档。
4. 生成可复现的 `.m` 脚本完成建模/仿真。
5. 至少一次仿真验证，不可用时明确说明。
6. 报告拓扑、控制、指标、文件和风险。

## 本地模型资产

| 位置 | 内容 |
|---|---|
| `../models/` | 39 个基础 .slx（按拓扑分 7 类） |
| `../advanced_models/` | 10 个高级模型 |
| `../contest-designs/` | 竞赛设计 |
| `../DC_Electronic_Load/` | 电子负载案例 |
| `../LLC_Resonant/` + `../LLC_V2/` | LLC 谐振 |
| `../SOC_Estimation/` | SOC 估算 |
| `../research/` | 研究文档 |

## 参考资料

- [references/toolkit-map.md](references/toolkit-map.md)：skill 位置和调用关系
- [references/model-experience.md](references/model-experience.md)：模型经验摘要和资产位置
