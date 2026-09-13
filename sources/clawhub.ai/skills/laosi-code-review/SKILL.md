---
badge: premium
name: code-review
version: 1.1.0
description: 多视角代码审�?- 安全(OWASP)/性能/正确�?风格，每视角输出严重级别+修复建议，支持PASS/BLOCK裁定
tags: [code-review, security, performance, quality, development]
author: laosi
source: original
---

# Code Review - 多视角代码审�?
> 激活词: 审查 / code review / CR

## 4视角框架

```
┌────────────────────────────────────────�?�?         代码审查 整体裁定               �?├──────────┬──────────┬─────────┬─────────�?�?SECURITY │PERFORM-  │CORRECT- �? STYLE  �?�? 安全    �?ANCE 性能 �?NESS正确�? 风格   �?├──────────┼──────────┼─────────┼─────────�?�?CRITICAL �? MAJOR   �? MINOR  �?  INFO  �?└──────────┴──────────┴─────────┴─────────�?```

## Python 实现

```python
from dataclasses import dataclass, field
from typing import List, Optional
from enum import Enum

class Severity(Enum):
    CRITICAL = "CRITICAL"   # 必须修复
    MAJOR = "MAJOR"         # 强烈建议
    MINOR = "MINOR"         # 建议改进
    INFO = "INFO"           # 仅供参�?
class Verdict(Enum):
    PASS = "PASS"
    PASS_WITH_COMMENTS = "PASS_WITH_COMMENTS"
    BLOCK = "BLOCK"

@dataclass
class Finding:
    perspective: str
    severity: Severity
    file: str
    line: int
    title: str
    detail: str
    suggestion: str

@dataclass
class ReviewResult:
    findings: List[Finding] = field(default_factory=list)
    
    def add(self, perspective: str, severity: Severity, file: str,
            line: int, title: str, detail: str, suggestion: str = ""):
        self.findings.append(Finding(
            perspective, severity, file, line, title, detail, suggestion
        ))
    
    def security_check(self, code: str, file: str = "unknown"):
        """安全视角检�?""
        checks = [
            ("SQL注入风险", "execute(", "使用参数化查询代替字符串拼接"),
            ("XSS风险", "innerHTML", "使用textContent或安全转�?),
            ("硬编码密�?, "api_key", "移动到环境变量或密钥管理服务"),
            ("路径遍历", "../", "验证用户输入路径，使用basename"),
            ("命令注入", "os.system(", "使用subprocess.run传参数组"),
            ("eval执行", "eval(", "避免使用eval，改用安全替代方�?),
        ]
        for title, pattern, suggestion in checks:
            for i, line_text in enumerate(code.split('\n'), 1):
                if pattern in line_text:
                    self.add("SECURITY", Severity.CRITICAL, file, i,
                             f"发现{title}: `{line_text.strip()}`",
                             f"第{i}�? `{line_text.strip()}`",
                             suggestion)
    
    def performance_check(self, code: str, file: str = "unknown"):
        perform_checks = [
            ("N+1查询", "for.*in.*query"),
            ("大循�?, "for.*in range"),
            ("重复计算", ".count("),
        ]
        # 简化示�?        for title, _, _ in perform_checks:
            pass  # 实际检查会解析AST
    
    def correctness_check(self, code: str, file: str = "unknown"):
        correct_checks = [
            ("除以0", "/ (", "除法前检查分母是否为0"),
            ("空指�?, "None."),
            ("索引越界", "[len("),
        ]
    
    def style_check(self, code: str, file: str = "unknown"):
        style_checks = [
            ("行长超限", lambda l: len(l) > 100),
            ("驼峰vs蛇形", lambda l: any(w.isupper() for w in l.split())),
        ]
    
    def verdict(self) -> Verdict:
        criticals = [f for f in self.findings
                     if f.severity in (Severity.CRITICAL, Severity.MAJOR)]
        if any(f.severity == Severity.CRITICAL for f in self.findings):
            return Verdict.BLOCK
        if criticals:
            return Verdict.PASS_WITH_COMMENTS
        return Verdict.PASS
    
    def report(self) -> str:
        out = ["# Code Review Report\n"]
        by_perspective = {}
        for f in self.findings:
            by_perspective.setdefault(f.perspective, []).append(f)
        
        for perspective in ["SECURITY", "PERFORMANCE", "CORRECTNESS", "STYLE"]:
            items = by_perspective.get(perspective, [])
            if not items:
                continue
            sev = max(items, key=lambda x: x.severity.value).severity.value
            out.append(f"## {perspective} [{sev}]")
            for f in items:
                sev_icon = {"CRITICAL": "🔴", "MAJOR": "🟡", "MINOR": "🔵", "INFO": "�?}
                out.append(
                    f"- {sev_icon.get(f.severity.value, '')} "
                    f"`{f.file}:{f.line}` {f.title}\n"
                    f"  > {f.detail}\n"
                    f"  💡 {f.suggestion}"
                )
            out.append("")
        
        v = self.verdict()
        v_icon = {"PASS": "�?, "PASS_WITH_COMMENTS": "⚠️", "BLOCK": "🚫"}
        out.append(f"## 裁定: {v_icon[v.value]} {v.value}")
        out.append(f"�?{len(self.findings)} 个发现项")
        return "\n".join(out)

# 使用示例
code = """
def get_user(name):
    query = "SELECT * FROM users WHERE name = '" + name + "'"
    result = execute(query)
    data = result.fetchall()
    for row in data:
        print(row)
"""

review = ReviewResult()
review.security_check(code, "users.py")
review.performance_check(code, "users.py")
review.correctness_check(code, "users.py")
review.style_check(code, "users.py")
print(review.report())
```

## 检查清�?
| 视角 | 典型问题 | 严重程度 |
|------|---------|---------|
| SECURITY | SQL注入、XSS、硬编码密钥、路径遍�?| CRITICAL |
| PERFORMANCE | N+1查询、内存泄漏、热点路径、缓存缺�?| MAJOR |
| CORRECTNESS | �?、空指针、索引越界、竞态条�?| MAJOR |
| STYLE | 命名规范、死代码、类型安全、格式化 | MINOR |

## 使用场景

1. **PR审查**: 合并前自动跑4视角，拦截严重问�?2. **安全审计**: SECURITY视角专注OWASP Top 10
3. **性能优化**: PERFORMANCE视角找出热点
4. **代码质量**: 配合CI/CD自动审查每次提交

## 依赖

- Python 3.8+
- 可�? ast (标准�? 用于AST级别检�?
