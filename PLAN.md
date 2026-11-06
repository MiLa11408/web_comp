# 机忆书库 · THE MACHINE MEMORY

> AI 知识档案馆 · 参赛方案 v2
> 一句话：一座闭馆后的图书馆，收藏的是人类造机器的记忆。书是知识，电梯是分区，星图是概念关系，卡片目录是检索，借阅证是你的身份。

---

## 0. 已定决策

| 项 | 决定 |
|---|---|
| 名称 | **机忆书库 · THE MACHINE MEMORY**（谐音“记忆”，机+忆；副标题 AI 知识档案馆） |
| 参赛方式 | 提前发作品 + 录演示视频 + 现场答辩；评委可能自己打开链接 |
| 登录 | 真实注册（用户名/密码；邮箱是否必填待定） |
| 内容规模 | **12 本书 × 8 章 = 96 个核心节点**，每章不设字数上限，最低 1200 字 |
| 书架 | **three.js 真 3D**；物理书架（Rapier） + 黄铜电梯 |
| 检索 | 卡片目录（服务端索引）；星图知识图用于探索 |
| 视觉 | 暗色古籍外壳 + 章节内材质切换（历史=旧纸，技术=蓝图，产业=报告，前沿=档案袋） |
| 语言 | 中文为主 + 英文术语 |
| 素材 | 公共领域/CC0/CC-BY 真实素材 + 开源 3D 模型/代码 + 代码几何；**不靠 AI 生成插画** |
| 部署 | 同服务器 `/ai/`，端口 3300 |
| 仓库 | `git@github.com:MiLa11408/web_comp.git`（私有） |
| 签名时刻 | **取书翻开** |

---

## 1. 为什么这样改你的原方案

| 你的原想法 | 问题 | v2 处理 |
|---|---|---|
| 书架只是一个入口 | 好看但不承载信息 | 书脊高度=年代跨度，厚度=内容体量，材质=学科，索书号=分类；书架本身就是数据图 |
| 火车轨道做分支查找 | 容易变成装饰 | 轨道=**技术谱系**：7 条线，换乘站=真实技术融合（达特茅斯/反向传播/AlexNet/AlphaGo/Transformer/AlphaFold/RLHF/Agent） |
| 搜索是另一个搜索框 | 和图书馆世界观脱节 | 搜索=**卡片目录抽屉**：索书号、索引卡、命中片段；不做花哨动画 |
| 登录是门槛 | 评委可能被挡住 | 注册后入馆；提供“访客预览”只读（待你确认） |
| 内容怕不够深 | 96 章容易写成目录 | 每章强制 9 段结构 + 3 条以上来源；先写 12 个样章定标准 |
| 怕没趣味 | 只有特效会腻 | 失败博物馆 / 模型尺寸墙 / 失窃的书 / 可玩演示 / 印章 / 导览 / 红线 / 历史分岔 |

---

## 2. 参考站（已核实存在）

**做“书”的**
- The Book of Shaders — https://thebookofshaders.com/ — 整站是一本书，章节即导航，每章可玩
- Explorable Explanations — https://explorabl.es/ — “通过玩来学”的策展
- Nicky Case — https://ncase.me/ — 直接操作、叙事化解释
- MLU-Explain — https://mlu-explain.github.io/ — 滚动驱动的可视化讲解
- R2D3 — https://r2d3.us/visual-intro-to-machine-learning-part-1/ — 一个概念一页，图随文走

**做“技术可视化”的**
- Transformer Explainer — https://poloclub.github.io/transformer-explainer/ — 输入一句话看注意力流动
- CNN Explainer — https://poloclub.github.io/cnn-explainer/ — 逐层检查、悬停神经元
- TensorFlow Playground — https://playground.tensorflow.org/ — 浏览器里训练小网络
- AI Explorables（代码库）— https://github.com/PAIR-code/ai-explorables

