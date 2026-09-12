---
name: cad-mcp
description: Control 2D CAD software (AutoCAD, GstarCAD, ZWCAD) via Python COM interface with natural language commands. Covers full drafting workflow: shapes, text, dimensions, layers, file save. Use when user mentions AutoCAD, 2D CAD, CAD automation, engineering drawing, CAD绘图, 工程制图, 图纸绘制, DWG文件, 浩辰CAD, 中望CAD.
---

# CAD-MCP 自动化技能

## 快速开始

### 环境要求

- Windows 系统 + CAD 软件已安装（AutoCAD、浩辰CAD 或中望CAD）
- Python 3.8+ + `pywin32`（`pip install pywin32`）
- `mcp` 库（`pip install mcp`）

### 启动 CAD-MCP 服务器

```bash
python src/server.py
```

### 在 Claude Desktop 中配置

将以下配置添加到 `claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "CAD-MCP": {
      "command": "python",
      "args": [
        "C:\\path\\to\\.claude\\skills\\cad-mcp\\src\\server.py"
      ]
    }
  }
}
```

## 核心功能

CAD-MCP 服务器提供以下主要功能：

| 功能 | 命令 | 自然语言示例 |
|------|------|--------------|
| 绘制直线 | `draw_line` | "画一条从 (0,0) 到 (100,100) 的线" |
| 绘制圆形 | `draw_circle` | "画一个半径为 50 的圆" |
| 绘制圆弧 | `draw_arc` | "画一个半径为 100 的圆弧" |
| 绘制矩形 | `draw_rectangle` | "画一个 200x150 的矩形" |
| 绘制多段线 | `draw_polyline` | "画一个多边形" |
| 添加文本 | `draw_text` | "添加文字 '注释'" |
| 添加标注 | `add_dimension` | "添加尺寸标注" |
| 绘制填充 | `draw_hatch` | "填充图案" |
| 保存图纸 | `save_drawing` | "保存图纸" |
| 处理自然语言命令 | `process_command` | "画一个红色的圆" |

## 使用流程

1. 确保 CAD 软件已安装并运行
2. 启动 CAD-MCP 服务器
3. 通过自然语言指令控制 CAD 绘图
4. 使用 `save_drawing` 保存为 DWG 文件

## 配置文件

配置文件位于 `src/config.json`，包含以下设置：

```json
{
  "server": {
    "name": "CAD MCP 服务器",
    "version": "1.0.0"
  },
  "cad": {
    "type": "AUTOCAD",
    "startup_wait_time": 20,
    "command_delay": 0.5
  },
  "output": {
    "directory": "./output",
    "default_filename": "cad_drawing.dwg"
  }
}
```

- **cad.type**: CAD 软件类型（AUTOCAD、GCAD、GSTARCAD、ZWCAD）
- **startup_wait_time**: CAD 启动等待时间（秒）
- **command_delay**: 命令执行延迟（秒）

## 自然语言处理

CAD-MCP 内置自然语言处理器，支持识别：

- **颜色**: 红色、蓝色、绿色、黄色等
- **形状**: 直线、圆、矩形、圆弧等
- **动作**: 画、绘制、添加、修改、保存等
- **参数**: 坐标、尺寸、半径、角度等

## 示例命令

```
"画一个红色的圆，半径为 50，圆心在 (100,100)"
"画一个 200x150 的矩形，填充蓝色"
"添加文字 '设计说明' 到 (50,50)"
"保存当前图纸为 'my_drawing.dwg'"
```

## 项目结构

```
cad-mcp/
├── src/
│   ├── __init__.py
│   ├── cad_controller.py    # CAD 控制器
│   ├── nlp_processor.py     # 自然语言处理器
│   ├── server.py            # MCP 服务器
│   └── config.json          # 配置文件
├── package.json
├── SKILL.md
└── requirements.txt
```

## 故障排除

1. **无法连接 CAD**: 确保 CAD 软件已运行，检查 COM 接口权限
2. **命令执行失败**: 检查 `command_delay` 设置，增加延迟时间
3. **文件保存失败**: 确保输出目录存在且有写入权限
4. **中文支持问题**: 检查系统区域设置和编码配置