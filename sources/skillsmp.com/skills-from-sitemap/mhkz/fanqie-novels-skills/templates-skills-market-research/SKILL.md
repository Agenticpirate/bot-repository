---
name: fanqie-rank
description: "当用户需要获取番茄小说榜单数据（新书榜、阅读榜）时使用此技能 - 分析番茄小说各分类竞争程度、获取热门书籍信息（书名、作者、简介、在读数、字数）、了解当前市场趋势和热门题材"
allowed-tools: Read, Bash
---

# 番茄榜单抓取 (fanqie-rank)

当用户需要获取番茄小说榜单数据（新书榜、阅读榜）时使用此技能。

## 触发词

番茄榜单、新书榜、阅读榜、榜单数据、抓取榜单、fanqie rank

## 使用场景

- 分析番茄小说各分类竞争程度
- 获取热门书籍信息（书名、作者、简介、在读数、字数）
- 了解当前市场趋势和热门题材

## 榜单URL格式

```
https://fanqienovel.com/rank/{gender}_{type}_{category_id}
```

参数说明：
- `gender`: 1=男频, 0=女频
- `type`: 1=新书榜, 2=阅读榜
- `category_id`: 分类ID

## 分类ID映射

### 男频分类 (19个)

| ID | 分类名 | ID | 分类名 |
|----|--------|----|--------|
| 1141 | 西方奇幻 | 1140 | 东方仙侠 |
| 8 | 科幻末世 | 261 | 都市日常 |
| 124 | 都市修真 | 1014 | 都市高武 |
| 273 | 历史古代 | 27 | 战神赘婿 |
| 263 | 都市种田 | 258 | 传统玄幻 |
| 272 | 历史脑洞 | 539 | 悬疑脑洞 |
| 262 | 都市脑洞 | 257 | 玄幻脑洞 |
| 751 | 悬疑灵异 | 504 | 抗战谍战 |
| 746 | 游戏体育 | 718 | 动漫衍生 |
| 1016 | 男频衍生 | | |

### 女频分类 (18个)

| ID | 分类名 | ID | 分类名 |
|----|--------|----|--------|
| 1139 | 古风世情 | 8 | 科幻末世 |
| 746 | 游戏体育 | 1015 | 女频衍生 |
| 248 | 玄幻言情 | 23 | 种田 |
| 79 | 年代 | 267 | 现言脑洞 |
| 246 | 宫斗宅斗 | 539 | 悬疑脑洞 |
| 253 | 古言脑洞 | 24 | 快穿 |
| 749 | 青春甜宠 | 745 | 星光璀璨 |
| 747 | 女频悬疑 | 750 | 职场婚恋 |
| 748 | 豪门总裁 | 1017 | 民国言情 |

## 竞争程度分级

根据榜首在读数判断：
- 🔴🔴 超红海: >50万在读
- 🔴 红海: 30-50万在读
- 🟡 中等偏高: 25-30万在读
- 🟡 中等: 20-25万在读
- 🟢 蓝海: <20万在读

## 技术要点

### 字体加密问题

番茄小说榜单页面使用字体加密，直接提取会得到乱码。

**解决方案**: 通过书籍详情页 `/page/{bookId}` 获取真实书名，该页面不使用字体加密。

### 数据提取

页面数据存储在 `window.__INITIAL_STATE__` JSON中：
- `rank.book_list`: 书籍列表
- 每本书包含: `bookId`, `bookName`(加密), `author`(加密), `abstract`(加密), `read_count`, `wordNumber`

## Python抓取代码