**做“3D 空间”的**
- UNESCO Virtual Museum（Awwwards）— https://www.awwwards.com/unesco-virtual-museum-of-stolen-cultural-objects.html — 程序化、持续扩展的空间
- The Living Museum — https://dev.to/ayush_gupta_17/i-tried-to-prompt-a-3d-museum-into-existence-then-i-had-to-teach-sanity-to-remember-life-and-death-1ipb — 走近展品暂停时间、展开来源
- Maskatorium — https://www.awwwards.com/sites/maskatorium — 视差与悬停揭示
- 沉浸式 WebGL 展合集 — https://www.awwwards.com/immersive-webgl-virtual-gallery-exhibition-collection.html
- MyShelves（three.js 物理书架）— https://discourse.threejs.org/t/myshelves-a-first-person-library-you-build-book-by-book/93870
- ATON（开源 Three.js 文化遗产框架）— https://osiris.itabc.cnr.it/aton/

**做“历史/知识组织”的**
- AI History Project — https://aihistoryproject.org/ — 按十年组织 + 知识图谱 + 时间滑块（参考，非代码）
- AI Tech Tree — https://mrjc01.github.io/ai-tree/ — 技术依赖树、时间轴、未解锁幽灵态
- Museum of Failure — https://museumoffailure.com/exhibition — 失败陈列
- Science Museum: AI 史 — https://www.sciencemuseum.org.uk/objects-and-stories/mechanical-dreams-machine-minds-brief-history-artificial-intelligence-pt2

**做“互动测验/迷思”的**
- AI 迷思测验 — https://lmversity.com/learn/ai-literacy/what-ai-actually-is-quiz
- AI4All Mythbusting — https://runestone.academy/ns/books/published/ai4all/sec-mythbusting-ch1.html

**做“学术谱系/尺度”的**
- The Gold Tree（学术谱系可视化论文）— https://pdfs.semanticscholar.org/d3bd/b5b04ebc75223e4d370705011ff18eeacd0e.pdf
- ModelMap（模型架构可视化）— https://www.everydev.ai/tools/modelmap

说明：只借交互范式与信息结构；代码/模型/图片按各自 LICENSE 使用并署名。

---

## 3. 趣味机制（最终清单）

| 机制 | 做法 | 目的 |
|---|---|---|
| **取书翻开**（签名时刻） | 书沿法线滑出→转向→封面翻开→纸页翻动→书页放大成网页；返回反向插回 | 全站最该被记住的一瞬 |
| **物理书架** | Rapier 物理；书可抽出、堆叠、滑落；书有重量感 | 真实空间感 |
| **黄铜电梯** | 历史典藏 / 技术工坊 / 产业观察 / 未编目地库；门开合 + 镜头飞行 | 解决大场景导航 |
| **星图知识图** | 黄铜星盘，节点=概念，连线=前后/竞争/融合；悬停发光，点击进入 | 探索式关系网 |
| **可玩演示** | 感知机分界线、梯度下降、卷积核、注意力热力、下一词预测、扩散去噪、Q-learning 走格子 | 真能动手，不只是读 |
| **AI 失败博物馆** | 独立陈列柜：感知机危机、专家系统泡沫、两次寒冬、翻车的 AI 产品（有来源） | 真实、好笑、教育 |
| **模型尺寸墙** | 参数量/算力做成铜秤与书塔；从百万到万亿的物理对比 | 数据可触摸 |
| **失窃的书** | 有些书缺页，缺页藏在馆内另一处；找到拼回才算读完 | 轻量寻物，驱动探索 |
| **借阅印章** | 每章盖索书号章；读完一本盖藏书章；走完一条线路得徽章 | 纪念册，不是积分榜 |
| **馆长导览** | 3 分钟自动走 8 个高光，可暂停 | 答辩/录视频保命 |
| **红线 + 隐藏书** | 相关书之间细红线；搜索特定词触发隐藏夹页 | 惊喜 |
| **历史分岔** | “假如符号主义赢了 / 假如没有 ImageNet”平行书架，明确标“推测” | 思辨趣味 |
| **环境音** | 翻页、盖章、电梯、火车；默认关闭，右上角开关 | 沉浸 |
| **火车轨道** | 7 条谱系线，换乘=技术融合；点击站=到站 | 你原方案的分支查找 |

