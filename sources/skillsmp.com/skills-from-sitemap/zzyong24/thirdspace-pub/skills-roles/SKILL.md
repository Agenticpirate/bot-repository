---
name: roles
description: |
  多角色 AI 协作系统 — 在 ThirdSpace 中建立专业角色分工，
  实现从想法→产品→推广→收钱的自动化闭环。

  5 个角色：
  - 📣 营销角色（Marketing）— 内容策划、文案编写、图片生成、发布提醒
  - 🎨 产品角色（Product）— 产品规划、功能设计、用户反馈、竞品调研
  - 💰 商业角色（Business）— 定价策略、变现路径、收入追踪
  - 🔧 技术角色（Tech）— 技术方案设计、架构评审
  - 🔄 运营角色（Operations）— 用户运营、社群管理、数据监控

  每个角色 = System Prompt + 知识背景 + 专用工具集 + 工作流
  角色间通过 vault 文件系统协作，无需实时通信。

  当用户提到：
  - "切换到营销角色" / "activate marketing"
  - "帮我发小红书" / "生成推广内容"
  - "产品规格" / "更新 roadmap"
  - "定价分析" / "收入报告"
  - "角色列表" / "当前角色"
  时使用此 Skill。
triggers:
  - "角色"
  - "role"
  - "切换角色"
  - "activate"
  - "营销"
  - "marketing"
  - "产品角色"
  - "商业角色"
  - "技术角色"
  - "运营角色"
  - "发小红书"
  - "推广内容"
  - "内容草稿"
  - "定价分析"
  - "收入报告"
---

# Roles — 多角色 AI 协作系统

## 概述

在 ThirdSpace 中建立 5 个专业角色，每个角色有独立的知识背景、工具集和工作流。
角色之间通过 vault 文件系统协作，人只做最终审核和决策，AI 做执行。

核心架构：**Tool（IO）→ AI（智能）→ Tool（IO）**

## 可用 MCP 工具

### 角色管理

| 工具 | 用途 |
|------|------|
| `activate_role(role_name)` | 切换当前角色，加载 System Prompt + 知识背景 |
| `list_roles()` | 列出所有角色及状态 |
| `role_context(role_name)` | 获取角色完整上下文 |

### 营销角色专用

| 工具 | 用途 |
|------|------|
| `draft_content(topic, platform, style)` | 生成指定平台的内容草稿 |
| `generate_role_image(markdown_content, format)` | 调用 mkd2pic 生成图片 |
| `diagnose_hook(content)` | 检查内容开头钩子质量 |
| `publish_reminder(content_path, platform, scheduled_time)` | 创建发布提醒 |

### 产品角色专用

| 工具 | 用途 |
|------|------|
| `draft_product_spec(product_name, feature_description)` | 生成产品规格文档 |
| `gather_user_feedback(product_name)` | 收集用户反馈 |
| `update_roadmap(product_name, milestone, status)` | 更新 roadmap 进度 |

### 商业角色专用

| 工具 | 用途 |
|------|------|
| `revenue_report(period)` | 生成收入报告 |
| `pricing_analysis(product_name)` | 定价分析 |
| `conversion_funnel(product_name)` | 分析转化漏斗 |

### 技术角色专用

| 工具 | 用途 |
|------|------|
| `tech_spec(feature_name, context)` | 生成技术方案文档 |

### 运营角色专用

| 工具 | 用途 |
|------|------|
| `user_insights(product_name, days)` | 汇总用户运营数据 |
| `community_digest(days)` | 生成社群动态摘要 |

## 角色间协作

```
产品角色 → crafted/product/   → 营销角色扫描新内容 → 生成推广
                              → 商业角色感知 → 更新定价策略
                              → 技术角色接收开发任务
营销角色 → crafted/content-queue/ → 用户审核发布
商业角色 → crafted/business/      → 策略建议
运营角色 → crafted/tracker/       → 用户数据分析
```

## 工作流

### 营销发布工作流（完整示例）

1. `activate_role("marketing")` — 切换角色
2. `draft_content(topic, platform, style)` — 生成内容草稿
3. `diagnose_hook(content)` — 检查钩子质量
4. `generate_role_image(content, format)` — 生成图片
5. `publish_reminder(...)` — 创建发布提醒
6. 用户审核 → 发布
