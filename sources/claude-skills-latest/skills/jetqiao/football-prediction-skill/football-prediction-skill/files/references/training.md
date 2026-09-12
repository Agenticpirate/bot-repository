# 训练与晋级

## 原则

- 先体检，再训练；不要根据用户给出的单文件命令直接反复调参。
- 一次模型只包含一个联赛，建议至少 3 个完整赛季。
- `provisional` 表示模型已经生成，但生产证据不足，不是程序报错。
- 不放宽晋级阈值，不以训练集指标、命中率或单段 ROI 代替样本外概率指标。
- football-data.co.uk 的历史赔率属于收盘数据，只能作为 `closing` 市场基线。

## 标准流程

1. 检查输入：

```bash
football-predict inspect-data \
  season-1.csv season-2.csv season-3.csv season-4.csv
```

确认：

- 联赛代码只有一个。
- 日期和赛季连续。
- 重复比赛已去除且没有冲突赛果。
- 至少约 760 场；建议 3–4 个完整赛季。
- 胜平负收盘赔率覆盖尽量不低于 80%。

2. 训练 challenger：

```bash
football-predict train \
  season-1.csv season-2.csv season-3.csv season-4.csv \
  --competition 英超 \
  --alias "Premier League" \
  --horizon closing \
  --no-open
```

3. 打开命令输出的 `training_report.html`。依次查看：

- 数据画像警告。
- 每个 walk-forward 窗口。
- 晋级检查中的实际值与要求。
- 按比赛日配对 bootstrap 的稳定性。

4. 只有报告显示全部通过时才晋级：

```bash
football-predict models --promote VERSION
```

## 晋级协议

- 验证样本至少 90 场。
- 市场基线覆盖至少 60 场且不低于验证样本 80%。
- Brier 至少优于市场 0.5%。
- Log-loss 不差于市场 0.2%。
- RPS 不差于市场 0.2%。
- ECE 不高于 0.03。
- 样本足够时，比赛日配对 bootstrap 的 Brier 优于市场概率至少 80%。

所有入口共用这套规则。`--force-promote` 或 `models --force` 仅用于研究，不得把强制结果表述为通过验证。

## 给“训练无法晋级”用户的简短回复

建议回复：

> 训练其实已经完成，`provisional` 表示模型还没达到生产晋级标准。先不要调低门槛；把同一联赛近 3–4 个完整赛季 CSV 一起传入，先运行 `football-predict inspect-data ...` 检查赔率覆盖，再重新训练。训练完成后打开输出的 `training_report.html`，里面会直接列出未通过的是样本量、市场覆盖、Brier 还是 ECE。

不要只回复“多加数据”，也不要要求用户猜 CSV 格式。

## 预测时点

- `closing`：可以使用 football-data 收盘赔率验证。
- `t24h / t6h / t90m`：必须使用相应时点的不可变市场快照。

若只有 football-data CSV 却指定非收盘时点，系统会隔离收盘赔率，模型只能保留为 challenger。这是防泄漏保护，不是故障。
