---
name: test-case-generator
description: 通用测试用例生成引擎，支持从 PRD/API 定义/技术设计文档自动生成高质量测试用例；内置 46 种测试模式（风险/API/业务/错误），支持 5 种输出格式（XMind/Markdown/Excel/JSON/CSV）；当用户需要生成测试用例、编写测试文档、设计测试覆盖方案时使用
---

# 测试用例生成器

## 执行入口

**立即跳转到执行引擎**：[execution-engine.md](references/system/execution-engine.md)

> 本文档是轻量级引导，仅指向核心执行控制器。

---

## 核心目标

根据 API 定义或需求文档，自动生成**结构化、高覆盖、可执行**的测试用例。

---

## 数据流架构

### 三层架构

```
raw-knowledge/                           # 原始知识数据层（手动放入）
└── 99-common/                           # 通用知识

knowledge/                               # 知识层（LLM 自动维护）

input/                                   # 原始数据层（用户手动存放）
├── prd/                                 # PRD文档
├── tech-design/                         # 技术设计文档
└── images/                              # 相关图片

requirements/                            # 需求目录（AI自动生成）
└── REQ-XXX-需求名称/
    ├── input/                           # 复制的原始文档
    ├── extracted/                       # 提取的结构化数据
    └── output/                          # 最终输出
```

**完整数据流**：knowledge/（知识参考）+ input/（原始）→ requirements/REQ-XXX/（处理+输出）

### 数据提取流程（Step 2）

**Step 2: 数据提取与结构化**（预处理阶段）

当用户提供原始文档时，先执行数据提取：

```yaml
step_2_data_extraction:
  supported_input_formats:
    - ".docx - Word文档（pandoc + python-docx）"
    - ".pdf - PDF文档（pdfplumber + pytesseract OCR）"
    - ".xlsx - Excel表格（pandas + openpyxl）"
    - ".pptx - Pow[占位]oint（markitdown + python-pptx）"
    - ".png/.jpg/.jpeg - 图片（pytesseract OCR）"
    - "飞书文档链接 - docx/wiki（feishu.py）"

  # 【自动调用脚本】Step 2 会自动调用以下脚本完成数据提取
  auto_execution_scripts:
    script_1_docx_extraction:
      name: "docx.py"
      path: "scripts/extractors/docx.py"
      trigger: "input/prd/ 目录存在 .docx 文件"
      output:
        - "extracted/prd.md"
        - "extracted/prd.json"
      action: "自动执行Word文档提取"

    script_2_tech_design_extraction:
      name: "tech_design.py"
      path: "scripts/extractors/tech_design.py"
      trigger: "input/tech-design/ 目录存在 .docx 文件"
      output:
        - "extracted/tech-design.md"
        - "extracted/tech-design-api.yaml"
        - "extracted/tech-design.json"
      action: "自动执行技术方案增强提取（API/SQL/表结构识别）"

    script_3_image_extraction:
      name: "docx.py（内置图片提取）"
      path: "scripts/extractors/docx.py"
      trigger: "源文档包含图片"
      output:
        - "extracted/images/"
        - "extracted/images-content.md"
        - "output/images/"
      action: "Word文档提取时自动提取内嵌图片"

    script_4_feishu_doc_extraction:
      name: "feishu.py"
      path: "scripts/extractors/feishu.py"
      trigger: "用户提供飞书文档链接（.feishu.cn/docx/ 或 .feishu.cn/wiki/）"
      output:
        - "extracted/prd.md"
        - "extracted/prd.json"
        - "extracted/images/feishu/"
      action: "通过飞书开放平台API拉取文档内容并转换为Markdown/JSON"

  # 手动执行脚本命令（备用）
  manual_commands:
    extract_docx: "python scripts/extractors/docx.py <input.docx> <output_dir>"
    extract_tech_design: "python scripts/extractors/tech_design.py <input.docx> <output_dir> [--ai-enhance] [--platform <name>]"
    extract_feishu_doc: "python scripts/extractors/feishu.py <feishu_url> <requirements_dir>"
    generate_xmind: "python scripts/output/xmind.py <input.md> <output.xmind> [--title '标题']"
    image_gate_check: "python scripts/extractors/_image_gate.py <requirements_dir>"

  input_sources:
    prd_docs:
      path: "input/prd/"
      output:
        - "extracted/prd.md"
        - "extracted/prd.json"
        - "extracted/api-schema.yaml"
    tech_design_docs:
      path: "input/tech-design/"
      output:
        - "extracted/tech-design.md"
        - "extracted/tech-design-api.yaml"

  image_extraction:
    output: "extracted/images-content.md"
    primary_method: "AI视觉分析（Claude Vision）"
    fallback_method: "Tesseract OCR"
    mandatory: true  # 强制步骤，不可跳过
    guide: "references/guides/image-extraction-guide.md"
    classification:
      - type: "流程图"
        extraction: "AI视觉识别流程步骤、决策条件，转换为Mermaid语法"
      - type: "表格截图"
        extraction: "AI视觉提取表格数据，转换为Markdown表格"
      - type: "界面截图"
        extraction: "AI视觉识别按钮、字段、提示，提取操作步骤"
      - type: "代码/架构图"
        extraction: "AI视觉识别方法名、SQL、组件、数据流向"
      - type: "数据报表"
        extraction: "AI视觉提取关键指标和筛选条件"
      - type: "手机界面"
        extraction: "AI视觉标注移动端特性和交互"
```

