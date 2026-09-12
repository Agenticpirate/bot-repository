---
name: iopho-seedance-prompts
description: "即梦 Seedance 2.0 全能提示词工程指南。根据用户视频需求生成最优 Seedance 提示词，覆盖多模态输入(图/视频/音频/文本)、@引用语法、10大能力模式、镜头语言词库。中文优先，因为 Seedance 中文理解效果最佳。Use when writing prompts for Seedance/Jimeng video generation."
allowed-tools: Read(*)
user-invocable: true
argument-hint: <视频需求描述> [--style 风格] [--duration 时长] [--capability 能力模式]
updated: "2026-02-28"
---

# iopho-seedance-prompts — 即梦 Seedance 2.0 提示词工程

根据用户的视频创作需求，生成最优的 Seedance 2.0 提示词。本 skill 从官方手册 100% 提取，覆盖全部多模态能力和 40+ 真实 Case。

**官方网站**: https://jimeng.jianying.com/
**模型版本**: Seedance 2.0（含 Fast 快速模式）

## 1. 参数硬限制

| 维度 | Seedance 2.0 限制 |
|------|-----------------|
| **图片输入** | ≤ 9 张，格式 jpeg/png/webp/bmp/tiff/gif，单张 < 30MB |
| **视频输入** | ≤ 3 个，格式 mp4/mov，总时长 [2,15]s，单个 < 50MB |
| **视频像素数** | [409600 (640×640), 927408 (834×1112)] — 超出范围会失败 |
| **音频输入** | ≤ 3 个，格式 mp3/wav，总时长 ≤ 15s，单个 < 15MB |
| **文本输入** | 自然语言描述 |
| **生成时长** | 4-15 秒（可自由选择） |
| **声音输出** | 自带音效/配乐 |
| **混合输入上限** | **总计 ≤ 12 个文件**，建议优先上传对画面/节奏影响最大的素材 |

⚠️ **有参考视频会贵一点**（视频 token 消耗更高）

## 2. 交互入口选择

Seedance 2.0 有两个入口，**选错入口会导致功能不可用**：

```
用户只有首帧图 + prompt？
  → 「首尾帧」入口（图 + prompt 即可）

用户需要多模态组合（图+视频+音频+文本）？
  → 「全能参考」入口（支持所有素材混合输入）
```

⚠️ 智能多帧和主体参考**无法在全能参考中选中**。若只上传首帧图 + prompt，可走首尾帧入口。

## 3. @引用语法（核心机制）

Seedance 2.0 通过 `@素材名` 指定每个上传文件的用途。**这是区分"参考什么"的唯一方式**。

### 语法规则

```
@图片 1    — 引用第1张上传图片
@图片 2    — 引用第2张上传图片
@视频 1    — 引用第1个上传视频
@音频 1    — 引用第1个上传音频
```

### 用途指定方式

在 prompt 中明确每个 @ 对象的角色：

```
@图片 1 作为首帧，参考@视频 1 的打斗动作
```

```
@图片 1 的人物参考@视频 1 的动作和表情变化
```

```
参考@视频 1 的运镜，及近的环绕镜头
```

### 常见错误

- ❌ 素材多的时候 @对象标注不清楚 → 模型会混淆图/视频/角色
- ❌ 把图和视频搞混 → 一定要检查 `@图片` vs `@视频` 是否正确
- ❌ 忘记说明"参考"还是"使用" → 明确写清楚

## 4. Prompt 公式

### 基础结构

```
[镜头运动] + [主体描述] + [动作/行为] + [环境/氛围] + [风格修饰]
```

### 示例

```
固定镜头。女孩在优雅的晾衣服，晾完接着在桶里拿出另一件，用力抖一抖衣服。
```

```
镜头小幅度拉远（露出街头全景）并跟随女主移动，风吹拂着女主的裙摆，
女主走在19世纪的伦敦大街上。
```

```
镜头跟随黑衣男子快速逃亡，后面一群人在追。镜头转为侧面跟拍，
人物惊慌撞倒路边的水果摊爬起来继续逃，人群慌乱的声音。
```

### 分段时间控制（≤15s 视频）

对长视频可按时间分段描述：

```
0-3 秒：固定镜头，女孩在优雅的晾衣服
3-6 秒：镜头推近，特写手部动作
6-10 秒：镜头拉远，展示整个庭院
10-15 秒：俯拍全景，阳光洒下
```

## 5. 十大能力模式

根据用户需求选择最匹配的能力模式，每个模式的详细 prompt 模板见对应 references 文件。