```python
#!/usr/bin/env python3
import json
import re
import urllib.request
import time
from pathlib import Path

# 分类映射
MALE_CATEGORIES = {
    "1141": "西方奇幻", "1140": "东方仙侠", "8": "科幻末世",
    "261": "都市日常", "124": "都市修真", "1014": "都市高武",
    "273": "历史古代", "27": "战神赘婿", "263": "都市种田",
    "258": "传统玄幻", "272": "历史脑洞", "539": "悬疑脑洞",
    "262": "都市脑洞", "257": "玄幻脑洞", "751": "悬疑灵异",
    "504": "抗战谍战", "746": "游戏体育", "718": "动漫衍生",
    "1016": "男频衍生"
}

FEMALE_CATEGORIES = {
    "1139": "古风世情", "8": "科幻末世", "746": "游戏体育",
    "1015": "女频衍生", "248": "玄幻言情", "23": "种田",
    "79": "年代", "267": "现言脑洞", "246": "宫斗宅斗",
    "539": "悬疑脑洞", "253": "古言脑洞", "24": "快穿",
    "749": "青春甜宠", "745": "星光璀璨", "747": "女频悬疑",
    "750": "职场婚恋", "748": "豪门总裁", "1017": "民国言情"
}

def fetch_rank_page(gender, rank_type, category_id):
    """获取榜单页面HTML"""
    url = f"https://fanqienovel.com/rank/{gender}_{rank_type}_{category_id}"
    headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode('utf-8')

def parse_initial_state(html):
    """从HTML提取__INITIAL_STATE__数据"""
    match = re.search(r'window\.__INITIAL_STATE__\s*=\s*({.*?});', html, re.DOTALL)
    if match:
        return json.loads(match.group(1))
    return None

def get_real_book_info(book_id):
    """从书籍详情页获取真实信息（绕过字体加密）"""
    url = f"https://fanqienovel.com/page/{book_id}"
    headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read().decode('utf-8')

        book_name = re.search(r'"bookName":"([^"]*)"', content)
        author = re.search(r'"author":"([^"]*)"', content)
        abstract = re.search(r'"abstract":"([^"]*)"', content)

        return {
            'bookName': book_name.group(1) if book_name else None,
            'author': author.group(1) if author else None,
            'abstract': abstract.group(1) if abstract else None
        }
    except Exception as e:
        print(f"获取书籍 {book_id} 失败: {e}")
        return None

def get_competition_level(top_read):
    """根据榜首在读数判断竞争程度"""
    read_wan = top_read / 10000
    if read_wan > 50:
        return "🔴🔴 超红海"
    elif read_wan > 30:
        return "🔴 红海"
    elif read_wan > 25:
        return "🟡 中等偏高"
    elif read_wan > 20:
        return "🟡 中等"
    else:
        return "🟢 蓝海"

def scrape_category(gender, rank_type, category_id, category_name):
    """抓取单个分类的榜单数据"""
    print(f"正在抓取: {category_name}")

    html = fetch_rank_page(gender, rank_type, category_id)
    data = parse_initial_state(html)

    if not data or 'rank' not in data:
        return None

    book_list = data['rank'].get('book_list', [])[:10]
    results = []

    for i, book in enumerate(book_list, 1):
        book_id = book.get('bookId', '')
        read_count = int(book.get('read_count', 0))
        word_count = int(book.get('wordNumber', 0))

        # 获取真实书籍信息
        real_info = get_real_book_info(book_id)
        time.sleep(0.3)  # 避免请求过快

        if real_info:
            results.append({
                'rank': i,
                'name': real_info['bookName'],
                'author': real_info['author'],
                'abstract': real_info['abstract'],
                'read': read_count / 10000,  # 转换为万
                'words': word_count / 10000
            })

    return results

def generate_markdown(all_data, title="番茄小说榜单数据"):
    """生成Markdown格式报告"""
    lines = [f"# {title}", "", f"> 数据采集时间：{time.strftime('%Y-%m-%d')}", ""]

    # 按竞争程度排序
    sorted_cats = sorted(all_data.items(),
                        key=lambda x: x[1]['top_read'], reverse=True)

    for cat_name, cat_data in sorted_cats:
        level = cat_data['level']
        top_read = cat_data['top_read']

        lines.append(f"## {cat_name}（榜首{top_read:.1f}万在读）{level}")
        lines.append("")

        for book in cat_data['books']:
            lines.append(f"**【{book['rank']}】《{book['name']}》**")
            lines.append(f"- 作者：{book['author']}")
            lines.append(f"- 在读：{book['read']:.1f}万 | 字数：{book['words']:.1f}万")
            if book['abstract']:
                abstract = book['abstract'][:100] + "..." if len(book['abstract']) > 100 else book['abstract']
                lines.append(f"- 简介：{abstract}")
            lines.append("")

        lines.append("---")
        lines.append("")

    return "\n".join(lines)

# 主函数示例
def main():
    gender = 1  # 1=男频, 0=女频
    rank_type = 1  # 1=新书榜, 2=阅读榜
    categories = MALE_CATEGORIES if gender == 1 else FEMALE_CATEGORIES

    all_data = {}

    for cat_id, cat_name in categories.items():
        books = scrape_category(gender, rank_type, cat_id, cat_name)
        if books:
            top_read = books[0]['read'] if books else 0
            all_data[cat_name] = {
                'level': get_competition_level(top_read * 10000),
                'books': books,
                'top_read': top_read
            }
        time.sleep(1)  # 分类间隔

    # 生成报告
    md = generate_markdown(all_data, "番茄小说男频新书榜 TOP10")

    # 保存文件
    output_path = Path("fanqie-newbook-data.md")
    output_path.write_text(md, encoding='utf-8')
    print(f"数据已保存到: {output_path}")

if __name__ == "__main__":
    main()
```

## 使用方法

1. **快速抓取**: 运行上述Python脚本
2. **自定义参数**: 修改 `gender` 和 `rank_type` 变量
3. **输出位置**: 默认保存到当前目录的 `fanqie-newbook-data.md`

## 已有数据文件

最新抓取的完整数据保存在：
- `novel-writer-skills/templates/knowledge-base/genres/fanqie-male-newbook-top10.md`
- `novel-writer-skills/templates/knowledge-base/genres/fanqie-trends-2025.md`

## 注意事项

1. 请求间隔建议 0.3-1 秒，避免被封IP
2. 榜单数据每天下午3点更新
3. 新书榜要求：30万字以下、已签约、未断更
4. 阅读榜要求：30万字以上、已签约、已推荐
