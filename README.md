# 机忆书库 · THE MACHINE MEMORY

一座关于人工智能的知识档案馆。前台登记入馆，然后可以：

- **3D 阅览室**：第一人称 WASD + 鼠标转视角，在书架间走动，点击书脊抽到手里（`E` 翻开、右键放回、`Q` 叠到 L1 长桌，可叠三摞）；楼层由黄铜电梯切换。建筑细节：护墙板与壁柱、四扇拱形高窗（窗光随楼层变色）、藻井木梁与梁底藏光、黄铜书架标签夹与齿饰檐口、靠墙木滑梯、吊灯烛盘与水晶坠；手机左下虚拟摇杆。L4 右墙的帷幕后藏着一扇不在平面图上的**暗门**，门后是十本「假如之书」。
- **关于本馆**：馆史、内容标准、技术验证，以及一份 **11 步新读者教程**（进门 / 走动 / 取书 / 电梯 / 两套书架 / 检索 / 书轨星图 / 阅读页 / 隐藏玩法 / 暗门 / 手机）。首次入馆会自动跳到教程，之后不再打扰；随时可从顶栏「关于本馆」重看。
- **2D 书架视图**：3D 阅览室的平面简化版，带同款电梯选层，与 3D 楼层双向同步。
- **书架总览**：按楼层列出全部书目、索书号、年份跨度、标签与章节进度。
- **书轨**：一张连贯的主题线路图（5 条主线 + 7 条支线 + 55 个站点）。同一个书名出现在两条线上就是换乘站，悬停会亮起它在别处的所有位置；点站开书，可「发车」重放列车动画。
- **卡片目录检索**：优先级为大标题 > 标签 tag > 正文提及次数 > 相关内容；带输入补全。
- **阅读三栏**：左侧棕色卡片目录（可收起）做本章/全馆检索，中间正文，右侧页边注。页边注用〔段落名〕锚定正文，点击滚动并高亮；右下角常驻合书键；文末有上一章 / 下一章 / 本书目录 / 换乘章节。
- **分级与残页**：四层楼对应四档资料等级（越往上越残破、越神秘），12 张 if 线残页散落在章节里，可拼成一条完整故事线。
- **星图**：「群星环绕」的球心视角，48 本书分布在四层球壳，30 条关系弧线；支持书名定位、重置视线与点星开书；按 `L` 打开不依赖 WebGL 的「关系列表」文字版。
- **前沿书架**：每天凌晨从 arXiv 拉取 cs.AI / cs.CL / cs.CV / cs.LG 最新投稿（`tools/fetch-arxiv.mjs` + systemd timer），只登记标题、作者、摘要与原文链接，按领域筛选，可一键回馆内找同方向的旧书。与已核验馆藏明确分开。
- **暗门 · 假如之书**：L4 的蜡封桌上多了一张盖着红 X 的备忘；沿着它去右墙，点那幅没有拉直的帷幕，后面才会露出铁门。门后放着十本未编目书（1956 达特茅斯、1969 感知机、1974 寒冬、1986 反向传播、1997 深蓝、2012 AlexNet、2017 Transformer、2020 GPT-3、2022 ChatGPT、2024 开源）。打开一本，选<b>符号树 / 神经树 / 具身树</b>任意一条科技树，点「走假如」即可生成一篇约 1400 字、沿该树发展的科幻推测。书架尽头还有一本<b>第十一本 · 未写之书</b>：只接受「如果没有 X 会怎么样」的假设，调用 DeepSeek V3.2 生成一篇只与这个问题相关的小故事，不回答别的问题。
- **顶部导航**：入口太多时可一键向右收起，再按一下展开；收起状态记在本机。
- **盖章与读完**：盖章会在纸面留下「机忆书库 · 已阅」馆藏章（带落章动画），标记读完会记入进度；两者都有二次确认防止误点，确认后按钮仍可再次点击撤销。
- **借阅档案 · 今日可做**：把失窃页、躁动书页、暗门假如之书摊成一张能照着做的清单；「关于本馆」提供作品说明、内容标准与技术规模。
- **馆长导览**：8 站自动巡游（约 3 分钟），带进度条，可暂停/继续、上一步/下一步，支持空格、←→、Esc；适合录演示视频与现场答辩。
- **互动**：接待卡、馆员欢迎语、盖章、批注、阅读进度（需借书证）。

## 技术栈