---

## 执行流程（15步）

```
Step 1:知识上下文 → Step 2:数据提取 → Step 3:需求验证 → Step 4:图片分析闸门
     → Step 5:输入分类 → Step 6:技术方案分析 → Step 7:Pattern路由 → Step 8:风险叠加 → Step 9:扩展生成
     → Step 10:去重规范 → Step 11:优先级判定 → Step 12:覆盖验证 → Step 13:输出格式化
     → Step 14:知识沉淀 → Step 15:自动归档推送 → 输出测试用例集 + 更新知识库
```

> ⚠️ **关键特性**：内置歧义问题清单收集 + 内联输出

### 执行前检查清单（必须完成）

```yaml
pre_execution_checklist:
  check_1_demand_identity:
    item: "确认当前操作的需求"
    action: "读取 extracted/prd.json 中的 metadata.title 和 metadata.source"
    confirm: "向用户展示需求名称和来源文档，确认后再继续"
    failure_action: "停止执行，要求用户明确需求"

  check_2_directory_match:
    item: "检查当前目录与需求匹配"
    validate: "当前工作目录应包含正确需求编号(如REQ-002)"
    on_mismatch: "提示用户切换到正确目录，拒绝执行"

  check_3_data_extraction:
    item: "检查数据提取完整性"
    validate:
      - "extracted/prd.json 存在且完整"
      - "extracted/tech-design.md 存在（如提供了技术方案）"
      - "extracted/images-content.md 存在（如PRD含图片）"
    on_missing: "先执行Step 2数据提取"

  check_4_image_analysis:
    item: "【关键检查】图片AI视觉分析"
    critical: true
    validate:
      - "检测源文档是否包含图片"
      - "extracted/images/ 目录存在且非空（如有图片）"
      - "extracted/images-content.md 存在且包含分析结果"
      - "界面截图识别出字段、按钮、表单"
      - "流程图识别出步骤、分支"
    action: "使用AI视觉分析识别界面元素、流程、代码细节"
    output: "extracted/images-content.md"
    failure_action: "停止执行，必须完成图片分析"
    reference: "references/guides/image-extraction-guide.md"

  check_5_version_strategy:
    item: "确定版本策略"
    check: "output/current/test-cases/ 是否已有用例"
    decision:
      - "无历史版本 → 创建 YYYY-MM-DD-1"
      - "有历史版本+PRD变化 → 归档旧版到 versions/，新建日期版本"
      - "有历史版本+PRD无变化 → 询问是否重新生成"
```

