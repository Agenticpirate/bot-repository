# 智能图表生成助手 (Smart Chart Generator)

**Author:** `dugufeng`
**Tags:** `language:chinese`, `data-visualization`, `echarts`, `deepseek-coder`, `document-extractor`, `office-automation`
**Dify Version:** `v1.9.2+` (建议使用支持文件上传的最新版本)

这是一个高效的办公辅助工作流，它充当一个“前端可视化专家”。它能自动读取用户上传的 Excel 或 CSV 文件数据，结合 DeepSeek Coder 的代码生成能力，直接输出一个包含 ECharts 交互式图表的完整 HTML 文件。

## 🚀 关键前置条件 (Pre-conditions)

在运行此工作流之前，请确保你的 Dify 环境满足以下条件：

1.  **模型供应商配置:**
    * 此工作流的核心逻辑依赖于 **DeepSeek Coder** (或同类强代码能力的模型)。
    * 请确保在 Dify 的“设置 -> 模型供应商”中配置了 DeepSeek 的 API Key。
    * *(PM 备注: 使用普通聊天模型（如 gpt-3.5）可能会导致生成的 HTML 代码包含语法错误，强烈建议使用 Coder 类模型。)*

2.  **知识库/文件解析能力:**
    * 工作流使用了 `Document Extractor` 节点，这是 Dify 内置功能，无需额外配置，但请确保你的 Dify 版本支持该节点。

---

## 🚀 如何使用

1.  **准备数据:**
    * 准备一个结构清晰的 Excel (`.xlsx`) 或 CSV 文件。
    * **最佳实践:** 表格第一行为表头（维度/指标名称），第一列为主要维度（如日期/产品），后续列为数值。
    * *(示例数据: A列=月份, B列=销售额, C列=利润)*

2.  **运行工作流:**
    * **上传文件:** 在 `file` 输入框中上传你的数据表格。
    * **选择类型:** 在 `chart_type` 下拉菜单中选择你想要的图表形式（支持：柱状图、折线图、饼图、堆叠图）。
    * 点击“运行”。

3.  **获取结果:**
    * 工作流运行结束后，会输出一段 Markdown 格式的代码块 (`html ...`)。
    * 点击代码块右上角的“复制”。
    * 将代码粘贴到记事本并保存为 `.html` 文件，用浏览器打开即可查看可交互的图表（支持悬停提示、图例开关、图片下载）。

## 🛠️ 工作流节点

* **开始节点:** 定义了两个用户输入：`file` (上传 Excel/CSV) 和 `chart_type` (选择图表类型)。
* **文档提取器 (Document Extractor):** Dify 内置核心节点。它自动将用户上传的二进制文件（Excel）解析为 LLM 可读的纯文本字符串。
* **LLM (Frontend Expert):** (使用 `deepseek-coder`) 接收解析后的文本数据和用户指定的图表类型。Prompt 预设了 ECharts 专家的身份，强制要求输出无废话的、包含 CDN 链接的完整 HTML 代码。
* **结束节点:** 将 LLM 生成的 HTML 代码直接输出给用户。

## 📸 工作流截图 (推荐)
![工作流图](screenshot-workflow.png)

## 📸 运行截图 (推荐)
![运行示例](screenshot-run.png)