---

## 4. 12 本书 × 8 章（96 节点）

| # | 书 | 8 章 |
|---|---|---|
| 1 | 《序卷：何为智能》 | 图灵的问题 / 达特茅斯之前 / 达特茅斯会议 / 符号与逻辑 / 感知机第一次浪潮 / 中文屋与意识 / 具身与情境 / AI 在人类知识中的位置 |
| 2 | 《符号的世纪》 | Logic Theorist 与 GPS / ELIZA 与 SHRDLU / 专家系统 / 知识表示 / 第一次寒冬 / 专家系统泡沫与第二次寒冬 / 形式化的遗产 / 符号主义今天还在哪 |
| 3 | 《神经的复活》 | MP 神经元 / 感知机 / XOR 危机 / 反向传播 / LeNet 与卷积 / LSTM 与序列 / AlexNet / ResNet |
| 4 | 《学习的统计》 | VC 维 / SVM 与核方法 / 树与集成 / 概率图模型 / 特征工程 / 竞赛文化 / 评估与基准 / 统计学习的今天 |
| 5 | 《注意力纪元》 | seq2seq / 注意力 / Transformer / BERT / GPT 与自回归 / 缩放定律 / Chinchilla / 长上下文 |
| 6 | 《生成的想象》 | VAE / GAN / StyleGAN / 扩散 / 文生图 / 视频生成 / 多模态生成 / 版权与真实性 |
| 7 | 《行动的智能》 | 控制论与早期机器人 / TD 与 Q-learning / DQN / 策略梯度与 PPO / AlphaGo / AlphaZero 与 MuZero / RLHF / Agent 与工具 |
| 8 | 《感知与语言》 | 早期视觉 / ImageNet / 检测与分割 / 语音识别 / 机器翻译 / 中文 NLP / CLIP / 多模态大模型 |
| 9 | 《智能与生命》 | Hebb 与神经科学 / Hopfield / 进化计算 / 神经形态硬件 / AlphaFold / 蛋白质设计 / 医学影像 / 脑机接口 |
| 10 | 《智能与产业》 | 实验室到产品 / 推荐系统 / 自动驾驶 / 金融风控 / 教育与知识工作 / 中国 AI 产业简史 / 算力与能源 / 劳动与经济 |
| 11 | 《智能的边界》 | 对齐 / 可解释 / 评测局限 / 安全与深伪 / 隐私 / 版权 / 治理（EU AI Act） / 泡沫、末日论与现实 |
| 12 | 《未编目》 | 世界模型 / 推理与测试时计算 / 合成数据 / 递归自我改进 / AGI 定义 / 意识 / 量子 ML / 开放问题清单 |

另有：
- 时间轴 80 条事件
- 轨道 7 条线、约 50 站、9 个换乘
- 前沿书架：人工策展 12 条 + arXiv 每日自动入库
- 失败博物馆 20 件
- 模型尺寸墙 12 个公开参数量
- 失窃页 8 处
- 历史分岔 4 条

---

## 5. 章节模板（每章强制 9 段）

1. **一句话**：它是什么
2. **时间/人物/机构**：年份、关键人物、实验室/公司
3. **为什么是这个时候**：前因、限制、失败的前作
4. **怎么工作**：图示/公式/可玩演示
5. **它改变了什么**：对计算机、生物医学、产业、社会的影响
6. **今天的地位**：基础 / 仍在用 / 已被取代 / 仍有争议
7. **争议与局限**：谁反对、哪里失效
8. **关系**：前置 / 后继 / 竞争 / 换乘到哪条线
9. **档案**：3–6 条来源（论文/书/官方博客/报告），逐条可点

排版材质：
- 历史章 → 旧纸、宋体、铅字、页边注、时间条
- 技术章 → 蓝图/方格纸、等宽、公式、演示
- 产业章 → 报告纸、表格、数据条
- 前沿章 → 牛皮纸档案袋、印章“待编目”、arXiv 链接

---

## 6. 3D 场景

