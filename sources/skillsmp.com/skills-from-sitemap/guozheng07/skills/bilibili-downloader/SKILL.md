---
name: bilibili-downloader
description: 用于下载哔哩哔哩视频并支持截图功能的技能。当用户输入"下载b站"等相关关键词时触发，支持cookie登录、高清视频下载、多种截图模式和自然语言时间戳解析。
---

# Bilibili 视频下载与截图技能

## 功能介绍

本技能用于下载哔哩哔哩（B站）视频并提供截图功能，支持以下特性：

- 支持高清视频下载（默认4K）
- 支持cookie登录（可访问会员内容）
- 自动检测并转码不兼容编码（AV1/HEVC）
- 多种截图模式：固定时间点截图、等间隔截图
- 支持自然语言时间戳解析（如"26分26秒"）
- 跨平台支持（Windows、macOS）

## 触发条件

当用户输入以下关键词时触发本技能：
- "下载b站"
- "B站视频下载"
- "下载哔哩哔哩视频"
- "b站视频截图"

## 工作流程

### 步骤1：获取视频链接

1. 触发技能后，首先询问用户提供B站视频链接
2. 等待用户输入视频链接

### 步骤2：获取Cookie信息

1. 提示用户获取B站Cookie信息的方法：
   - 使用浏览器访问B站并登录
   - 安装Cookie-Editor插件
   - 导出JSON格式的Cookie
   - 复制Cookie内容并粘贴
2. 等待用户输入Cookie信息

### 步骤3：下载视频

1. 使用提供的Cookie信息和视频链接开始下载
2. 默认下载最高清视频（4K）
3. 默认下载路径：
   - Windows：桌面\bilibili_downloads
   - macOS：桌面/bilibili_downloads
4. 显示下载进度
5. 下载完成后显示视频保存位置

### 步骤4：截图操作

1. 询问用户是否需要对下载的视频进行截图
2. 如果用户选择是，说明支持的截图模式：
   - 固定时间点截图：用户指定具体时间点
   - 等间隔截图：按照指定时间间隔自动截图
3. 根据用户选择的模式执行截图操作

### 步骤5：自然语言时间戳解析

当用户选择固定时间点截图时，支持以下自然语言格式：

- "26分26秒" → 转换为 "26:26"
- "1小时30分" → 转换为 "1:30:00"
- "15秒" → 转换为 "15"

## 脚本说明

本技能使用以下脚本：

- `scripts/bilibili_downloader.py`：核心下载和截图功能
- `scripts/chat_handler.py`：处理用户输入和对话流程
- `scripts/time_parser.py`：自然语言时间戳解析

## 参考文档

参考文档位于 `reference/` 目录，包含详细的使用说明和技术文档。

## 使用示例

### 示例1：基本下载流程

用户：下载b站

技能：请提供B站视频链接

用户：https://www.bilibili.com/bangumi/play/ep1231575

技能：请提供B站Cookie信息（JSON格式）

用户：[{"domain":".bilibili.com","name":"SESSDATA","value":"xxx"}]

技能：正在下载视频...
技能：视频下载完成，保存位置：桌面\bilibili_downloads\xxx.mp4
技能：是否需要对视频进行截图？

用户：是

技能：支持的截图模式：
1. 固定时间点截图：例如"00:07:48"
2. 等间隔截图：例如每10分钟一张
请选择截图模式并提供参数

用户：固定时间点，26分26秒

技能：正在截图...
技能：截图完成，保存位置：桌面\bilibili_downloads\screenshots

### 示例2：仅截图操作

用户：下载b站

技能：请提供B站视频链接

用户：https://www.bilibili.com/bangumi/play/ep1231575

技能：请提供B站Cookie信息（JSON格式）

用户：[{"domain":".bilibili.com","name":"SESSDATA","value":"xxx"}]

技能：正在下载视频...
技能：视频下载完成，保存位置：桌面\bilibili_downloads\xxx.mp4
技能：是否需要对视频进行截图？

用户：否

技能：操作完成，视频已保存到桌面\bilibili_downloads

## 注意事项

1. 请确保只下载自己拥有版权或获得授权的内容
2. Cookie信息具有时效性，过期后需要重新获取
3. 部分视频可能需要B站大会员权限才能下载高清版本
4. 下载和转码过程可能需要较长时间，请耐心等待
5. 截图功能需要FFmpeg支持，请确保已安装

## 依赖要求

- Python 3.8+
- yt-dlp
- FFmpeg
- Cookie-Editor浏览器插件（用于获取Cookie）

## 错误处理

- 如果下载失败提示需要登录，请检查Cookie信息是否正确
- 如果视频无法播放，可能需要转码，请重新尝试
- 如果截图失败，请检查FFmpeg是否正确安装

## 输出格式

### 视频保存格式

```
桌面/bilibili_downloads/
├── 视频文件名_分辨率.mp4
└── screenshots/
    ├── 视频文件名_分辨率_screenshot_001_00-00-00.png
    └── ...
```

### 截图命名格式

```
{视频名}_{分辨率}_screenshot_{序号}_{时间}.png
```

例如：`凡人修仙传第167集_2160_screenshot_001_00-07-48.png`

## 技能目录结构

```
bilibili-downloader/
├── SKILL.md          # 技能配置和使用说明
├── scripts/          # 脚本目录
│   ├── bilibili_downloader.py  # 核心下载和截图功能
│   ├── chat_handler.py         # 用户对话处理
│   └── time_parser.py          # 自然语言时间解析
└── reference/        # 参考文档目录
    └── README.md     # 参考文档
```

## 正确运行方法

### 方法1：从技能目录运行

```powershell
# 打开命令提示符或 PowerShell
cd "C:\Users\Administrator\Desktop\bilibili-downloader\scripts"
python chat_handler.py
```

### 方法2：使用完整路径运行

```powershell
# 打开命令提示符或 PowerShell
python "C:\Users\Administrator\Desktop\bilibili-downloader\scripts\chat_handler.py"
```

### 注意事项

- **正确路径**：脚本位于 `bilibili-downloader\scripts\` 目录下
- **避免错误**：不要尝试从其他目录运行脚本，可能会导致路径错误
- **依赖检查**：运行前请确保已安装 Python 3.8+、yt-dlp 和 FFmpeg

## 运行前准备

1. **安装 Python**：从官网下载并安装 Python 3.8 或更高版本
2. **安装 yt-dlp**：运行命令 `pip install yt-dlp`
3. **安装 FFmpeg**：
   - Windows：下载并解压到 `C:\ffmpeg\bin`，然后添加到系统环境变量
   - 或使用 scoop 安装：`scoop install ffmpeg`