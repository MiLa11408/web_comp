# API.md · 机忆书库接口契约

> Base: `/api/`，JSON。部署在 `/ai/` 子路径下。
> 鉴权：`Authorization: Bearer <token>`；注册/登录同时下发 HttpOnly Cookie `mm_token`。

## 认证与限流

| 方法·路径 | 入参 | 出参 | 错误 |
|---|---|---|---|
| POST /register | username(3–32), password(≥8), email(可选) | 201 {token, user} | 409 用户名占用；400 校验失败 |
| POST /login | username, password | 200 {token, user} | 401 用户名或密码错误；429 超限 |
| POST /logout | 需登录 | 204，注销会话并清 Cookie | 401 |
| GET /me | 需登录 | {user, stamps, annotations, progress 计数} | 401 |

限流：登录 5 次/30 秒（按 ip+用户名）；注册 10 次/小时（按 ip）。

## 内容

| 方法·路径 | 出参 | 说明 |
|---|---|---|
| GET /books | books.json 全量 | 书单元数据 |
| GET /books/:id | 书元数据 + 该书全部章节的 {id,no,title,title_en,style,year,tags,summary} | 章节列表只含元数据 |
| GET /chapters/:id | {meta, content} | meta=frontmatter，content=正文 Markdown |
| GET /search?q=&limit= | [{id,title,book,book_title,tags,score,snippet}] | 卡片目录检索，默认 limit 10 |
| GET /graph | graph.json | 星图（pending 时返回骨架） |
| GET /rail | rail.json | 轨道（同上） |

## 用户互动（需登录）

| 方法·路径 | 入参 | 出参 |
|---|---|---|
| GET /stamps | — | 全部印章 |
| POST /stamps | {chapter_id, kind:'chapter'|'book'|'route'} | 201 印章（重复 200） |
| GET /annotations?chapter_id= | — | 我的批注 |
| POST /annotations | {chapter_id, quote, note} | 201 批注 |
| GET /progress | — | 我的进度 |
| POST /progress | {chapter_id, state:'started'|'done'} | 200 进度（upsert） |

chapter_id 必须存在于内容索引，否则 400。

## 错误格式

`{"error": {"code": "UNAUTHORIZED", "message": "..."}}`；HTTP 状态：400 / 401 / 404 / 409 / 429 / 500。