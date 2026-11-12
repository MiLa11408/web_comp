# 机忆书库 · 概要设计说明书

**动态组 · 塔之诅咒队 · 盛梓杨 · 2421010219**

---

## 1. 创意介绍

### 1.1 灵感来源

本作品灵感来源于两个观察:

1. **知识的空间性**: 实体图书馆通过楼层、书架、索书号构建空间秩序,而现有AI知识网站多为平铺列表,缺乏层次感与探索性。
2. **档案的不完整性**: 真实档案馆里存在残页、失窃、未编目文件,这些"缺失"本身就是历史的一部分。

我们希望把AI史做成一座**可以走进去的档案馆**,让楼层=知识分级、书轨=主题线路、残页=历史缺失,把"查找"变成"探索"。

**参考**: 
- 视觉风格借鉴波士顿公共图书馆McKim大楼(古典主义+黄铜细节)
- 交互逻辑参考《废墟图书馆》的接待卡与楼层系统
- 内容组织参考维基百科的来源标注与双向链接

### 1.2 设计理念

**核心思路**: 空间即信息架构

- **垂直轴(楼层)**: L1公开 → L2内部 → L3机密 → L4绝密,回答"信不信"
- **水平轴(书轨)**: 6条主题线路+7条支线,回答"按什么顺序读"
- **关系轴(星图)**: 56本书的50条跨主题关系弧线,回答"谁和谁有关系"

**三个"不"原则**:
1. 不做百科(每章2000+字深度内容,不只是摘要)
2. 不藏来源(每章≥3条实开核验来源)
3. 不下结论(假如/推测单独标注,史实与观点明确分离)

---

## 2. 系统架构

### 2.1 技术选型

| 层级 | 技术栈 | 选型理由 |
|------|--------|----------|
| 前端 | 原生HTML/JS + three.js + Rapier | 无构建步骤,任何Node≥22.5机器可直接运行 |
| 后端 | Fastify 5 + node:sqlite | 零数据库服务,单文件持久化 |
| 内容 | Markdown + YAML frontmatter | 内容与代码分离,便于校对与版本控制 |
| 部署 | systemd + nginx子路径 | 标准Linux服务,易于运维 |
| 测试 | Playwright + 自研verify工具 | 151项E2E覆盖关键路径 |

**配色方案**:
- 主色: `#2b1d12`(深棕) `#3a291a`(暖棕) `#e6d6b2`(米黄)
- 强调色: `#c8a882`(黄铜) `#8a2626`(深红) `#6b4e71`(暗紫)
- 字体: 衬线正文(Georgia)、等宽代码(Consolas)、楷体引用

### 2.2 系统分层

```
┌─────────────────────────────────────┐
│   用户层 (Browser)                   │
│   - 3D阅览室 (three.js + Rapier)     │
│   - 2D书架/总览/书轨/星图            │
│   - 阅读三栏 + 检索 + 前沿观察        │
└─────────────────────────────────────┘
              ↓ HTTP/WebSocket
┌─────────────────────────────────────┐
│   应用层 (Fastify)                   │
│   - 鉴权中间件 (scrypt + token)      │
│   - 检索引擎 (四级排序)              │
│   - 内容路由 (catalog/chapters/...)  │
│   - 异常馆藏 (残页/失窃/躁动)        │
└─────────────────────────────────────┘
              ↓ SQL
┌─────────────────────────────────────┐
│   数据层 (SQLite)                    │
│   - users (密码/session)             │
│   - reads/stamps/annotations/progress│
│   - collectibles (残页/失窃/分岔)    │
└─────────────────────────────────────┘
              ↓ File I/O
┌─────────────────────────────────────┐
│   内容层 (Markdown + JSON)           │
│   - 448章 × 9段结构                  │
│   - 书目/楼层/书轨/星图元数据        │
└─────────────────────────────────────┘
```

### 2.3 核心模块

**① 3D渲染引擎** (`web/app3d.js`, 2100行)
- 场景管理: 四层独立布景、书架程序化生成、道具实例化
- 物理交互: Rapier碰撞检测、书本抽取/堆叠、电梯转场
- 性能优化: 静态合批(566 draw calls)、低配降级、2D暂停渲染

**② 检索引擎** (`server/src/search.js`, 450行)
- 倒排索引: 中文二元组 + 英文词干 + 拼音首字母
- 四级排序: 书名(权重14) > tag(8) > 标题(12) > 正文频次
- 编辑距离容错: 英文≤1、拼音≤1自动纠正