- 前端：原生 HTML/JS，three.js（本地 vendor），Rapier 物理（本地 vendor），无构建步骤。
- 后端：Fastify 5 + Node 内置 `node:sqlite`，内容以 Markdown + YAML frontmatter 存盘。
- 运行时要求：**Node.js ≥ 22.5**（`node:sqlite` 是内置模块，无需编译）。
- 未写之书：项目根目录 `.env` 配置 `DEEPSEEK_API_KEY`（SiliconFlow，模型 `deepseek-ai/DeepSeek-V3.2`）与可选的 `DEEPSEEK_BASE_URL` / `DEEPSEEK_MODEL`；`.env` 已加入 `.gitignore`，不提交密钥。未配置时页面会提示「馆长的密钥还没插上」。

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

端到端 / 兼容性 / 性能冒烟（使用本机 Chrome 或 Edge，不起下载浏览器）：

```bash
npm run test:e2e
```

## 目录

```
Explore/ai-library/
├─ content/
│  ├─ books.json          48 本书的元数据（id / 索书号 / 楼层 / 标签 / 年份跨度）
│  ├─ chapters/<book>/c1.md … c8.md   每本 8 章，YAML frontmatter + Markdown 正文
│  ├─ floors.json         四层分级、残破度、馆员与欢迎语
│  ├─ shelves.json        书架容量配置：booksPerBoard / boardsPerUnit
│  ├─ fragments.json      12 张 if 线残页与收编关系
│  ├─ rail.json           书轨：5 条主线 + 7 条支线 + 换乘站
│  ├─ whatif.json         暗门后的十本假如之书（分岔点 / 火花 / 转折 / 归返）
│  └─ graph.json          星图骨架：48 个节点 + 30 条跨主题关系边
├─ server/src/            Fastify 入口、鉴权、检索、SQLite
├─ web/                   index.html（三视图 + 阅读页）、app3d.js（3D）、whatif.js（暗门书架与三条科技树）、vendor/
├─ tools/verify.mjs       内容与数据校验
├─ tests/e2e.mjs          端到端 / 移动端 / 性能冒烟
├─ docs/                  数据/接口/内容规范、分级与废墟图书馆方案、24 本扩容目录
└─ deploy/                systemd / nginx / 部署脚本
```

> `npm install` 会安装 `playwright-core`（仅测试用，不下载浏览器）。生产部署可用 `npm ci --omit=dev`，不装测试依赖。

## 主要接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查，返回已索引章节数 |
| GET | `/api/books` `/api/books/:id` | 书目与单书详情 |
| GET | `/api/catalog` | 全量书目 + 章节索引（3D/视图共用） |
| GET | `/api/floors` `/api/shelves` `/api/fragments` `/api/rail` | 分级 / 书架容量 / 残页 / 书轨 |
| GET | `/api/frontier` | 前沿书架：arXiv 每日入库的标题/作者/摘要/原文链接 |
| GET | `/api/models` `/api/failures` `/api/stolen` `/api/restless` `/api/whatif` | 尺寸墙 / 失败博物馆 / 失窃页 / 躁动书页 / 暗门十本假如之书 |
| GET | `/api/chapters/:id` | 单章正文（meta + content） |
| GET | `/api/search?q=` `/api/suggest?q=` | 四级排序检索 / 补全 |
| POST | `/api/register` `/api/login` `/api/logout` | 借书证（注册）与入馆（登录），带限流 |
| GET/POST | `/api/stamps` `/api/annotations` `/api/progress` | 盖章 / 批注 / 阅读进度（需登录） |

完整字段见 `docs/API.md`，内容规范见 `docs/CONTENT.md`。

## 部署与访问

见 **[docs/DEPLOY.md](docs/DEPLOY.md)**：systemd + nginx 子路径 `/ai/` + 端口 3300，附一键部署脚本 `deploy/deploy.sh`。

线上访问：**http://150.158.1.111/ai/**（推荐，直接可用，无需处理证书警告）。`https://150.158.1.111/ai/` 也可用，但为自签证书，浏览器会提示不安全。根路径 `/` 仍是原导学系统，不受影响。

## 内容与事实

- 每章 1500–2500 汉字，9 段结构，至少 3 条可实开核验的来源（frontmatter 里 `checked: true`）。
- 页边注为馆员调侃体，但事实主张以正文与来源为准。
- 书目扩容到 48 本 × 8 章 = 384 章，目录见 `docs/TOC_EXPANSION.md` 与 `docs/TOC_EXTRA_12.md`。

## 已知限制

- 书轨只取主干站，不替代逐章阅读。
- 星图依赖 `content/graph.json`：48 个节点、30 条人工关系边；新增书时需要同步补边，否则那本书会孤悬在球壳上。
- 演示用的借书证与批注存在本机 `.data/app.db`，未接邮件验证或第三方登录。
