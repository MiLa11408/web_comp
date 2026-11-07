# 机忆书库 · THE MACHINE MEMORY

一座关于人工智能的知识档案馆。前台登记入馆，然后可以：

- **3D 阅览室**：第一人称 WASD + 鼠标转视角，在书架间走动，按 E 取书，书会飞到手上翻开、进入阅读页；楼层由黄铜电梯切换。
- **2D 书架视图**：3D 阅览室的平面简化版，带同款电梯选层，与 3D 楼层双向同步。
- **书架总览**：按楼层列出全部书目、索书号、年份跨度、标签与章节进度。
- **铁路线**：主题分支查找。每条线是一段连续技术史，站点可点击直接打开对应书；支线是岔开的小历史，⇄ 表示两条线在同一本书换乘。
- **卡片目录检索**：优先级为大标题 > 标签 tag > 正文提及次数 > 相关内容；带输入补全。
- **阅读三栏**：左侧可收起的本章/全馆检索，中间正文，右侧页边注。页边注用〔段落名〕锚定正文，点击滚动并高亮；右下角常驻合书键。
- **分级与残页**：四层楼对应四档资料等级（越往上越残破、越神秘），8 张 if 线残页散落在章节里，可拼成一条完整故事线。
- **互动**：接待卡、馆员欢迎语、盖章、批注、阅读进度（需借书证）。

## 技术栈

- 前端：原生 HTML/JS，three.js（本地 vendor），Rapier 物理（本地 vendor），无构建步骤。
- 后端：Fastify 5 + Node 内置 `node:sqlite`，内容以 Markdown + YAML frontmatter 存盘。
- 运行时要求：**Node.js ≥ 22.5**（`node:sqlite` 是内置模块，无需编译）。

## 本地运行

```bash
cd Explore/ai-library
npm install            # 只有 fastify / yaml / three / rapier
npm start              # 默认 http://127.0.0.1:3300
```

改端口：`PORT=3400 npm start`（Windows PowerShell：`$env:PORT=3400; npm start`）。

内容自检：

```bash
npm run verify
```

## 目录

```
Explore/ai-library/
├─ content/
│  ├─ books.json          36 本书的元数据（id / 索书号 / 楼层 / 标签 / 年份跨度）
│  ├─ chapters/<book>/c1.md … c8.md   每本 8 章，YAML frontmatter + Markdown 正文
│  ├─ floors.json         四层分级、残破度、馆员与欢迎语
│  ├─ shelves.json        书架容量配置：booksPerBoard / boardsPerUnit
│  ├─ fragments.json      8 张 if 线残页与收编关系
│  ├─ rail.json           铁路线：5 条主线 + 6 条支线 + 换乘站
│  └─ graph.json          星图骨架（保留字段）
├─ server/src/            Fastify 入口、鉴权、检索、SQLite
├─ web/                   index.html（三视图 + 阅读页）、app3d.js（3D）、vendor/
├─ tools/verify.mjs       内容与数据校验
├─ docs/                  数据/接口/内容规范、分级与废墟图书馆方案、24 本扩容目录
└─ deploy/                systemd / nginx / 部署脚本
```

## 主要接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查，返回已索引章节数 |
| GET | `/api/books` `/api/books/:id` | 书目与单书详情 |
| GET | `/api/catalog` | 全量书目 + 章节索引（3D/视图共用） |
| GET | `/api/floors` `/api/shelves` `/api/fragments` `/api/rail` | 分级 / 书架容量 / 残页 / 铁路线 |
| GET | `/api/chapters/:id` | 单章正文（meta + content） |
| GET | `/api/search?q=` `/api/suggest?q=` | 四级排序检索 / 补全 |
| POST | `/api/register` `/api/login` `/api/logout` | 借书证（注册）与入馆（登录），带限流 |
| GET/POST | `/api/stamps` `/api/annotations` `/api/progress` | 盖章 / 批注 / 阅读进度（需登录） |

完整字段见 `docs/API.md`，内容规范见 `docs/CONTENT.md`。

## 部署

见 **[docs/DEPLOY.md](docs/DEPLOY.md)**：systemd + nginx 子路径 `/ai/` + 端口 3300，附一键部署脚本 `deploy/deploy.sh`。

## 内容与事实

- 每章 1500–2500 汉字，9 段结构，至少 3 条可实开核验的来源（frontmatter 里 `checked: true`）。
- 页边注为馆员调侃体，但事实主张以正文与来源为准。
- 书目扩容到 36 本 × 8 章 = 288 章，目录见 `docs/TOC_EXPANSION.md`。

## 已知限制

- 铁路线只取主干站，不替代逐章阅读。
- 星图台目前是 3D 陈设，`/api/graph` 保留接口但数据未展开。
- 演示用的借书证与批注存在本机 `.data/app.db`，未接邮件验证或第三方登录。