**③ 内容校验** (`tools/verify.mjs`, 380行)
- 强制规则: 字数1500-2500、来源≥3且checked:true、关系双向
- 自动修复: 索书号冲突、概念引用缺失提示
- 零容忍: verify必须全绿才能部署

---

## 3. 功能设计

### 3.1 核心功能

**F1. 空间探索**
- 3D第一人称WASD移动 + 鼠标视角
- 点书抽到手里(E翻开/Q叠桌/右键放回)
- 黄铜电梯入舱转场(门开→黑场切层→到站)
- 四层差异化: 书架材质/吊灯/高窗/陈设/馆员语气

**F2. 内容检索**
- 卡片目录: 四级排序 + 命中高亮 + 侧栏跳转
- 书架总览: 56本书按楼层/索书号/年份列表
- 输入补全: 书名/章节/人物/标签边输边出
- 概念手册: 16个核心概念 × 四镜路径

**F3. 知识导航**
- 书轨: 6主线+7支线+63站,换乘站亮起同书所有位置
- 星图: 球心视角56节点+50条关系弧线+流星动画
- 时间轴: 448张年代卡按9个时期分组
- 前沿观察: arXiv每日入库 + 中文科普编译

**F4. 异常馆藏**
- 12张if线残页: 散在章节/3D地板,可拼合成故事线
- 9件失窃页: 锁在3D展柜,读到章末才能追回
- 12件躁动书页: 先"收容"再"归位"到正确章节
- 隐藏书: 读够12章才显形的《未编目·第七码》

**F5. L4暗门**
- 线索链: 蜡封桌红X备忘 → 右墙帷幕 → 铁门
- 十本假如之书: 选科技树(符号/神经/具身)生成1400字推测
- 未写之书: 接受"如果没有X会怎么样",调DeepSeek生成小故事

### 3.2 交互设计

**阅读页三栏布局**:
```
┌────────┬──────────────┬────────┐
│ 左栏   │ 中栏         │ 右栏   │
│ 检索   │ 正文         │ 页边注 │
│ (可收起)│ 9段结构      │ 锚定跳转│
│        │ 接待卡       │ 本章概念│
│        │ 上/下一章    │ 我的批注│
└────────┴──────────────┴────────┘
```

**新手引导**: 分区域提示卡(第一次到哪才在哪出现)
- 3D阅览室 → 书架视图 → 总览 → 平面图 → 书轨 → 星图...
- 关于本馆里保留11步完整手册 + "重置新手提示"

**馆长导览**: 8站自动巡游(约3分钟)
- 进度条 + 暂停/继续 + 上一步/下一步
- 空格暂停、←→切站、Esc退出

---

## 4. 数据设计

### 4.1 内容数据模型

**书目元数据** (`content/books.json`)
```json
{
  "id": "b1",
  "callNumber": "A",
  "floor": "L1",
  "level": "I",
  "title": "序卷·AI简史",
  "title_en": "PRELUDE: A Brief History",
  "tags": ["历史", "科普", "入门"],
  "yearSpan": [1936, 2026],
  "supplement": false
}
```

**章节数据** (`content/chapters/b1/c3.md`)
```yaml
---
id: b1-c3
title: 达特茅斯会议
title_en: The Dartmouth Conference
year: 1956
people: [John McCarthy, Marvin Minsky, Claude Shannon]
tags: [达特茅斯, 人工智能, 起源]
sources:
  - text: McCarthy et al. 1955 proposal
    url: http://...
    checked: true
features: []
---

## 先看这里
1956年夏天,十个人关在一栋楼里两个月...

## 时间·人物·机构
...
```

### 4.2 数据库模式

**用户与会话** (SQLite schema)
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  reader_id TEXT UNIQUE,
  password_hash TEXT,
  created_at INTEGER
);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER,
  created_at INTEGER,
  expires_at INTEGER
);
```

**阅读记录与收藏**
```sql
CREATE TABLE reads (
  reader_id TEXT,
  chapter_id TEXT,
  book_id TEXT,
  read_at INTEGER,
  PRIMARY KEY (reader_id, chapter_id, read_at)
);