### AI视觉分析流程（Step 4增强）

```yaml
ai_vision_analysis:
  when: "PRD文档包含图片"
  priority: "主方案（优于OCR）"
  capabilities:
    - "界面截图：识别按钮、输入框、提示文字"
    - "流程图：识别决策节点、流程步骤"
    - "表格：识别表头、数据行、业务规则"
    - "代码截图：识别方法名、SQL、配置"
    - "架构图：识别组件、数据流向"
  output: "extracted/images-content.md"
  usage: "基于识别的细节补充测试用例"
```

**输入来源优先级**：
1. **extracted/prd.json** — 首选（结构化数据）
2. **extracted/prd.md** — 次选（完整文本，含图片引用）
3. **input/prd/*.docx** — 备选（原始Word）

**技术方案输入优先级**：
1. **extracted/tech-design-api.yaml** — 首选（详细接口定义）
2. **extracted/tech-design.md** — 次选（技术方案文本）
3. **input/tech-design/*.docx** — 备选（原始技术方案）

> ⚠️ **重要**：如存在技术方案文档，生成测试用例时必须同时参考 PRD 和技术方案。

---

## 输出格式规范

详细定义见 [output-schema.md](references/schemas/output-schema.md)，以下仅摘录核心规则。

### 文件头部（强制）

必须以 `# 测试用例集名称` 开头（XMind 中心节点）。

### XMind Markdown 格式（必须使用列表形式，禁止标题形式）

```markdown
# 测试用例集名称

## 一、[P0] 模块名

### 1.1 子模块名

- TC-XXX-001：用例名称
  - **优先级**: P0
  - **测试方法**: 场景法
  - **前置条件**
    - 条件1
    - 条件2
  - **测试步骤**
    1. 步骤1
    2. 步骤2
  - **测试数据**
    - 参数1: 值1
    - 参数2: 值2
  - **预期结果**
    - 结果1
    - 结果2
```

**错误格式**：
```markdown
❌ 不要这样写：
### TC-XXX-P0: 用例名称
- **前置条件**: ...
- **测试步骤**: ...
```

### 文件命名

- current/ 目录：`{需求名}-{格式标识}.{扩展名}`（不含版本号）
- versions/ 目录：`{YYYY-MM-DD-N}`（日期+序号）

---

## 文档加载顺序

执行时按以下顺序加载文档：

1. **execution-engine.md** — 执行入口，读取执行流程
2. **knowledge/_index.yaml** — 加载模块索引（Step 1 知识上下文）
3. **knowledge/{module}.md** — 加载匹配模块的知识文件（按 PRD 关键词匹配）
4. **knowledge/state-machines/{entity}-states.md** — 加载状态机文件
5. **pattern-registry.md** — 获取 Pattern 路由和冲突解决规则
6. **quality-checks.md** — 加载5项强制校验规则
7. **risk-patterns.md** — 加载风险模式（Level 1）
8. **api-test-patterns.md** / **business-test-patterns.md** — 按输入类型加载（Level 2）
9. **error-patterns.md** — 加载错误模式（Level 3）
10. **deduplicate-guide.md** / **normalize-guide.md** — 加载去重和规范化规则

> **注意**：`knowledge/` 为当前知识层，`raw-knowledge/` 为原始数据层。

---

## 核心文档索引

### 系统级（P0 必须加载）
| 文档 | 职责 |
|------|------|
| [execution-engine.md](references/system/execution-engine.md) | 唯一执行入口控制器 |
| [pattern-registry.md](references/system/pattern-registry.md) | Pattern 注册与路由 |
| [quality-checks.md](references/quality/quality-checks.md) | 5项强制质量校验 |

### Pattern 层（按优先级加载）
| 文档 | Pattern 数量 |
|------|-------------|
| [risk-patterns.md](references/patterns/risk-patterns.md) | 19种风险模式（LEVEL_1） |
| [api-test-patterns.md](references/patterns/api-test-patterns.md) | 8种API模式（LEVEL_2） |
| [business-test-patterns.md](references/patterns/business-test-patterns.md) | 7种业务模式（LEVEL_2） |
| [error-patterns.md](references/patterns/error-patterns.md) | 10种错误模式（LEVEL_3） |

### 规则与约束
| 文档 | 职责 |
|------|------|
| [generation-engine.md](references/rules/generation-engine.md) | 用例生成规则 |
| [coverage-engine.md](references/rules/coverage-engine.md) | 覆盖率验证 |
| [priority-engine.md](references/rules/priority-engine.md) | 优先级判定 |

### 格式规范
| 文档 | 职责 |
|------|------|
| [input-schema.md](references/schemas/input-schema.md) | 输入格式规范 |
| [output-schema.md](references/schemas/output-schema.md) | 输出格式规范 |
| [modes-config.md](references/schemas/modes-config.md) | 工作模式配置 |

### 质量保障
| 文档 | 职责 |
|------|------|
| [deduplicate-guide.md](references/quality/deduplicate-guide.md) | 用例去重 |
| [normalize-guide.md](references/quality/normalize-guide.md) | 格式规范化 |

### 知识支撑（按需加载）
| 文档 | 职责 |
|------|------|
| [business-models.md](references/base/business-models.md) | 业务模型抽象 |
| [test-methods.md](references/base/test-methods.md) | 测试方法论 |

### 双层知识架构

| 层级 | 路径 | 职责 |
|------|------|------|
| **原始数据层** | `raw-knowledge/` | 手动放入业务知识文档（按模块分目录） |
| **知识层** | `knowledge/` | LLM 自动维护的精简知识（AI 生成用例时参考） |

### 扩展：平台特定规则

本项目支持通过 `references/platforms/example/` 了解如何添加平台规则。

### 模板资源（Templates）
| 文档 | 职责 |
|------|------|
| [test-plan-template.md](assets/templates/test-plan-template.md) | 测试计划模板 |
| [test-report-template.md](assets/templates/test-report-template.md) | 测试报告模板 |
| [xmind-template.md](assets/templates/xmind-template.md) | XMind格式模板 |
| [multi-platform-scenarios.md](assets/templates/multi-platform-scenarios.md) | 多平台测试场景 |
| [default-xmind.md](assets/templates/user/default-xmind.md) | 用户默认模板 |
| template.xmind | XMind空白模板文件（二进制） |

### 专项测试领域（按需加载）

当用户输入包含特定关键词时，加载对应专项测试文档：

| 文档 | 职责 | 触发关键词 |
|------|------|-----------|
| [performance-testing.md](references/performance/performance-testing.md) | 性能测试策略（大数据量/高并发/响应时间） | "性能"、"并发"、"大数据量"、"响应时间"、"压力测试" |
| [security-testing.md](references/security/security-testing.md) | 安全测试（认证/加密/SQL注入/XSS/权限） | "安全"、"SQL注入"、"XSS"、"权限"、"加密"、"越权" |
| [regression-testing-guide.md](references/regression/regression-testing-guide.md) | 回归测试策略（冒烟测试/用例选择） | "回归"、"冒烟测试"、"影响分析"、"历史缺陷" |
| [automation-testing-guide.md](references/automation/automation-testing-guide.md) | 自动化测试转化（脚本转化/数据驱动） | "自动化"、"脚本转化"、"数据驱动"、"页面对象"、"CI/CD" |
| [data-generation-guide.md](references/data-generation/data-generation-guide.md) | 测试数据生成（数据规则/脱敏/组合策略） | "测试数据"、"数据生成"、"数据脱敏"、"正交实验" |
| [defect-management-guide.md](references/defect-management/defect-management-guide.md) | 缺陷管理规范（分级标准/跟踪流程/统计） | "缺陷管理"、"缺陷报告"、"缺陷分级"、"缺陷跟踪" |
| [compatibility-testing.md](references/compatibility/compatibility-testing.md) | 兼容性测试（浏览器/分辨率/移动端/操作系统） | "兼容性"、"浏览器"、"移动端"、"分辨率"、"操作系统" |

> **注意**：部分领域扩展包（如电商/[占位]/财务）位于 `references/domain-packs/`，不默认加载，需在 pattern-registry.md 中显式注册。

---

## ⚠️ 关键执行纪律（防错重点）

### 1. 图片处理强制流程（最容易遗漏）

**这是最容易被遗漏的步骤，必须严格执行**：

```yaml
image_processing_mandatory:
  step_1_detect: "检测源文档是否包含图片（Word/PDF/PPT）"
  step_2_extract: "提取所有内嵌图片到 extracted/images/"
  step_3_analyze: "对每个图片进行AI视觉分析（Claude Vision）"
  step_4_document: "输出分析结果到 extracted/images-content.md"
  step_5_output: "确保图片可在 output/images/ 访问"
  step_6_integrate: "生成测试用例时必须参考 images-content.md"

  critical_checkpoints:
    - "extracted/images/ 目录存在且非空"
    - "extracted/images-content.md 存在且包含详细分析"
    - "界面截图识别出所有字段、按钮、表单"
    - "流程图识别出所有步骤、分支"
    - "output/images/ 可正常访问"

  on_failure: "停止执行，不允许跳过图片处理"
  reference: "references/guides/image-extraction-guide.md"
```

### 2. 需求验证强制步骤（防误操作）

```yaml
demand_verification_mandatory:
  step_1: "读取 extracted/prd.json 确认需求名称和来源"
  step_2: "向用户展示需求信息并确认"
  step_3: "验证当前目录与需求匹配"
  on_mismatch: "停止执行，拒绝在错误目录操作"
```

---

## 强制约束

1. **执行入口**：必须首先加载 execution-engine.md，不允许其他入口
2. **Pattern 路由**：必须通过 pattern-registry.md 获取路由规则，禁止硬编码
3. **图片处理**：Step 4 图片分析闸门必须通过，不可跳过
4. **风险匹配**：Step 8 必须根据业务对象智能匹配 Risk Pattern
5. **质量保障**：Step 10 去重与规范化是强制步骤
6. **覆盖验证**：Step 12 5项强制校验必须执行，不达标必须返回补充（最多 3 次）

---

## 执行后校验（输出前必须执行）

以下校验在输出测试用例集之前**强制执行**：

### 校验 1：优先级分布检查
| 模式 | P0目标 | P1目标 | P2目标 | P3目标 |
|------|--------|--------|--------|--------|
| 快速 | ≤45% | ≥30% | ≥15% | ≥0% |
| 标准 | 25-40% | 30-45% | 15-30% | 5-15% |
| 深度 | 20-30% | 25-35% | 20-30% | 15-25% |

### 校验 2：风险覆盖检查
- 有状态流转的实体 → 至少触发 STATE-001、STATE-003 中 2 个
- 有数值型字段的实体 → 至少触发 BOUNDARY-001、CONCUR-002 中 2 个
- 涉及并发操作 → 必须有 ≥ 2 条并发用例
- 涉及数据写入 → 必须有 ≥ 1 条数据一致性用例

### 校验 3：参数覆盖检查
- 边界值：min, max, min-1, max+1（数值型参数）
- 枚举值：所有合法值 + 1 个非法值（枚举型参数）
- 必填：参数缺失场景

### 校验 4：结构化断言检查
- P0/P1 用例必须包含结构化断言
- 断言类型：SQL、Response、State、DB

---

## 快速开始示例

### 自动化工作流（推荐）

**用户只需**：把需求文档放在 input/ 目录，告诉我文档路径。

**AI自动完成**：创建需求目录 → 复制文档 → 数据提取 → 生成测试用例

#### 示例 1：从 input/ 目录生成

**用户输入**：
```
为 "input/prd/XX功能PRD.docx" 生成测试用例
```

**AI自动执行**：

```yaml
auto_setup:
  - 读取源文档: "input/prd/XX功能PRD.docx"
  - 生成目录名: "REQ-003-XX功能"
  - 创建目录结构

data_extraction:
  - Word → Markdown: "extracted/prd.md"
  - Word → JSON: "extracted/prd.json"
  - 图片提取到: "output/images/"

test_generation:
  - 读取 "extracted/prd.json"
  - 执行 15-step 测试用例生成流程
  - 输出到: "output/current/test-cases/XX功能-测试用例.md"
```

---

## 注意事项

### 关键执行纪律（按优先级排序）

1. **【最高优先级】图片处理强制流程**
   - **Step 2 必须提取所有内嵌图片**到 `extracted/images/`
   - **必须进行AI视觉分析**，识别界面元素、流程步骤、代码细节
   - **必须输出到** `extracted/images-content.md`
   - **必须确保图片在** `output/images/` 可访问
   - **生成测试用例时必须参考** `images-content.md`
   - **参考文档**：`references/guides/image-extraction-guide.md`
   - ⚠️ **这是最容易遗漏的步骤，必须严格检查**

2. **必须先执行 Step 3 需求验证**
   - 读取 extracted/prd.json 确认需求名称
   - 向用户确认当前操作的需求
   - 检查当前目录是否与需求匹配
   - **不确认不继续**

3. **AI视觉分析优先于OCR**
   - PRD图片必须使用AI视觉分析（Claude Vision）
   - 识别界面元素、流程步骤、代码细节
   - 输出到 extracted/images-content.md
   - 基于识别的细节补充测试用例

4. **严格按执行流程**
   - 必须首先加载 execution-engine.md
   - 不允许跳过任何步骤，不允许更改执行顺序
   - Step 3 需求验证是强制步骤

5. **数据提取完整性**
   - 优先从 `extracted/prd.json` 读取结构化输入
   - 如 extracted/ 目录不存在，先执行 Step 2 数据提取
   - 技术方案文档必须同时参考

### 常见错误预防

| 错误场景 | 后果 | 预防措施 |
|----------|------|----------|
| 操作了错误的需求 | 生成错误需求的用例 | Step 3 强制确认需求身份 |
| **忘记提取图片** | 遗漏界面元素测试场景 | 强制检查extracted/images/目录 |
| **图片未进行AI分析** | 无法识别界面字段和流程 | 强制输出images-content.md |
| **图片位置错误** | 引用失效、无法查看 | 验证output/images/可访问 |
| 图片分析不充分 | 测试用例覆盖不足 | AI视觉分析识别所有字段/按钮/流程 |
| 遗漏技术方案细节 | 接口测试缺失 | 强制检查tech-design.md |
| 覆盖已有用例 | 版本混乱 | 版本策略检查 |

### 图片处理错误案例分析

**错误场景**：CRM需求生成时未正确处理图片

**问题**：
1. 没有从Word文档提取内嵌图片
2. 没有进行AI视觉分析
3. 图片没有放到output/images/目录
4. 生成的测试用例缺少界面元素验证

**根因**：
- Step 2 图片处理流程不明确
- 没有强制检查点
- 未建立images-content.md文件

**解决方案**（已更新到流程）：
1. **新增检查点**：Step 4 增加3个图片处理强制检查点
2. **新增文档**：references/guides/image-extraction-guide.md
3. **更新检查清单**：执行检查清单增加8项图片相关检查
4. **明确流程**：AI视觉分析 → 结构化输出 → 整合到prd.md
