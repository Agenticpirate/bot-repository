---
name: r2-workflow-batch-up
version: 1.1.0
description: "批量上架工作流：将多个商品同时上架到闲鱼/淘宝。当用户说'帮我把这些都上架'、'选品库全部上架'、'批量上架'、'这几个都上了吧'、'一起上架'、'有多少上多少'时使用。不适用于单个商品上架——单个走 r2-goods skill。"
metadata:
  requires:
    bins: ["r2-cli"]
  related:
    - "r2-shared"
    - "r2-auth"
    - "r2-goods"
---

# 批量上架工作流

> **前置**：先读取 **r2-shared** skill（执行规则、Token 恢复）和 **r2-auth** skill（确保已登录）。商品命令详细用法见 **r2-goods** skill。

## 适用场景

- "帮我把这些商品都上架"
- "选品库全部上架到店铺"
- "这几件都上架了吧"
- "有多少上多少"
- "一起上架"

## 平台路由

用户说"批量上架"未指定平台时，**必须询问**：

| 平台 | 上架方式 | 命令 |
|------|----------|------|
| 闲鱼 | `goods xianyu up` | `r2-cli goods xianyu up --stock-goods-id <> --shop-id <> --price <> --json` |
| 淘宝 | `goods taobao alzc apply` | `r2-cli goods taobao alzc apply --shop-id <> --jbp-spu-id <> --apply-skus '<>' --json` |

## 闲鱼批量上架流程

1. **确认店铺**：`r2-cli goods shops --json` → 展示 `platform === "xianyu"` 的店铺让用户选择
2. **确认仓库**：`r2-cli goods stocks --json` → 用户选择仓库
3. **展示待上架商品**：`r2-cli goods list --stock-id <id> --json`
4. **用户选择要上架的商品**（可多选）
5. **逐商品询问价格** → 逐个执行 `goods xianyu up`
6. **汇总结果展示**

## 淘宝批量上架流程（阿里资产）

1. **确认店铺**：`r2-cli goods shops --json` → 展示 `platform === "taobao"` 的店铺让用户选择
2. **查询可申请 SPU**：`r2-cli goods taobao alzc spu-query --shop-id <id> --goods-no <no> --json`
3. **展示可申请 SKU**：用户选择 SKU + 价格
4. **逐个申请**：`goods taobao alzc apply`
5. **汇总结果展示**

> 淘宝流程需要用户先提供 `--goods-no`（不传查不到）。详细流程见 [r2-goods-alzc](../r2-goods/references/r2-goods-alzc.md)。

## 友好输出

**逐个进度反馈**：
```
[1/3] Nike 运动鞋 → 上架中...
[1/3] Nike 运动鞋 → ✅ 成功（id: 12345）
[2/3] Adidas T恤 → 上架中...
[2/3] Adidas T恤 → ❌ 失败：商家编码重复
```

**全部完成后汇总**：
```
批量上架完成！
✅ 成功：2 个
  - Nike 运动鞋 → ¥299 → 店铺A（id: 12345）
  - LV 包 → ¥9999 → 店铺A（id: 12346）
❌ 失败：1 个
  - Adidas T恤 → 商家编码重复
```

> 中途 Token 过期：停止工作流，告知已完成的商品数，引导重新登录后从断点继续。**不要丢弃已完成的结果**。

## 规则

- **每个商品独立提交**：一个失败不影响其他
- **批量间隔至少 1 秒**，避免触发限流
- **中途 Token 过期**：停止工作流，引导登录后从断点继续
- **提交失败 ≠ 已下架**：可能只是轮询超时，稍后用 listing 命令确认

## 错误处理

统一错误格式见 **r2-shared** skill。

| 错误 | 恢复 |
|------|------|
| `请先运行 r2-cli auth login 登录` | 停止工作流，登录后从断点继续 |
| `商家编码重复` | 更换编码后重试该商品 |
| `该商品已上架` | 跳过该商品 |
| `轮询超时` | 不视为失败，稍后用 listing 确认 |
| `网络连接失败` | 检查网络后重试该商品 |
