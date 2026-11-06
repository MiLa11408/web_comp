# DATA.md · 机忆书库数据契约

> 本文件是数据结构的唯一事实来源。改结构必须先改这里，再改代码与内容。
> 原则：内容全部是数据文件（改数据不改代码）；数据库只存用户态与互动，不存正文。

## 1. 内容文件（content/）

| 文件 | 内容 | 状态 |
|---|---|---|
| `books.json` | 12 本书元数据 | 阶段 1 |
| `chapters/<book>/<no>.md` | 96 章正文（frontmatter + 9 段 Markdown） | 阶段 1 起 |
| `graph.json` | 星图：概念节点与关系边 | 骨架，阶段 4 填 |
| `rail.json` | 火车轨道：7 条谱系线、站、换乘 | 骨架，阶段 4 填 |
| `timeline.json` | 时间轴 80 条事件 | 阶段 3 |
| `failures.json` | 失败博物馆 20 件 | 阶段 3 |
| `models.json` | 模型尺寸墙 12 项 | 阶段 3 |
| `assets.json` | 全部外部素材来源+许可登记 | 阶段 2 起，缺记录不用 |

### 1.1 books.json（条目）

```json
{
  "id": "b1",
  "call": "A",
  "title": "序卷：何为智能",
  "title_en": "What Is Intelligence",
  "floor": "L1",
  "style": "history",
  "span": [1943, 2026],
  "chapters": 8,
  "color": "#5b2e2a",
  "aliases": ["图灵测试", "AI 起源", "智能定义"]
}
```

- `id`：b1–b12，对应 TOC 书序；`call`：索书号 A–L，唯一
- `floor`：L1 历史典藏 / L2 技术工坊 / L3 产业观察 / L4 未编目地库
- `style`：history / tech / industry / frontier，决定章节排版材质

### 1.2 章节文件 frontmatter

```yaml
---
id: "b1-c3"              # 索书号：书-章，全区唯一
book: "b1"
no: 3                     # 1–8
title: "达特茅斯会议"
title_en: "The Dartmouth Conference"
style: "history"          # 与所属书一致
year: "1956"              # 章主题的年代锚点（可为区间 "1969–1980"）
people:
  - name: "John McCarthy"
    org: "Dartmouth College"
tags: ["达特茅斯", "符号主义"]   # ≥2，中文为主
relations:
  prev: ["b1-c2"]         # 前置章 id 数组，可空
  next: ["b1-c4"]         # 后继章 id 数组，可空
  transit: []             # 轨道换乘/跨书跳转：站 id 或图节点 id，可空
features: []              # 挂载标记："stolen:slug" / "demo:slug" / "failure:slug" / "model:slug"
summary: "一句话：它是什么"   # 10–200 字
sources:
  - title: "Turing, Computing Machinery and Intelligence"
    url: "https://..."
    kind: "paper"         # paper / book / official / report / archive / site
    license: "PD"         # PD / CC0 / CC-BY / fair-quote / web
    checked: true         # 必须是 true：已实际打开核验
    note: "用于「时间·人物·机构」段"
---
```

正文 = 9 个二级标题段落（写作规范见 [CONTENT.md](CONTENT.md)）。

## 2. 星图 graph.json（骨架）

```json
{
  "pending": true,
  "nodes": [
    {"id": "n1", "label": "图灵测试", "en": "Turing Test", "group": "concept", "chapter": "b1-c1", "year": 1950}
  ],
  "edges": [
    {"from": "n1", "to": "n2", "type": "precursor|successor|rival|fusion|inspiration"}
  ]
}
```

`group`：concept / event / person / paper。未完成前 `pending: true`，verify 只查格式。

## 3. 火车轨道 rail.json（骨架）

```json
{
  "pending": true,
  "lines": [
    {
      "id": "R1", "name": "符号主义线", "color": "#c8a24a", "span": [1956, 1993],
      "stations": [
        {"id": "R1-S1", "name": "达特茅斯", "year": 1956,
         "kind": "origin|breakthrough|fusion|decline", "chapter": "b1-c3"}
      ]
    }
  ],
  "transfers": [{"at": "R1-S1", "lines": ["R1", "R4"]}]
}
```

7 条线、约 50 站、9 换乘，阶段 4 填满。

## 4. 数据库（.data/app.db，node:sqlite）

| 表 | 字段 | 说明 |
|---|---|---|
| users | id TEXT PK, username TEXT UNIQUE, password_hash TEXT, email TEXT NULL, created_at TEXT | scrypt 哈希 |
| sessions | token TEXT PK, user_id TEXT →users, expires_at INTEGER | 14 天 |
| stamps | id INTEGER PK, user_id, chapter_id, kind TEXT CHECK('chapter','book','route'), created_at, UNIQUE(user_id,chapter_id,kind) | 借阅印章 |
| annotations | id INTEGER PK, user_id, chapter_id, quote TEXT, note TEXT, created_at | 批注 |
| progress | user_id, chapter_id, state TEXT CHECK('started','done'), read_at TEXT, PRIMARY KEY(user_id,chapter_id) | 阅读进度 |

用户态与互动数据存库；正文永远只存 content/。

## 5. 检索索引

启动时内存构建：章 title(权重6)/tags(5)/书籍 aliases(5)/summary(3)/people+小标题(3)/正文(1)。
中文切二元组 + 英文小写分词去停用词。96 章规模 <1ms。

## 6. 校验工具 tools/verify.mjs

`npm run verify`：结构全检（字段/字数≥1500/来源≥3 且 checked/关系双向/索书号唯一/id 存在），全绿退出码 0。
`npm run verify:links`：额外 HEAD 核验全部来源 URL 可达。