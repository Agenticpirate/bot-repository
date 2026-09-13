---
badge: premium
name: git-commit-helper
version: 2.0.0
description: Git助手 - 自动生成提交信息/查看状�?分支管理/diff分析，基于Conventional Commits规范
tags: [git, commit, version-control, development, automation]
author: laosi
source: original
---

# Git Commit Helper - Git操作助手

> 激活词: git / 提交 / commit / 分支

## 功能

- 自动生成Conventional Commits格式的提交信�?- 查看Git状态和变更摘要
- 分支管理（创�?切换/列出�?- Diff分析（变更统计）
- 提交历史查看

## Python 实现

```python
import subprocess, os, json
from datetime import datetime
from typing import Optional, List, Dict

class GitHelper:
    def __init__(self, repo_path: str = None):
        self.repo_path = repo_path or os.getcwd()
    
    def _run(self, cmd: List[str], timeout: int = 10) -> dict:
        """执行git命令"""
        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True,
                timeout=timeout, cwd=self.repo_path
            )
            return {
                "success": result.returncode == 0,
                "stdout": result.stdout.strip(),
                "stderr": result.stderr.strip(),
            }
        except FileNotFoundError:
            return {"success": False, "error": "git not found"}
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "timeout"}
    
    def status(self) -> dict:
        """查看仓库状�?""
        result = self._run(["git", "status", "--short"])
        if not result["success"]:
            return result
        
        files = result["stdout"].split("\n") if result["stdout"] else []
        staged = [f[2:] for f in files if f.startswith("M ") or f.startswith("A ")]
        modified = [f[3:] for f in files if f.startswith(" M")]
        untracked = [f[3:] for f in files if f.startswith("??")]
        
        return {
            "success": True,
            "staged": staged,
            "modified": modified,
            "untracked": untracked,
            "total_changes": len(files),
        }
    
    def diff(self, staged: bool = False) -> dict:
        """查看变更详情"""
        cmd = ["git", "diff", "--stat"]
        if staged:
            cmd.append("--staged")
        result = self._run(cmd)
        if not result["success"]:
            return result
        
        lines = result["stdout"].split("\n") if result["stdout"] else []
        stats = []
        for line in lines[:-1]:  # 最后一行是汇�?            if "|" in line:
                parts = line.split("|")
                stats.append({
                    "file": parts[0].strip(),
                    "changes": parts[1].strip()
                })
        
        summary = lines[-1] if lines else ""
        return {"success": True, "files": stats, "summary": summary}
    
    def generate_commit_message(self) -> str:
        """根据变更自动生成提交信息"""
        status = self.status()
        if not status["success"]:
            return "fix: update files"
        
        staged = status.get("staged", [])
        modified = status.get("modified", [])
        untracked = status.get("untracked", [])
        
        all_files = staged + modified + untracked
        
        if not all_files:
            return "chore: no changes"
        
        # 分析文件类型
        py_files = [f for f in all_files if f.endswith(".py")]
        js_files = [f for f in all_files if f.endswith((".js", ".ts", ".jsx", ".tsx"))]
        md_files = [f for f in all_files if f.endswith(".md")]
        test_files = [f for f in all_files if "test" in f.lower()]
        
        # 判断类型
        if test_files:
            prefix = "test"
        elif py_files or js_files:
            prefix = "feat"
        elif md_files:
            prefix = "docs"
        elif len(all_files) > 5:
            prefix = "refactor"
        else:
            prefix = "fix"
        
        # 生成描述
        if len(all_files) == 1:
            desc = os.path.basename(all_files[0])
        elif len(all_files) <= 3:
            desc = ", ".join(os.path.basename(f) for f in all_files)
        else:
            desc = f"{len(all_files)} files"
        
        return f"{prefix}: update {desc}"
    
    def branches(self) -> dict:
        """列出分支"""
        current = self._run(["git", "branch", "--show-current"])
        all_branches = self._run(["git", "branch", "-a"])
        
        branches = []
        if all_branches["success"]:
            for line in all_branches["stdout"].split("\n"):
                line = line.strip()
                if line.startswith("* "):
                    branches.append({"name": line[2:], "current": True})
                elif line:
                    branches.append({"name": line, "current": False})
        
        return {
            "current": current.get("stdout", ""),
            "branches": branches,
        }
    
    def log(self, limit: int = 5) -> List[dict]:
        """查看提交历史"""
        result = self._run([
            "git", "log", f"--oneline", f"-{limit}",
            "--format=%H|%s|%an|%ai"
        ])
        if not result["success"]:
            return []
        
        commits = []
        for line in result["stdout"].split("\n"):
            if "|" in line:
                parts = line.split("|", 3)
                if len(parts) >= 4:
                    commits.append({
                        "hash": parts[0][:8],
                        "message": parts[1],
                        "author": parts[2],
                        "date": parts[3][:10],
                    })
        return commits
    
    def commit(self, message: str = None) -> dict:
        """提交变更"""
        if not message:
            message = self.generate_commit_message()
        
        # Stage all
        self._run(["git", "add", "-A"])
        # Commit
        result = self._run(["git", "commit", "-m", message])
        return {
            "success": result["success"],
            "message": message,
            "output": result.get("stdout", ""),
        }

# 使用示例
git = GitHelper()

# 查看状�?status = git.status()
print(f"变更: {status.get('total_changes', 0)} 个文�?)
print(f"  已暂�? {len(status.get('staged', []))}")
print(f"  已修�? {len(status.get('modified', []))}")
print(f"  未追�? {len(status.get('untracked', []))}")

# 自动生成提交信息
msg = git.generate_commit_message()
print(f"\n建议提交信息: {msg}")

# 查看分支
branches = git.branches()
print(f"\n当前分支: {branches['current']}")
print(f"所有分�? {[b['name'] for b in branches['branches'][:5]]}")

# 查看最近提�?commits = git.log(3)
print(f"\n最近提�?")
for c in commits:
    print(f"  {c['hash']} {c['message']} ({c['date']})")
```

## Conventional Commits规范

```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

| 类型 | 说明 | 示例 |
|------|------|------|
| feat | 新功�?| feat(auth): add OAuth2 login |
| fix | 修复bug | fix(api): handle null response |
| docs | 文档更新 | docs: update README |
| style | 格式调整 | style: format code with black |
| refactor | 重构 | refactor(db): simplify queries |
| test | 测试 | test: add unit tests for User |
| chore | 杂项 | chore: update dependencies |

## 使用场景

1. **日常提交**: 自动生成规范的提交信�?2. **代码审查**: 快速查看变更摘�?3. **分支管理**: 列出和切换分�?4. **历史追溯**: 查看提交历史和作�?
## 依赖

- Python 3.8+
- git（命令行工具�?