CREATE TABLE collectibles (
  reader_id TEXT,
  kind TEXT,  -- 'fragment'|'stolen'|'restless'|'fork'
  item_id TEXT,
  state TEXT,
  updated_at INTEGER,
  PRIMARY KEY (reader_id, kind, item_id)
);
```

---

## 5. 安全设计

### 5.1 密码与会话

- **密码**: scrypt慢哈希(N=16384, r=8, p=1) + 32字节随机盐
- **会话**: HMAC-SHA256签名token,HttpOnly Cookie(Lax)
- **限流**: 注册10次/10分钟/IP,登录同,未写之书8次/10分钟/IP+reader

### 5.2 输入校验

- SQL: 全部走参数化查询(`db.prepare().run(params)`)
- API: 批注引文≤2000字,未写之书格式白名单
- XSS: 用户内容进DOM前转义(textContent/setAttribute)

### 5.3 密钥管理

- `.env`文件存项目根(权限600)
- 不进git(.gitignore)、不进压缩包(robocopy /XF)
- 提供`.env.example`占位

---

## 6. 性能优化

### 6.1 前端优化

- **3D静态合批**: 549 mesh → 566 draw calls(-27%)
- **Rapier延迟加载**: 门厅不下载4.3MB物理包
- **低配降级**: <760px或内存≤4GB自动关阴影/抗锯齿/减粒子
- **2D暂停3D**: body.grid/reading时停止render节省电量

### 6.2 后端优化

- **检索缓存**: 倒排索引启动时全量构建,常驻内存
- **静态资源**: vendor 7天immutable,脚本304 ETag
- **nginx gzip**: HTML 231KB→几十KB

### 6.3 测试覆盖

- `npm run verify`: 448章 0 FAIL 0 WARN
- `npm run test:e2e`: **151项全绿**
  - 门厅/取书/检索/电梯/书轨/星图/暗门/未写之书
  - 前沿观察/概念手册/盖章撤销/移动端/性能预算

---

## 7. 部署方案

### 7.1 生产环境

- **系统**: Ubuntu 22.04 LTS
- **Node**: v22.23.4
- **服务**: systemd单元`machine-memory.service`
- **反代**: nginx `/ai/`子路径 → 127.0.0.1:3300
- **证书**: Let's Encrypt IP证书(6天自动续期)
- **入口**: https://150.158.1.111/ai/ (HTTPS主入口)

### 7.2 自动化运维

**每日任务**(systemd timer):
- 04:17: 前沿观察入库(`fetch-arxiv` + `fetch-hot` + `rewrite-frontier` + `rewrite-hot`)
- 03:40: 数据库备份(VACUUM INTO + content/ → `/opt/mm-backups`,保留14天)

**部署步骤**:
```bash
# 1. 打包
git archive HEAD | gzip > /tmp/mm-deploy.tar.gz

# 2. 传输
scp /tmp/mm-deploy.tar.gz ubuntu@150.158.1.111:/tmp/

# 3. 解压
sudo tar -xzf /tmp/mm-deploy.tar.gz -C /opt/machine-memory
sudo chown -R ubuntu:ubuntu /opt/machine-memory

# 4. 安装依赖
cd /opt/machine-memory
npm ci --omit=dev

# 5. 重启服务
sudo systemctl restart machine-memory
```

---

## 8. 项目规模

| 指标 | 数量 |
|------|------|
| 代码行数 | 约12,000行(前端6000/后端3500/工具2500) |
| 内容规模 | 56本书 × 8章 = 448章,约90万字 |
| 测试覆盖 | 151项E2E + 448章verify |
| 静态资源 | 7.6MB(vendor) + 231KB(HTML) + 若干JS/CSS |
| 数据库 | 约1.7MB(.data/app.db) |
| 部署包 | 40.9MB(含演示视频19.7MB) |

---

## 9. 创新点总结

1. **空间化信息架构**: 楼层/书轨/星图三轴导航,把"查找"变成"探索"
2. **缺失成为玩法**: 残页/失窃/暗门让读者注意史料是怎么丢的
3. **工程质量**: 151项E2E + 0错误内容校验 + 无构建步骤
4. **实时前沿**: arXiv每日入库 + DeepSeek中文科普编译
5. **多维叙事**: 史实+假如+未写之书,明确标注推测与事实边界

---

**附录A**: 完整技术栈列表  
**附录B**: 数据库完整schema  
**附录C**: API接口文档  
**附录D**: 内容规范与校验规则  

---

*本说明书对应代码提交: 88e2193 (2026-01-12)*