**主阅览室**（登录后落地）
- 三排书架，12 本书；书脊程序化排版（Canvas 文字纹理，不是插画）
- 中央星图台；右侧卡片目录柜；左侧黄铜电梯；角落“新书入库”推车
- 体积光、尘埃粒子、纸堆、放大镜、台灯

**四个楼层（电梯）**
- L1 历史典藏：8 本历史/哲学书，旧纸与铜版画风格（公共领域图）
- L2 技术工坊：蓝图墙、公式刻线、演示台
- L3 产业观察：数据墙、报告桌
- L4 未编目地库：封蜡书、失败博物馆、模型尺寸墙、失窃页

**交互**
- 鼠标拖拽在限定角度看房间；点击书 = 取书；点击电梯 = 选层；点击星图节点 = 章节
- 取书时物理书滑出；翻开后镜头推近，DOM 章节页覆盖在书页上（文字保持锐利）
- 返回：合书、插回、恢复视角
- 移动端：2D 书页 + 简化场景；物理和自由视角关闭

---

## 7. 后端与数据

- Fastify 5 + `node:sqlite`
- 注册：用户名 + 密码（scrypt）；邮箱可选（待定是否验证）；登录限流 5 次/30 秒；会话 14 天
- 每用户：印章、进度、批注、失窃页收集、阅读路线
- 检索：启动时建内存倒排索引（中文二元组 + 英文词 + 别名），<1ms
- 星图：`graph.json` 节点/边/星座分组
- 轨道：`rail.json` 线/站/换乘/年代
- 前沿：arXiv API 每日拉 cs.AI/cs.LG/cs.CL（服务器已实测 200），存标题/作者/摘要/链接，标“机器入库，未经编辑”
- 内容自检：`npm run verify` 检查 96 章字段完整、字数≥1200、来源≥3、关系双向、索书号唯一、站点存在

---

## 8. 素材与许可（不靠我画图）

- 历史照片/论文首页/旧报纸：Wikimedia Commons、Library of Congress、Internet Archive 的 **Public Domain** 素材
- 3D 模型/HDR/材质：Poly Haven（CC0）、Sketchfab（CC0/CC-BY）
- 代码：three.js（MIT）、Rapier（Apache-2.0）、postprocessing（MIT）等，按 LICENSE 使用
- 书封、书脊、纸张、铜锈、木纹：**代码生成**（Canvas 排版 + 噪声 shader/PBR），不生成插画
- 所有外部素材在“关于/致谢”页列出作者、来源、许可；不确定许可的一律不用

---

## 9. 阶段

1. 数据模型 + 后端（注册/会话/印章/批注/检索/星图/轨道）+ 12 个样章
2. 3D 主阅览室 + 物理书架 + 取书翻开（签名时刻）+ 电梯 + **阅读三栏布局（左检索可收起 / 中正文 / 右页边注，含本章内查找）+ 馆员署名 + 接待卡开场**
3. 96 章内容批量 + 时间轴 + 失败博物馆 + 尺寸墙 + 失窃页
4. 星图 + 轨道 + 可玩演示 6–8 个
5. 印章/借阅卡/导览/红线/隐藏书/历史分岔/环境音
6. 视觉打磨 + 移动端 + 无障碍 + 性能
7. 部署 `/ai/` + 线上验收 + README/已知问题 + 演示视频脚本

---

## 10. 风险

- 96 章 × 1200+ 字是最大工作量；先 12 样章定标准，再分批，每批跑 verify
- 3D + 物理 + DOM 文字混合容易出性能/层级问题；文字始终在 DOM，3D 只做空间与书
- 评委注册摩擦；待定“访客只读”
- 素材许可；建立 `assets.json` 记录来源与许可，缺记录的不用
- 事实错误；每章 3 条以上来源，拿不准写“约/据…”

---

## 11. 还需要你定

1. 注册与访问：用户名+密码、邮箱可选、未登录可读？还是必须注册？
2. 内容深度：96 章全部 1500–2500 字？还是 48 核心章 3000+、其余 1200？
3. 截止时间：两周内 / 一个月内 / 两个月内 / 不限？
4. 12 本书单是否按上面的分法？