| # | 能力 | 简述 | 详细文档 |
|---|------|------|---------|
| 1 | **基础生成** | 物理更合理、动作更流畅、风格更稳定 | [capabilities-basic.md](references/capabilities-basic.md) |
| 2 | **一致性控制** | 人脸/服装/字体/商品细节前后一致 | [capabilities-consistency.md](references/capabilities-consistency.md) |
| 3 | **运镜复刻** | 环绕/推拉/追踪/一镜到底/希区柯克 | [capabilities-camera.md](references/capabilities-camera.md) |
| 4 | **创意模版** | 特效复刻/转场/广告/漫画/MV | [capabilities-creative.md](references/capabilities-creative.md) |
| 5 | **视频编辑** | 颠覆剧情/角色替换/延长/融合 | [capabilities-editing.md](references/capabilities-editing.md) |
| 6 | **音色声音** | 对话配音/音效/音色参考/BGM | [capabilities-audio.md](references/capabilities-audio.md) |
| 7 | **镜头连贯** | 一镜到底/多场景穿梭/长镜头 | [capabilities-camera.md](references/capabilities-camera.md) |
| 8 | **情绪演绎** | 崩溃/温馨/喜剧/紧张/反转 | [capabilities-emotion.md](references/capabilities-emotion.md) |
| 9 | **音乐卡点** | 节拍同步/MV 风格/换装卡点 | [capabilities-editing.md](references/capabilities-editing.md) |
| 10 | **剧情补全** | AI 自动补充剧情/创意发散 | [capabilities-creative.md](references/capabilities-creative.md) |

## 6. 特殊用法速查

| 场景 | 提示词写法 |
|------|----------|
| 首帧+参考视频动作 | `@图 1 为首帧，参考@视频 1 的打斗动作` |
| 延长已有视频 | `将@视频 1 延长 5s`（生成时长选"新增部分"的时长） |
| 融合多个视频 | `我要在@视频 1 和@视频 2 之间加一个场景，内容为 xxx` |
| 无音频素材用视频声音 | 直接参考视频即可，模型会提取音频 |
| 连续动作（接着拍） | `角色从跳跃直接过渡到翻滚，保持动作连贯流畅` + 多图 `@图 1@图 2@图 3...` |
| 角色替换 | `将@视频 1 中的女生换成戏曲花旦` |
| 音色参考 | 上传参考视频/音频，prompt 写 `语气和音色参考@视频 1 中的说话动作` |
| 分镜脚本 | 上传分镜图，`参考@图片 1 的分镜头脚本的分镜、景别、运镜、画面和文案` |

## 7. 限制与禁忌

### 真人脸限制
- **不支持上传包含写实真人脸部的素材**（图片和视频均不行）
- 系统自动拦截，上传后将无法生成
- 清晰可辨识的人脸 → 无法完成对应生成
- 动漫/CG/模糊/远景人脸不受限

### 其他限制
- 视频像素数超出 [409600, 927408] 范围会失败
- 混合输入总文件数 ≤ 12，超出需取舍
- Seedance 2.0 Fast 模式更快但质量略低

## 8. Execute

```bash
# 从 $ARGUMENTS 解析用户需求
#
# The agent should:
# 1. 理解用户的视频创作意图（主题、风格、时长、素材）
# 2. 选择最匹配的能力模式（基础/一致性/运镜/创意/编辑/音色/情绪）
# 3. 读取对应的 references/ 文件获取详细 prompt 模板
# 4. 根据用户素材情况选择交互入口（首尾帧 vs 全能参考）
# 5. 构建 @引用语法，明确每个素材的角色
# 6. 按 Prompt 公式组装最终提示词
# 7. 输出：
#    - 推荐的交互入口
#    - 素材上传顺序和 @引用关系
#    - 完整的中文提示词
#    - 推荐生成时长
#    - 注意事项（真人脸限制等）
```

## 9. Prompt 模板库与词库

完整的按场景分类的 prompt 模板和专业词库：

- **场景模板**: [prompt-templates.md](references/prompt-templates.md) — 电商广告 / 剧情短片 / MV / 产品展示 / 科普 / 搞笑
- **专业词库**: [prompt-vocabulary.md](references/prompt-vocabulary.md) — 镜头语言 / 视觉风格 / 氛围修饰 / 音效描述

## 10. 与 iopho 管线集成

### 从参考视频复刻到 Seedance

```
# 1. 搜索参考视频
/iopho-searching-videos 产品广告 15秒 --platform bilibili

# 2. 下载参考视频
/iopho-getting-videos https://bilibili.com/BV... --mode all

# 3. 分析视频结构
/iopho-analyzing-videos temp/ref.mp4 temp/ref.storyboard.md

# 4. 生成 Seedance 复刻 prompt
/iopho-seedance-prompts 根据 temp/ref.storyboard.md 生成 Seedance 复刻 prompt
```

### 从 storyboard 生成 Seedance prompt

当已有 `.storyboard.md` 文件时，agent 应该：
1. 读取 storyboard 的场景分解
2. 为每个场景生成独立的 Seedance prompt（每段 ≤ 15s）
3. 标注需要的参考素材和 @引用关系
4. 给出场景间的衔接建议（视频延长/融合）

## Tips

- Seedance 中文理解效果最佳，prompt 优先用中文
- 素材多时一定要**逐个检查 @引用标注**，别把图和视频搞混
- 参考视频支持镜头语言、动作节奏、创意特效的复刻
- 视频延长时，生成时长应为"新增部分"的时长（如延长 5s 就选 5s）
- 建议优先上传对画面或节奏影响最大的素材
- 没有音频素材？可以直接参考视频里的声音
- 想要更好的一致性？多提供角色参考图（不同角度/表情）
- 分段时间控制对 10s+ 视频效果更好
