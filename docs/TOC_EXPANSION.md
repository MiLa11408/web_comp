# 机忆书库 · 扩展目录（b13–b36，192 章）

> 一句话：在现有 12 本、96 章的基础上，新增 24 本、192 章，把「技术发展史、应用发展史、产品发展史、公司资本史」四条线补齐成 36 本。
>
> 用途：给写手按章派单，不是成稿。每章仍须满足 `docs/CONTENT.md`：正文 1500–2500 汉字、9 段结构、3–6 条**实际打开核验过**的来源。
> 下表「初版来源线索」只是开工线索：**写手必须逐条实开**；打不开就按 CONTENT.md §5 换等价来源并在 note 写「替代原引」，**不编造 URL、不编造年份**。
> 楼层/style/span 与 `content/books.json` 对齐，不得擅自改动；章节 id 为 `b<书号>-c<章号>`。

**四条线的分工**（避免写手重复劳动）：
- 技术史：b3–b9、b15–b22（机制、论文、参数、训练方法）
- 应用史：b23–b30（行业、客户、部署、监管、单位经济）
- 产品史：b13、b14、b33（用户、界面、发布、留存、失败产品）
- 公司资本史：b31、b32（融资、估值、股权、管制、地缘）

---

## b13 ·《模型的世系》 GPT 与对话模型史

> 一句话：把 2018–2026 的对话模型写成一条世系——预训练、对齐、推理三次换轨，每次都换掉了上一代的产品形态。

- **id**：`b13` ｜ **楼层**：L1 ｜ **style**：`history` ｜ **年份跨度**：2018–2026

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源线索 |
|---|---|---|---|---|
| 1 | GPT-1：预训练加微调成为范式 | 为什么「先读一遍互联网，再学一件事」比直接教一件任务更有效 | Radford、Narasimhan、Salimans、Sutskever（2018，OpenAI） | OpenAI 论文《Improving Language Understanding by Generative Pre-Training》（以官方页为准）；同期 BERT 见 arXiv 1810.04805，勿混 |
| 2 | GPT-2：分阶段发布与「太危险」 | 12 亿参数的模型为什么先只给一个小版本 | Radford 等（2019，OpenAI） | OpenAI《Language Models are Unsupervised Multitask Learners》（以官方页为准）；https://openai.com/index/better-language-models/ |
| 3 | GPT-3：上下文学习与 API 生意 | 1750 亿参数为什么靠「提示」而不是微调就能干活 | Brown 等（2020，OpenAI） | https://arxiv.org/abs/2005.14165；OpenAI API 发布公告（2020，以官方页为准） |
| 4 | InstructGPT：RLHF 把「会写」变成「听话」 | 人类偏好如何变成可训练的梯度信号 | Ouyang 等（2022，OpenAI） | https://arxiv.org/abs/2203.02155；https://arxiv.org/abs/1706.03741（Christiano 2017） |
| 5 | ChatGPT：两个月一亿用户 | 一个对话壳为什么能引爆，而更强的模型没有 | OpenAI（2022-11-30） | https://openai.com/blog/chatgpt/；Reuters 2023-02 用户规模报道（以原文为准） |
| 6 | GPT-4：考试分数与不公开的参数 | 技术报告为什么只给能力、不给架构 | OpenAI（2023） | https://arxiv.org/abs/2303.08774；OpenAI GPT-4 系统卡（以官方页为准） |
| 7 | Claude、Gemini 与 Llama：三条追赶路线 | 三家公司如何各自定义「更安全 / 更长 / 更便宜」 | Anthropic（2021/2023）；Google DeepMind（2023）；Meta（2023） | https://arxiv.org/abs/2212.08073；https://arxiv.org/abs/2312.11805；https://arxiv.org/abs/2307.09288 |
| 8 | 从对话到推理：o1、o3 与 GPT-5 | 「多想一会儿」如何从论文变成产品与定价 | OpenAI（2024–2025） | https://arxiv.org/abs/2408.03314（测试时计算）；OpenAI o1 系统卡（2024，以官方页为准）；OpenAI GPT-5 发布页（2025，以官方页为准） |

**玩法挂载建议**：第 5 章挂「失窃页：2022-11-30 ChatGPT 首日页面」；第 8 章挂「历史分岔：假如 2022 没有 ChatGPT」（与既有分岔合并，不重复建装置）。

---

## b14 ·《对话系统的前史》 ELIZA → ALICE → Siri

> 一句话：在「大模型会聊天」之前，人类已经用规则、状态机和检索，把「像人一样说话」这件事练了四十五年。

- **id**：`b14` ｜ **楼层**：L1 ｜ **style**：`history` ｜ **年份跨度**：1966–2011

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源线索 |
|---|---|---|---|---|
| 1 | ELIZA：模式匹配如何制造理解错觉 | 最简单的代词替换为什么能让人主动倾诉 | Weizenbaum（1966，MIT） | https://doi.org/10.1145/365153.365168；Weizenbaum《Computer Power and Human Reason》（1976） |
| 2 | PARRY：把「偏执」写成状态机 | 机器能否模拟人格而不理解人格 | Colby（1971/1972，斯坦福） | Colby 等《Artificial Paranoia》（1971，以论文页为准）；Weizenbaum 1966 作为对照 |
| 3 | SHRDLU：积木世界里的「理解」 | 语言理解是否等于操作符号 | Winograd（1972，MIT） | Winograd《Understanding Natural Language》（1972，学术出版社） |
| 4 | A.L.I.C.E. 与 AIML | 规则库如何靠开源社群撑二十年 | Richard Wallace（1995，ALICE AI Foundation） | ALICE AI Foundation 官方页（以官方页为准）；Loebner Prize 2000/2001/2004 记录 |
| 5 | Cleverbot：从人类对话里学 | 检索式聊天机器人为什么反而更像人 | Rollo Carpenter（1988/1997，Jabberwacky） | Cleverbot 官方页；Loebner Prize 2005 记录 |
| 6 | CALO 与 Siri：语音助手的前夜 | DARPA 的钱如何造出一个「私人助理」 | SRI International（2003–2008）；Apple（2010/2011） | SRI CALO 项目页（以官方页为准）；Apple iPhone 4S 发布会（2011，以官方页为准） |
| 7 | 助手混战 2011–2014 | Siri、Google Now、Cortana、Alexa 各自解决了什么 | Apple（2011）；Google（2012）；Microsoft（2014）；Amazon（2014） | 四家官方发布页（以官方页为准） |
| 8 | 2011 年的岔路口：规则、检索与统计 | Siri 发布时，对话系统其实站在哪三条技术路线上 | Apple（2011）；Wallace（1995）；Carpenter（1997） | Apple iPhone 4S 发布会（2011，以官方页为准）；Cleverbot 官方页；https://arxiv.org/abs/1506.05869（2015 神经对话，作后继对照，不进本章主线） |

**玩法挂载建议**：第 1 章挂「可玩演示：ELIZA 规则替换」；第 6 章挂「失窃页：Siri 2011 发布会幻灯片」。

---

## b15 ·《具身智能》 机器人史

> 一句话：从压铸车间的机械臂到会叠衣服的人形机器人，具身智能的六十年一直在回答同一个问题——身体能不能替脑子省点事。

- **id**：`b15` ｜ **楼层**：L2 ｜ **style**：`tech` ｜ **年份跨度**：1961–2026

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源线索 |
|---|---|---|---|---|
| 1 | Unimate 进通用汽车 | 第一台工业机器人为什么先干压铸搬运 | Devol、Engelberger（1954/1961，Unimation） | Unimation 历史（以公司/博物馆页为准）；GM 1961 产线记录 |
| 2 | Shakey 与 STRIPS | 第一个会自己规划路线的移动机器人怎么想 | Nilsson、Fikes（1966–1972，SRI） | SRI Shakey 档案（以机构页为准）；STRIPS 1971 论文（以论文页为准） |
| 3 | 斯坦福臂、PUMA 与 SCARA | 精度、速度与自由度如何互相交换 | Scheinman（1969）；Makino（1978）；Unimation（1978） | 斯坦福臂档案（以机构页为准）；SCARA 专利（以专利页为准） |
| 4 | 足式与仿生：BigDog、AIBO、ASIMO | 为什么先学会走，再谈智能 | Brooks（1989，MIT）；Sony（1999）；Honda（2000）；Boston Dynamics（1992/2005） | https://doi.org/10.1016/0004-3702(91)90053-M；Boston Dynamics 官方页 |
| 5 | SLAM 与抓取 | 机器人如何知道自己在哪、手该放哪 | Smith & Cheeseman（1986/1987）；Saxena（2008）；Mahler（2017） | SLAM 综述（以论文页为准）；https://arxiv.org/abs/1710.01330 |
| 6 | 深度强化学习进机器人 | 仿真里学会的动作如何搬到真实世界 | Levine（2016，Berkeley）；Google Robotics（2022） | https://arxiv.org/abs/1504.00702；https://arxiv.org/abs/2212.06817（RT-1） |
| 7 | 具身基础模型：RT-2 与 Open X-Embodiment | 把「看见」和「动作」放进同一个模型要多少数据 | Google DeepMind（2023）；Open X-Embodiment 协作组（2023） | https://arxiv.org/abs/2307.15818；https://arxiv.org/abs/2310.08864 |
| 8 | 人形机器人量产叙事 | Optimus、Figure、宇树：演示与交付之间差什么 | Tesla（2022）；Figure（2022/2023）；Unitree（2016） | 三家公司官方页（以官方页为准）；演示争议报道（2024，以原文为准） |

**玩法挂载建议**：第 2 章挂「可玩演示：Shakey 的 STRIPS 规划」；第 8 章挂「失败博物馆：人形机器人遥操作演示」。

---

## b16 ·《算力的地基》 GPU / CUDA / TPU / 数据中心 / 能耗

> 一句话：深度学习不是被算法单独推起来的，它是被一块为游戏做的显卡、一套并行编程接口和一排排机柜抬起来的。

- **id**：`b16` ｜ **楼层**：L2 ｜ **style**：`tech` ｜ **年份跨度**：1999–2026

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源线索 |
|---|---|---|---|---|
| 1 | GeForce 256 与「GPU」一词 | 为游戏而生的芯片为什么天然适合矩阵运算 | NVIDIA（1999） | NVIDIA 官方历史页（以官方页为准）；GeForce 256 发布资料 |
| 2 | CUDA：把显卡变成通用加速器 | 并行编程模型如何降低科研门槛 | NVIDIA（2006/2007） | CUDA 编程指南（NVIDIA 官方）；CUDA 十周年回顾（以官方页为准） |
| 3 | AlexNet 与两块 GTX 580 | 深度学习第一次证明「游戏卡够用」 | Krizhevsky、Sutskever、Hinton（2012，多伦多） | https://doi.org/10.1145/3065386 |
| 4 | TPU：专用芯片为什么在推理上更快 | 脉动阵列与 8 位整数换来了什么 | Jouppi 等（2017，Google） | Jouppi ISCA 2017 论文（以论文页为准）；Google Cloud TPU 官方页 |
| 5 | 万卡集群：互连决定有效算力 | 卡数翻十倍，为什么速度不翻十倍 | NVIDIA（2016–）；Meta（2022）；Microsoft（2023） | NVIDIA NVLink 官方页；Meta 16000 卡集群博客（以官方页为准） |
| 6 | 数据中心：电力、散热与选址 | 一座 1 GW 园区意味着什么 | IEA（2024）；超大规模运营商（2020–2026） | https://www.iea.org/reports/electricity-2024；运营商年报（以官方页为准） |
| 7 | 能耗与碳排：一次训练排多少 | 训练、推理、冷却三笔账怎么算 | Strubell（2019）；Patterson（2021）；Luccioni（2022） | https://arxiv.org/abs/1907.10597；https://arxiv.org/abs/2104.10350；https://arxiv.org/abs/2309.17318 |
| 8 | 出口管制与国产算力 | 算力如何从商品变成地缘政治 | 美国 BIS（2022/2023/2024）；寒武纪（2016）；华为（2019） | BIS 规则公告（以官方页为准）；寒武纪、昇腾官方页 |

**玩法挂载建议**：第 3 章挂「模型尺寸墙：AlexNet 与两块 GTX 580」；第 8 章挂「算力铜秤：受管制型号对照」。

---

## b17 ·《数据的来源》 ImageNet / Common Crawl / 标注产业 / 合成数据

> 一句话：模型吃的是数据，但数据不是从天上掉的——它由众包工人、爬虫、清洗脚本和被低估的标注员一起生产。

- **id**：`b17` ｜ **楼层**：L2 ｜ **style**：`tech` ｜ **年份跨度**：2009–2026

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源线索 |
|---|---|---|---|---|
| 1 | ImageNet：一张一张点出来的 1400 万张 | 大规模标注如何把视觉研究推向深度学习 | Fei-Fei Li、Deng 等（2007/2009，斯坦福/普林斯顿） | https://doi.org/10.1109/CVPR.2009.5206848；ImageNet 官网 |
| 2 | Common Crawl 与 C4 | 互联网如何被筛成一本「教材」 | Common Crawl（2008）；Raffel 等（2019，Google） | https://commoncrawl.org/；https://arxiv.org/abs/1910.10683 |
| 3 | 书籍、代码与论文：网页之外的语料 | 高质量数据为什么比更多网页更贵 | Zhu 等（2015，BooksCorpus）；Gao 等（2020，EleutherAI）；GitHub（2017） | BooksCorpus 论文（以论文页为准）；https://arxiv.org/abs/2101.00027（The Pile） |
| 4 | 标注产业：谁在标、拿多少 | 数据标注如何变成全球外包劳动 | Sama（2008）；Scale AI（2016）；Gray & Suri（2019） | 《Ghost Work》（2019）；Time 2022 肯尼亚标注工报道（以原文为准） |
| 5 | 人类偏好数据：RLHF 的标注更贵 | 为什么「哪个回答更好」比「这是什么」更难标 | Christiano（2017）；Bai（2022，Anthropic） | https://arxiv.org/abs/1706.03741；https://arxiv.org/abs/2204.05862 |
| 6 | 合成数据：模型自己造教材 | 没有真实数据时，自举到第几代会崩 | Wang（2022）；Gunasekar（2023）；Shumailov（2023） | https://arxiv.org/abs/2212.10560；https://arxiv.org/abs/2306.11644；https://arxiv.org/abs/2305.17493 |
| 7 | 清洗与去重：质量比数量更贵 | 去重、语言识别与毒性过滤如何改变训练结果 | Wenzek（2019）；Penedo（2024，FineWeb） | https://arxiv.org/abs/1911.00359；https://arxiv.org/abs/2406.17557 |
| 8 | 版权与许可：训练数据的法律边界 | 抓取网页训练模型，什么时候需要授权 | NYT（2023）；Getty（2023）；EU（2024） | NYT 诉 OpenAI 起诉书（2023-12，以法院/报道页为准）；https://eur-lex.europa.eu/eli/reg/2024/1689/oj |

**玩法挂载建议**：第 4 章挂「数据标注工时卡」；第 6 章挂「可玩演示：模型崩溃循环」。

---

## b18 ·《评测与基准》 MMLU / GLUE / HELM / 污染 / 竞技场

> 一句话：AI 的每一次「进步」都要先回答「拿什么证明」，而基准一旦被刷穿，证明就变成了信仰。

- **id**：`b18` ｜ **楼层**：L2 ｜ **style**：`tech` ｜ **年份跨度**：2018–2026

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源线索 |
|---|---|---|---|---|
| 1 | GLUE 与 SuperGLUE | 一张统一考卷如何终结各自为战的旧榜 | Wang 等（2018/2019，NYU/华盛顿） | https://arxiv.org/abs/1804.07461；https://arxiv.org/abs/1905.00537 |
| 2 | MMLU：57 门学科的选择题 | 知识广度能不能用考试分数代表 | Hendrycks 等（2020，Berkeley） | https://arxiv.org/abs/2009.03300 |
| 3 | BIG-bench 与 HELM | 评测如何从单榜走向规模化、标准化 | BIG-bench 协作组（2022）；Stanford CRFM（2022） | https://arxiv.org/abs/2206.04615；https://arxiv.org/abs/2211.09110 |
| 4 | 代码与数学基准 | HumanEval、GSM8K 为什么最能拉开差距 | Chen（2021，OpenAI）；Cobbe（2021，OpenAI）；Hendrycks（2021） | https://arxiv.org/abs/2107.03374；https://arxiv.org/abs/2110.14168；https://arxiv.org/abs/2103.03874 |
| 5 | 人类偏好与竞技场 | Elo 分数能不能代表「好用」 | LMSYS（2023/2024，UC Berkeley） | https://arxiv.org/abs/2403.04132；LMSYS Chatbot Arena 官方榜 |
| 6 | 基准污染 | 题目进了训练集，分数还算数吗 | Magar & Schwartz（2022）；GSM1k 作者（2023） | https://arxiv.org/abs/2203.08216；GSM1k 论文（以论文页为准） |
| 7 | Agent 与真实任务 | SWE-bench、WebArena、GAIA 在测什么 | Jimenez（2023）；Zhou（2023）；Mialon（2023） | https://arxiv.org/abs/2310.06770；https://arxiv.org/abs/2307.13854；https://arxiv.org/abs/2311.12983 |
| 8 | 分数通胀与动态基准 | 为什么榜首越来越不值钱 | LiveBench（2024）；Stanford HAI（2026） | https://arxiv.org/abs/2406.19314；https://hai.stanford.edu/ai-index/2026-ai-index-report |

**玩法挂载建议**：第 5 章挂「可玩演示：Elo 对战」；第 6 章挂「失败博物馆：基准污染」。

---

## b19 ·《语音技术》 识别 / TTS / Whisper / 语音助手 / 深伪

> 一句话：语音是最早被机器「听懂」的人类信号，也是最容易被伪造的人类信号。

- **id**：`b19` ｜ **楼层**：L2 ｜ **style**：`tech` ｜ **年份跨度**：1952–2026

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源线索 |
|---|---|---|---|---|
| 1 | Audrey 与 1952 | 语音识别为什么从十个数字、一个说话人开始 | Bell Labs（1952） | Rabiner 1989 教程 https://doi.org/10.1109/5.18626；Bell Labs 档案（以机构页为准） |
| 2 | HMM 与 DARPA SUR | 统计语音为什么统治了二十年 | Rabiner、Juang（1980s，Bell Labs）；DARPA（1971） | https://doi.org/10.1109/5.18626；DARPA SUR 项目档案（以机构页为准） |
| 3 | DNN-HMM：2012 年那 30% 从哪来 | 深度网络替换高斯混合模型，为什么立刻见效 | Dahl 等（2012，Microsoft/Google） | https://arxiv.org/abs/1202.2745 |
| 4 | 端到端与 CTC | 不再对齐音素，语音如何直接学成文字 | Graves（2006）；Hannun（2014，百度/Stanford） | https://doi.org/10.1145/1143844.1143891；https://arxiv.org/abs/1412.5567 |
| 5 | Kaldi 与开源语音栈 | 为什么研究界十年离不开一套 C++ 工具 | Povey（2011，Johns Hopkins） | https://kaldi-asr.org；Kaldi ASRU 2011 论文（以论文页为准） |
| 6 | TTS 三代：拼接、参数化、神经声码器 | 机器声音如何从「念字」变成「像人」 | WaveNet（2016，DeepMind）；Tacotron（2017，Google）；HiFi-GAN（2020） | https://arxiv.org/abs/1609.03499；https://arxiv.org/abs/1703.10135；https://arxiv.org/abs/2010.05646 |
| 7 | Whisper：68 万小时弱监督改写 ASR | 多语言、噪声与口音为什么被一个模型一起解决 | Radford 等（2022，OpenAI） | https://arxiv.org/abs/2212.04356 |
| 8 | 助手与深伪语音 | 好用的 TTS 如何变成诈骗工具 | Google（2018）；ElevenLabs（2022）；EU（2024） | Google Duplex 2018 官方博客；EU AI Act https://eur-lex.europa.eu/eli/reg/2024/1689/oj |

**玩法挂载建议**：第 8 章挂「失败博物馆：语音克隆诈骗」；第 6 章挂「可玩演示：声码器音质对比」。

---

## b20 ·《计算机视觉技术》 SIFT / CNN / YOLO / 分割 / NeRF / ViT / SAM

> 一句话：视觉技术史是一条「手工特征—卷积—注意力—基础模型」的换轨史，每一轨都在回答「像素里到底有什么」。

- **id**：`b20` ｜ **楼层**：L2 ｜ **style**：`tech` ｜ **年份跨度**：1986–2026

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源线索 |
|---|---|---|---|---|
| 1 | Marr 的三层与 Canny 边缘 | 视觉的第一代纲领为什么先拆成计算层级 | Marr（1982，前史）；Canny（1986） | Marr《Vision》；https://doi.org/10.1109/TPAMI.1986.4767851 |
| 2 | SIFT：尺度不变特征统治十年 | 为什么一张图的关键点能在另一张图里找回来 | Lowe（2004，UBC） | https://doi.org/10.1023/B:VISI.0000029664.99615.94 |
| 3 | LeNet 到 AlexNet | 卷积早在 1989 年就有，为什么 2012 年才赢 | LeCun（1998，Bell Labs）；Krizhevsky（2012，多伦多） | https://doi.org/10.1109/5.726791；https://doi.org/10.1145/3065386 |
| 4 | 检测三条路线：R-CNN、YOLO、Faster R-CNN | 精度与速度如何被拆成两种产品哲学 | Girshick（2014，Berkeley）；Redmon（2015，华盛顿）；Ren（2015，Microsoft） | https://arxiv.org/abs/1311.2524；https://arxiv.org/abs/1506.02640；https://arxiv.org/abs/1506.01497 |
| 5 | 分割：FCN、U-Net、Mask R-CNN | 从「框住」到「逐像素」，难在哪里 | Long（2014，Berkeley）；Ronneberger（2015，弗莱堡）；He（2017，Facebook） | https://arxiv.org/abs/1411.4038；https://arxiv.org/abs/1505.04597；https://arxiv.org/abs/1703.06870 |
| 6 | ViT 与 Swin：注意力也能看图吗 | 没有卷积先验，视觉 Transformer 靠什么补 | Dosovitskiy（2020，Google）；Liu（2021，Microsoft） | https://arxiv.org/abs/2010.11929；https://arxiv.org/abs/2103.14030 |
| 7 | NeRF 与 3D Gaussian Splatting | 从几十张照片重建三维，代价是什么 | Mildenhall（2020，Berkeley）；Kerbl（2023，Inria） | https://arxiv.org/abs/2003.08934；https://arxiv.org/abs/2308.04079 |
| 8 | SAM 与 DINOv2：分割一切 | 通用视觉基础模型离「不用微调」还有多远 | Kirillov（2023，Meta）；Oquab（2023，Meta） | https://arxiv.org/abs/2304.02643；https://arxiv.org/abs/2304.07193 |

**玩法挂载建议**：第 2 章挂「可玩演示：SIFT 关键点匹配」；第 7 章挂「NeRF 环绕视角」。

---

## b21 ·《多模态与 Agent》 CLIP / 视觉语言模型 / ReAct / 工具调用 / 多 Agent

> 一句话：当模型同时会看、会说、会调用工具，「回答问题」就开始变成「完成任务」。

- **id**：`b21` ｜ **楼层**：L2 ｜ **style**：`tech` ｜ **年份跨度**：2021–2026

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源线索 |
|---|---|---|---|---|
| 1 | CLIP：四亿对图文对齐两个空间 | 对比学习为什么能换来零样本分类 | Radford（2021，OpenAI） | https://arxiv.org/abs/2103.00020 |
| 2 | 视觉语言模型：Flamingo、BLIP-2、LLaVA | 视觉编码器怎么接到语言模型上 | Alayrac（2022，DeepMind）；Li（2023，Salesforce）；Liu（2023，Wisconsin） | https://arxiv.org/abs/2204.14198；https://arxiv.org/abs/2301.12597；https://arxiv.org/abs/2304.08485 |
| 3 | 原生多模态：Gemini 与 GPT-4o | 为什么不再「先看图再说话」 | Google DeepMind（2023）；OpenAI（2024） | https://arxiv.org/abs/2312.11805；OpenAI GPT-4o 发布页（2024-05，以官方页为准） |
| 4 | 视频与长文档理解 | 时序、帧采样与长上下文，哪个是真瓶颈 | Gemini 1.5（2024，Google）；Video-MME（2024） | https://arxiv.org/abs/2403.05530；https://arxiv.org/abs/2405.21075 |
| 5 | ReAct：推理与行动交错 | 为什么「想一步、做一步」比一次想完更可靠 | Yao（2022，Princeton/Google） | https://arxiv.org/abs/2210.03629；https://arxiv.org/abs/2302.04761 |
| 6 | 工具调用与协议 | 函数调用、MCP 如何把模型接到外部世界 | OpenAI（2023）；Anthropic（2024） | OpenAI function calling 公告（2023-06，以官方页为准）；MCP 文档 https://modelcontextprotocol.io |
| 7 | 多智能体：AutoGen、MetaGPT、生成式智能体 | 「公司式协作」是效率还是幻觉 | Wu（2023，Microsoft）；Hong（2023，DeepWisdom）；Park（2023，Stanford） | https://arxiv.org/abs/2308.08155；https://arxiv.org/abs/2308.00352；https://arxiv.org/abs/2304.03442 |
| 8 | 真实环境 Agent：SWE-bench、WebArena、OSWorld | 演示里 90 分，为什么进生产就掉到 30 分 | Jimenez（2023）；Zhou（2023）；Xie（2024） | https://arxiv.org/abs/2310.06770；https://arxiv.org/abs/2307.13854；https://arxiv.org/abs/2404.07972 |

**玩法挂载建议**：第 5 章挂「可玩演示：ReAct 循环」；第 8 章挂「失败博物馆：Agent 误删生产数据」。

---

## b22 ·《开源大模型》 Llama / Mistral / Qwen / DeepSeek / 开源生态

> 一句话：开源大模型不是「免费的大模型」，而是一场关于权重、许可证和复现能力的长期谈判。

- **id**：`b22` ｜ **楼层**：L2 ｜ **style**：`tech` ｜ **年份跨度**：2018–2026

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源线索 |
|---|---|---|---|---|
| 1 | 开源的三个层次 | 给权重、给数据、给许可证，哪个才算真开源 | OSI（1998）；Meta（2023）；Mistral（2023） | OSI 开源定义（以官方页为准）；Llama 2 许可证（以官方页为准） |
| 2 | BLOOM 与 OPT：第一次复现大模型 | 学术联合体如何凑出 1760 亿参数 | BigScience（2021/2022）；Meta（2022） | https://arxiv.org/abs/2211.05100；https://arxiv.org/abs/2205.01068 |
| 3 | Llama 三部曲 | 泄露、许可证与生态起点如何连在一起 | Meta（2023/2024） | https://arxiv.org/abs/2302.13971；https://arxiv.org/abs/2307.09288；https://arxiv.org/abs/2407.21783 |
| 4 | Mistral 与 Mixtral | 7B 小模型、MoE 与欧洲路线赌什么 | Mistral AI（2023） | https://arxiv.org/abs/2310.06825；https://arxiv.org/abs/2401.04088 |
| 5 | Qwen：中文与多语言开源主力 | 一个中国团队如何把多语言能力做成系列 | 阿里云（2023–2025） | https://arxiv.org/abs/2309.16609；https://arxiv.org/abs/2407.10671；https://arxiv.org/abs/2412.15115 |
| 6 | DeepSeek：MoE、FP8 与低成本账 | 671B 总参、37B 激活、557.6 万美元怎么算 | 深度求索、梁文锋（2023–2025） | https://arxiv.org/abs/2401.02954；https://arxiv.org/abs/2412.19437；https://arxiv.org/abs/2501.12948 |
| 7 | 完全开放：Pythia、OLMo、StarCoder | 开放训练数据与检查点，代价是什么 | EleutherAI（2023）；AI2（2024）；BigCode（2023） | https://arxiv.org/abs/2304.01373；https://arxiv.org/abs/2402.00838；https://arxiv.org/abs/2305.06161 |
| 8 | 部署生态：vLLM、llama.cpp、Ollama | 模型如何从机房搬回个人电脑 | Kwon（2023，Berkeley）；Gerganov（2023） | https://arxiv.org/abs/2309.06180；llama.cpp 代码仓；Ollama 官网 |

**玩法挂载建议**：第 6 章挂「模型尺寸墙：DeepSeek-V3 671B/37B」；第 8 章挂「本地部署沙盘」。

---

## b23 ·《视觉应用》 安防 / 医疗 / 工业质检 / 手机影像 / 遥感

> 一句话：视觉算法在论文里比的是准确率，在行业里比的是误报率、部署成本和谁签字负责。

- **id**：`b23` ｜ **楼层**：L3 ｜ **style**：`industry` ｜ **年份跨度**：2014–2026

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源线索 |
|---|---|---|---|---|
| 1 | 人脸识别：DeepFace、FaceNet 与十亿级底库 | 识别率超过人眼之后，问题为什么变成底库、偏见与合规 | Taigman（2014，Facebook）；Schroff（2015，Google）；NIST FRVT（2017–） | https://arxiv.org/abs/1406.2209；https://arxiv.org/abs/1503.03832；NIST FRVT 官方页 |
| 2 | 安防与城市治理 | 摄像头网络的收益与隐私代价如何结算 | Clearview（2019/2020）；NIST FRVT；EU（2024） | NIST FRVT 官方页；EU AI Act 实时远程生物识别条款 |
| 3 | 医疗影像：CheXNet 与 IDx-DR 两种落地 | 一个靠论文出圈，一个靠审批进门，差在哪 | Rajpurkar（2017，Stanford）；FDA（2018） | https://arxiv.org/abs/1711.05225；FDA AI 设备清单 https://www.fda.gov/medical-devices/software-medical-device-samd/artificial-intelligence-enabled-medical-devices |
| 4 | 工业质检 | 缺陷检测为什么比人脸识别难做 | Bergmann（2019，MVTec AD）；制造业客户（2019–） | https://arxiv.org/abs/1901.07042 |
| 5 | 手机影像：计算摄影进快门 | 多帧合成、夜景与 AI 语义如何塞进手机 | Google（2016/2018）；Apple（2019） | Google Research HDR+ 博客（2016）；Night Sight 发布页（2018，以官方页为准） |
| 6 | 遥感与农业 | 卫星图如何变成产量、保单与执法证据 | Sentinel-2（2015，ESA）；Planet（2010/2014） | ESA Sentinel 官方页；Planet 官方页 |
| 7 | 零售与物流 | 无人店、货架识别与 OCR 的真实毛利 | Amazon（2016/2018）；支付宝（2017） | Amazon Go 官方页；相关发布报道（以原文为准） |
| 8 | 视觉应用的生意与失败 | 项目制、长尾与数据成本如何吃掉利润 | 商汤（2021）；旷视（2021）；Stanford HAI（2026） | 商汤招股书/年报（以官方页为准）；https://hai.stanford.edu/ai-index/2026-ai-index-report |

**玩法挂载建议**：第 2 章挂「隐私对照卡」；第 8 章挂「失败博物馆：视觉公司长期亏损」。

---

## b24 ·《AI 做科研》 AlphaFold / 材料 / 气象 / 数学 / 药物 / 实验自动化

> 一句话：AI 进实验室不是替科学家写论文，而是先把「搜索空间」从天文数字压到可枚举。

- **id**：`b24` ｜ **楼层**：L3 ｜ **style**：`industry` ｜ **年份跨度**：2020–2026

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源线索 |
|---|---|---|---|---|
| 1 | AlphaFold 1：CASP13 与 2020 年 Nature 论文 | 距离势为什么能让结构预测跳一档，又留下了什么 | Senior 等（2020，DeepMind）；CASP13 评估组（2018） | https://doi.org/10.1038/s41586-019-1923-7；CASP13 官方结果页 |
| 2 | AlphaFold 2 与 CASP14 | 原子级精度是怎么做到的，还剩什么没解决 | Jumper 等（2021，DeepMind） | https://doi.org/10.1038/s41586-021-03819-2；CASP14 官方评估 |
| 3 | 蛋白质设计：RFdiffusion 与 ProteinMPNN | 从「预测已有结构」到「造不存在蛋白」 | Watson（2023，Baker Lab）；Dauparas（2022，Baker Lab） | https://doi.org/10.1038/s41586-023-06415-8；https://doi.org/10.1126/science.add2187 |
| 4 | 材料发现：GNoME 与 A-Lab | 预测稳定材料与真的合成，哪个更难 | Merchant（2023，DeepMind）；Szymanski（2023，LBNL） | https://doi.org/10.1038/s41586-023-06735-9；https://doi.org/10.1038/s41586-023-06734-w |
| 5 | 气象：GraphCast 与盘古 | AI 预报为什么能在中期时效上赢传统模式 | Lam（2023，DeepMind）；Bi（2023，华为） | https://doi.org/10.1126/science.adi2336；https://doi.org/10.1038/s41586-023-06185-3 |
| 6 | 数学：AlphaGeometry 与 AlphaProof | 形式证明与自然语言数学，AI 各走到哪一步 | Trinh（2024，DeepMind）；DeepMind（2024，IMO） | https://doi.org/10.1038/s41586-023-06747-5；IMO 2024 官方成绩页 |
| 7 | 药物研发：从靶点到临床的十年漏斗 | AI 缩短的是哪一段，临床失败率变了吗 | Stokes（2020，MIT）；Insilico Medicine（2023/2024） | https://doi.org/10.1016/j.cell.2020.01.021；Insilico 官方临床公告（以官方页为准） |
| 8 | 实验自动化与可复现性 | 机器人化学家能否替代「手」而不只是「脑」 | Boiko（2023，CMU）；Cooper（2020，Liverpool） | https://doi.org/10.1038/s41586-023-06792-0；https://doi.org/10.1038/s41586-020-2442-2 |

**玩法挂载建议**：第 1 章挂「失窃页：CASP13 结果表」；第 4 章挂「可玩演示：材料稳定性筛选」。

---

## b25 ·《AI 做内容》 艺术 / 音乐 / 视频 / 游戏 / 广告 / 版权

> 一句话：生成模型把内容生产的边际成本压到接近零，于是争议从「能不能做」转向「谁算作者、谁分钱」。

- **id**：`b25` ｜ **楼层**：L3 ｜ **style**：`industry` ｜ **年份跨度**：2015–2026

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源线索 |
|---|---|---|---|---|
| 1 | 生成艺术谱系：AARON、DeepDream、风格迁移 | 机器创作从规则绘图走到统计学习，中间发生了什么 | Harold Cohen（1973）；Mordvintsev（2015，Google）；Gatys（2015，Tübingen） | https://arxiv.org/abs/1508.06576；DeepDream 谷歌博客（2015） |
| 2 | 图像生成商业化三条路 | Midjourney、Stable Diffusion、Firefly 各卖什么 | Midjourney（2022）；Stability AI（2022）；Adobe（2023） | https://arxiv.org/abs/2112.10752；三家公司官方页 |
| 3 | 音乐：MuseNet、MusicLM 到 Suno | 旋律生成先撞上版权，还是先撞上审美 | OpenAI（2019）；Google（2023）；RIAA（2024） | https://arxiv.org/abs/2301.11325；RIAA 2024 诉讼公告（以官方页为准） |
| 4 | 视频：Runway、Sora 与「世界模型」话术 | 时间一致性为什么是视频生成的死结 | Runway（2018）；OpenAI（2024） | OpenAI Sora 技术报告（2024-02，以官方页为准）；https://arxiv.org/abs/2204.03458 |
| 5 | 游戏：NPC、资产生成与 AlphaStar | AI 在游戏里先当对手还是先当工人 | DeepMind（2019）；NVIDIA（2023） | https://doi.org/10.1038/s41586-019-1724-z；NVIDIA ACE 官方页 |
| 6 | 广告与营销 | 文案、素材与「AI 代言人」如何改变投放 | Jasper（2021）；可口可乐（2023）；Sports Illustrated（2023） | 品牌官方公告（以官方页为准）；SI 假作者事件报道（2023） |
| 7 | 新闻与出版 | 自动写作、摘要与信任如何同时下滑 | AP（2014）；CNET（2023）；Guardian（2023） | AP 自动化写作公告（2014）；CNET 更正说明（2023） |
| 8 | 版权与真实性 | 谁是作者、平台怎么标注、诉讼怎么判 | 美国版权局（2023）；Thaler（2023）；C2PA（2021） | https://www.copyright.gov/ai/；https://c2pa.org/；EU AI Act 第 50 条 |

**玩法挂载建议**：第 6 章挂「失败博物馆：Sports Illustrated 假作者」；第 8 章挂「失窃页：美国版权局 AI 登记决定」。

---

## b26 ·《AI 做医疗》 影像 / 病理 / 药物 / 临床 / 手术机器人 / 监管

> 一句话：医疗 AI 的瓶颈不在模型，而在审批、责任和医院愿不愿意改工作流。

- **id**：`b26` ｜ **楼层**：L3 ｜ **style**：`industry` ｜ **年份跨度**：2016–2026

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源线索 |
|---|---|---|---|---|
| 1 | 医学影像：从 CAD 到深度学习 | 读片权到底交给机器还是交给医生 | FDA（1990s/2018）；Rajpurkar（2017，Stanford） | FDA AI 设备清单；https://arxiv.org/abs/1711.05225 |
| 2 | 数字病理：全切片图像与 Paige | 十亿像素图像如何进临床流程 | CAMELYON（2016）；Paige（2021） | CAMELYON16 官方页；FDA Paige Prostate 公告（2021，以官方页为准） |
| 3 | 药物研发：生成式化学缩短哪一段 | 临床前周期压缩，能换来更高成功率吗 | Stokes（2020，MIT）；Insilico Medicine（2023） | https://doi.org/10.1016/j.cell.2020.01.021；Insilico 官方页 |
| 4 | 临床知识与对话：Med-PaLM 与 AMIE | 会考试的模型离会看病的系统差什么 | Singhal（2023，Google）；Google（2024，AMIE） | https://doi.org/10.1038/s41586-023-06291-2；AMIE 论文（2024，以论文页为准） |
| 5 | 手术机器人：达芬奇与自主缝合 | 遥操作、增强现实与自主，三级跳走到哪 | Intuitive（1995/2000）；Shademan（2016，Johns Hopkins） | Intuitive 官方历史页；STAR 论文（Science Robotics 2016，以论文页为准） |
| 6 | 监管路径：510(k)、De Novo 与 EU MDR | 一个 AI 功能要多久才能进医院 | FDA（2021）；EU（2017） | FDA SaMD Action Plan（2021，以官方页为准）；EU MDR 2017/745 |
| 7 | 医院落地：采购、工作流与最后一公里 | 为什么装了系统，医生还是不用 | 医院联盟（2020–2026）；Stanford HAI（2026） | AI Index；医院采购案例（以机构页为准） |
| 8 | 失败与责任：Watson for Oncology | 一个明星产品为什么在 2018 年崩掉 | IBM（2013–2018）；STAT（2018） | STAT 2018 调查报道；IBM 官方回应（以官方页为准） |

**玩法挂载建议**：第 6 章挂「监管路径图」；第 8 章挂「失败博物馆：Watson for Oncology」。

---

## b27 ·《AI 做金融》 风控 / 欺诈 / 量化 / 信用 / 保险 / 监管

> 一句话：金融是 AI 最早赚到钱的地方，也是最早被监管盯上的地方——因为这里的错误直接等于损失。

- **id**：`b27` ｜ **楼层**：L3 ｜ **style**：`industry` ｜ **年份跨度**：1987–2026

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源线索 |
|---|---|---|---|---|
| 1 | 信用评分：从 Durand 到 FICO | 一个分数如何决定谁能贷款、利率多少 | Durand（1941，前史）；Fair Isaac（1956/1989） | Durand《Risk Elements in Consumer Instalment Financing》（1941）；FICO 官方历史页 |
| 2 | 欺诈检测：神经网络先进银行 | 为什么反欺诈比信用评分更早用上机器学习 | Visa/Mastercard（1990s）；Stripe（2016） | 公司官方技术页（以官方页为准）；支付卡欺诈研究（以论文页为准） |
| 3 | 算法交易与两次崩盘 | 1987 与 2010 的教训如何改写风控 | SEC（2010）；CFTC（2010） | SEC 2010 闪崩联合报告（以官方页为准）；1987 Brady 报告 |
| 4 | 量化基金：因子、数据与机器学习 | 超额收益到底来自数据、模型还是执行 | Renaissance（1988）；Two Sigma（2001）；AQR（1998） | 三家公司官方页；量化投资研究（以论文页为准） |
| 5 | 保险与定价 | 风险细分、Lemonade 与「公平」如何冲突 | Lemonade（2015）；ECJ（2011） | Lemonade 官方页；ECJ Test-Achats 判决（2011） |
| 6 | 反洗钱与风控 | 规则、图谱与 99% 的误报率 | FATF（1989/2012）；银行合规（2010s） | FATF 建议（以官方页为准）；银行合规报告（以机构页为准） |
| 7 | 监管：SEC、CFPB 与 EU AI Act | 算法承保、投顾与「高风险」怎么分 | SEC（2010）；CFPB（2023）；EU（2024） | CFPB 指引（2023，以官方页为准）；https://eur-lex.europa.eu/eli/reg/2024/1689/oj |
| 8 | 系统性风险：模型同质化 | 所有人用相似模型，会不会制造下一次危机 | FSB（2021/2024）；BIS（2023） | FSB AI 金融报告（以官方页为准）；BIS 工作论文 |

**玩法挂载建议**：第 1 章挂「可玩演示：评分卡阈值」；第 3 章挂「失败博物馆：2010 闪崩」。

---

## b28 ·《AI 做教育》 ITS / 语言学习 / 批改 / 个性化 / 学术诚信 / 公平

> 一句话：教育 AI 最古老也最顽固的问题不是「会不会教」，而是「教谁、按什么标准教、谁来负责教错了」。

- **id**：`b28` ｜ **楼层**：L3 ｜ **style**：`industry` ｜ **年份跨度**：1970–2026

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源线索 |
|---|---|---|---|---|
| 1 | 智能导师：SCHOLAR 与 Cognitive Tutor | 机器如何知道学生「卡在哪一步」 | Carbonell（1970，Bolt Beranek and Newman）；Anderson（1985/1990s，CMU） | Carbonell 1970 论文（以论文页为准）；Carnegie Learning 官方历史页 |
| 2 | 自动批改：e-rater 与作文评分 | 机器能判几分，判得公平吗 | ETS（1997）；Burstein | ETS e-rater 官方页；自动作文评分综述（以论文页为准） |
| 3 | 语言学习：Rosetta Stone 到 Duolingo | 间隔重复、语音打分与游戏化，哪个真有效 | Rosetta Stone（1992）；Duolingo（2011/2023） | 两家官方页；Duolingo Max 发布公告（2023） |
| 4 | 个性化与知识追踪 | ALEKS、Knewton 与 BKT/DKT 各自假设什么 | ALEKS（1996）；Knewton（2008）；Piech（2015，Stanford） | https://arxiv.org/abs/1506.05908；ALEKS 官方页 |
| 5 | 课堂平台：ASSISTments 与 Khanmigo | 工具进课堂后，老师的工作变了什么 | Heffernan（2003，WPI）；Khan Academy（2008/2023） | ASSISTments 官方页；Khanmigo 发布页（2023） |
| 6 | 学术诚信：Turnitin 与 GPTZero | AI 检测器为什么反复误判 | Turnitin（1998）；Tian（2023，Princeton） | Turnitin 官方页；GPTZero 官方页 |
| 7 | 公平与鸿沟 | 硬件、语言与残障辅助如何决定谁受益 | UNESCO（2023）；中国教育部（2018） | UNESCO 生成式 AI 教育指引（2023）；教育信息化 2.0 文件 |
| 8 | 生意与效果 | EdTech 泡沫之后，AI 家教真的提分吗 | Kestin（2024，Harvard）；Stanford HAI（2026） | Kestin 等 2024 实验（以论文页为准）；AI Index |

**玩法挂载建议**：第 4 章挂「知识追踪曲线」；第 6 章挂「失败博物馆：AI 检测误判」。

---

## b29 ·《AI 做交通》 自动驾驶 / 车路协同 / 无人机 / 智慧交通 / 安全

> 一句话：交通 AI 的每一次规模化，都是用一次事故或一次立法换来的。

- **id**：`b29` ｜ **楼层**：L3 ｜ **style**：`industry` ｜ **年份跨度**：2004–2026

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源线索 |
|---|---|---|---|---|
| 1 | ALVINN 与三次 DARPA 考试 | 自动驾驶如何从实验室 demo 变成国家赛道 | Pomerleau（1989，前史）；DARPA（2004–2007） | ALVINN 论文（以论文页为准）；DARPA 挑战赛官方档案 |
| 2 | 两条路线：模块化与端到端 | 感知-规划-控制拆开，还是一个大网络包办 | Waymo（2009–）；NVIDIA（2016）；UniAD（2023） | https://arxiv.org/abs/1604.07316；UniAD（CVPR 2023，以论文页为准） |
| 3 | 车路协同：V2X 与中国方案 | 车聪明还是路聪明，成本谁付 | 3GPP（2016）；无锡示范区（2018）；百度 Apollo（2017） | 3GPP C-V2X 规范；无锡示范区官方材料 |
| 4 | 无人机：消费级、物流与巡检 | 飞控、图传与空域监管如何互相拉扯 | DJI（2006）；Amazon（2013）；Zipline（2014） | 三家公司官方页；FAA 无人机整合试点（2017） |
| 5 | 智慧交通：信号灯与城市大脑 | 城市级优化能省多少时间、谁有权限 | Alibaba（2016/2017）；Google（2007） | 阿里云城市大脑官方页；Google Maps 交通数据说明 |
| 6 | 事故与监管：Uber ATG 与 Cruise | 两次事故如何改变测试许可与安全文化 | NTSB（2019）；NHTSA（2023）；加州 DMV（2023） | NTSB 事故报告（2019）；加州 DMV 处罚公告（2023） |
| 7 | 法规与责任：L3/L4、UN R157 与保险 | 出了事，责任在车主、车企还是算法 | UNECE（2021）；德国（2021）；中国（2022） | UN R157 文本；德国 StVG 修正案（2021） |
| 8 | 商业模型：Robotaxi 的单位经济 | 去掉安全员之后，每公里能不能赚钱 | Waymo（2020–）；百度（2021/2024）；Cruise（2023） | Waymo 官方页；萝卜快跑运营公告（以官方页为准） |

**玩法挂载建议**：第 6 章挂「失败博物馆：Uber ATG 2018」；第 8 章挂「Robotaxi 单位经济账本」。

---

## b30 ·《AI 做工业》 预测性维护 / 质检 / 工业机器人 / 数字孪生 / 供应链 / 能源

> 一句话：工业 AI 的对手不是同行，是停机的每一分钟、良率的每一个百分点和不肯共享的数据孤岛。

- **id**：`b30` ｜ **楼层**：L3 ｜ **style**：`industry` ｜ **年份跨度**：2016–2026

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源线索 |
|---|---|---|---|---|
| 1 | 工业 4.0 与预测性维护 | 振动信号如何变成「还剩多少小时」 | 德国政府（2011/2013）；NASA（2008） | Hannover Messe 2011 材料；NASA C-MAPSS 数据集页 |
| 2 | 工业质检：缺陷、少样本与节拍 | 为什么实验室 99% 到产线只剩 70% | Bergmann（2019，MVTec AD）；制造业客户（2019–） | https://arxiv.org/abs/1901.07042 |
| 3 | 工业机器人：Unimate 到协作机器人 | 安全围栏拆掉之后，人和机器怎么分工 | Unimation（1961）；KUKA（1898）；Universal Robots（2005） | 三家公司官方历史页；ISO 10218 标准 |
| 4 | 数字孪生：Grieves 与 NASA | 先建模型再建厂，还是先建厂再补模型 | Grieves（2002）；NASA（2010） | NASA 数字孪生报告（2010）；Grieves 原始讲义（以作者页为准） |
| 5 | 供应链：预测、库存与仓储机器人 | 需求预测的误差如何被库存放大 | Amazon（2012）；Blue Yonder（1985/2010s） | Amazon Kiva 收购公告（2012）；公司官方页 |
| 6 | 能源与电网：风电预测与智能电网 | 间歇性电源靠什么被调度 | DeepMind（2019）；电网运营商（2020s） | DeepMind 风电博客（2019）；IEA 电网报告 |
| 7 | 工业大模型：手册、排产与 Copilot | 老师傅的经验能不能被文档化 | Siemens（2023）；Microsoft（2023） | Siemens Industrial Copilot 发布公告（2023） |
| 8 | 落地的账：ROI 与最后一米 | 为什么试点很多、规模化很少 | McKinsey（2019/2024）；Stanford HAI（2026） | McKinsey 工业 AI 调研；AI Index |

**玩法挂载建议**：第 2 章挂「可玩演示：缺陷检测」；第 8 章挂「ROI 计算器」。

---

## b31 ·《中国 AI 产业》 政策 / 四小龙 / 芯片 / 大模型 / DeepSeek / 出海 / 中美竞争

> 一句话：中国 AI 的四条腿——政策、视觉、芯片、大模型——不是同时长出来的，而是被市场与管制轮流推着走。

- **id**：`b31` ｜ **楼层**：L3 ｜ **style**：`industry` ｜ **年份跨度**：2017–2026

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源线索 |
|---|---|---|---|---|
| 1 | 863 与早期布局 | 中国 AI 从哪一年开始算，钱从哪来 | 王大珩等（1986）；国务院（2006） | 863 计划档案；《国家中长期科学和技术发展规划纲要（2006–2020）》 |
| 2 | 视觉四小龙 | 商汤、旷视、云从、依图如何起量又为何分化 | 2011–2015；美国商务部（2019） | 四家公司官方页；美国商务部实体清单公告（2019） |
| 3 | 政策与试验区 | 《新一代人工智能发展规划》改变了什么 | 国务院（2017-07）；科技部（2019） | https://www.gov.cn/zhengce/content/2017-07/20/content_5211996.htm；科技部试验区公告 |
| 4 | 芯片与算力 | 寒武纪、昇腾、壁仞如何在管制下补位 | 寒武纪（2016）；华为（2019）；BIS（2022–2024） | 各公司官方页；BIS 规则公告（以官方页为准） |
| 5 | 大模型第一波 | 文心、通义、混元、智谱各自赌什么 | 百度（2019/2023）；阿里（2023）；腾讯（2023）；智谱（2019/2022） | https://arxiv.org/abs/2210.02414（GLM-130B）；各家官方页 |
| 6 | DeepSeek 与低成本叙事 | V3、R1 为什么把「算力焦虑」改成「效率叙事」 | 深度求索、梁文锋（2023–2025） | https://arxiv.org/abs/2412.19437；https://arxiv.org/abs/2501.12948 |
| 7 | 应用与出海 | TikTok、SHEIN、传音与 AI 硬件走了哪条路 | 字节（2016/2017）；SHEIN（2008/2012）；传音（2006） | 三家公司官方页；应用数据报告（以原文为准） |
| 8 | 中美竞争：管制、人才与开源 | 芯片禁令与开源策略如何互相塑造 | BIS（2022–2024）；Stanford HAI（2026） | BIS 公告（以官方页为准）；https://hai.stanford.edu/ai-index/2026-ai-index-report |

**玩法挂载建议**：第 2 章挂「四小龙时间线」；第 4 章挂「国产算力对照表」。

---

## b32 ·《AI 公司与资本》 OpenAI / DeepMind / Anthropic / DeepSeek / 英伟达 / 融资与泡沫

> 一句话：这一轮 AI 的真正产品可能不是模型，而是「把算力、人才和叙事打包成估值」的公司结构。

- **id**：`b32` ｜ **楼层**：L3 ｜ **style**：`industry` ｜ **年份跨度**：2010–2026

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源线索 |
|---|---|---|---|---|
| 1 | DeepMind：从游戏 AI 到 6.5 亿美元收购 | 一家英国实验室如何被谷歌买走 | Hassabis、Legg、Suleyman（2010/2014） | DeepMind 官方历史页；Google 2014 收购公告（以官方页为准） |
| 2 | OpenAI：非营利、封顶利润与微软的钱 | 使命与股权结构如何互相妥协 | Altman、Musk 等（2015）；Microsoft（2019/2023/2024） | OpenAI 官方章程页；Microsoft 投资公告（以官方页为准） |
| 3 | Anthropic：宪法 AI 与安全优先融资 | 「安全」能不能成为商业卖点 | Amodei 兄妹（2021）；Amazon（2023） | https://arxiv.org/abs/2212.08073；Amazon 投资公告（2023） |
| 4 | 英伟达：从显卡到 3 万亿市值 | 卖铲子的人为什么比挖金子的人更赚 | 黄仁勋（1993/2023/2024） | NVIDIA 年报（以官方页为准）；市值里程碑报道（以原文为准） |
| 5 | 中国力量：DeepSeek、月之暗面、智谱 | 美元基金、国资与战投如何组合 | 2023–2025 | 各公司官方页；融资报道（以原文为准） |
| 6 | 估值与收入：ARR 与单位经济 | 收入增长能不能追上算力开支 | OpenAI/Anthropic（2024–2026） | The Information 报道（以原文为准）；AI Index |
| 7 | 泡沫论：资本开支与 2000 年对照 | 循环交易、折旧年限与「这次不一样」 | Sequoia（2024）；Stanford HAI（2026） | Sequoia《AI's $600B Question》（2024）；AI Index |
| 8 | 治理与游说：安全承诺与政策 | 公司自愿承诺、出口管制与欧盟执法 | 白宫（2023）；UK AISI（2023）；EU（2024） | 白宫自愿承诺（2023-07）；UK AISI 官方页；EU AI Act |

**玩法挂载建议**：第 4 章挂「市值里程碑」；第 7 章挂「泡沫对照：2000 vs 2026」。

---

## b33 ·《AI 产品史》 搜索 / 推荐 / Copilot / 客服 / 创意工具 / 手机助手 / 企业 SaaS

> 一句话：AI 产品史不是模型发布史，而是「用户在哪个界面第一次觉得它有用」的历史。

- **id**：`b33` ｜ **楼层**：L1 ｜ **style**：`history` ｜ **年份跨度**：1997–2026

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源线索 |
|---|---|---|---|---|
| 1 | 搜索：PageRank、RankBrain 到生成式答案 | 从「给十个链接」到「给一个答案」，谁在承担错误 | Brin & Page（1998，Stanford）；Google（2015/2024） | PageRank 论文（WWW 1998，以论文页为准）；Google AI Overviews 公告（2024） |
| 2 | 推荐：Amazon 到 TikTok 信息流 | 信息过载如何变成注意力生意 | Amazon（2003）；YouTube（2016）；字节（2016） | https://doi.org/10.1109/MIC.2003.1167344；https://doi.org/10.1145/2959100.2959190 |
| 3 | 办公 Copilot：GitHub 到 M365 | 补全、生成与「谁为代码负责」 | GitHub（2021）；Microsoft（2023） | GitHub Copilot 发布博客；Microsoft 365 Copilot 公告（2023） |
| 4 | 客服：从 IVR 到 AI Agent | 为什么一个聊天机器人能签下赔偿判例 | Intercom（2023）；Air Canada（2024） | Intercom Fin 发布页；Air Canada 仲裁裁决报道（2024） |
| 5 | 创意工具：Photoshop、Canva 与生成式填充 | 专业工具如何把生成能力藏进工具栏 | Adobe（2013/2023）；Canva（2013） | Adobe Firefly 官方页；Canva 官方页 |
| 6 | 手机助手：Siri、Assistant 到端侧模型 | 助手为什么十年没变，端侧模型能改什么 | Apple（2011/2024）；Google（2016） | Apple Intelligence 公告（2024）；Google Assistant 发布页（2016） |
| 7 | 企业 SaaS：Einstein 到 AI 原生应用 | 加一个 AI 按钮，还是重写整个工作流 | Salesforce（2016/2023/2024） | Salesforce 官方公告；Agentforce 发布页（2024） |
| 8 | 产品的失败学 | 为什么多数 AI 产品活不过 demo | MIT NANDA（2025）；失败案例 | MIT NANDA《The GenAI Divide》（2025）；Air Canada 2024 |

**玩法挂载建议**：第 8 章挂「失败博物馆：Air Canada / 麦当劳 AI 点餐」。

---

## b34 ·《AI 与科学哲学》 智能定义 / 计算主义 / 意识 / 因果 / 具身认知 / 认识论

> 一句话：AI 一直在偷偷使用一套关于「什么是智能、什么是理解」的哲学假设，只是它从不承认。

- **id**：`b34` ｜ **楼层**：L4 ｜ **style**：`frontier` ｜ **年份跨度**：1950–2026

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源线索 |
|---|---|---|---|---|
| 1 | 智能的定义：图灵、AIXI 与「通用」 | 测不出来的是不是就不算智能 | Turing（1950）；Hutter（2000/2005） | https://doi.org/10.1093/mind/LIX.236.433；Hutter《Universal Artificial Intelligence》 |
| 2 | 计算主义：心智是程序吗 | 符号操作能不能等于思考 | Newell & Simon（1976）；Putnam（1960） | Newell & Simon CACM 1976（以论文页为准）；SEP「Computational Theory of Mind」 |
| 3 | 意识：困难问题与机器 | 行为像人，是否意味着有体验 | Chalmers（1995）；Butlin（2023） | https://consc.net/papers/facing.html；https://arxiv.org/abs/2308.08708 |
| 4 | 符号接地：意义从哪里来 | 中文屋之外，词如何「指到东西」 | Harnad（1990）；Searle（1980） | Harnad《The Symbol Grounding Problem》（Physica D 1990）；https://doi.org/10.1017/S0140525X00005756 |
| 5 | 因果：相关不等于因果 | 机器能从观测里学出因果图吗 | Pearl（2000）；Spirtes（1993）；Peters（2017） | Pearl《Causality》；Peters《Elements of Causal Inference》 |
| 6 | 具身认知 | 没有身体的智能到底缺了什么 | Dreyfus（1972）；Brooks（1991）；Varela（1991） | https://doi.org/10.1016/0004-3702(91)90053-M；Dreyfus《What Computers Can't Do》 |
| 7 | 认识论：机器能做出科学发现吗 | AlphaFold 是工具还是合作者 | Jumper（2021，DeepMind）；SEP | https://doi.org/10.1038/s41586-021-03819-2；SEP「Scientific Discovery」（以条目页为准） |
| 8 | 伦理与后人类 | 主体、责任与「人」的边界如何重画 | Haraway（1985）；Bostrom（2014）；Floridi（2013） | Haraway《Cyborg Manifesto》；Bostrom《Superintelligence》；Floridi《The Ethics of Information》 |

**玩法挂载建议**：第 4 章挂「可玩演示：中文屋」；第 6 章挂「具身认知对照」。

---

## b35 ·《AI 与世界》 气候 / 能源 / 农业 / 灾害 / 人道救援 / 可持续 / 全球治理

> 一句话：AI 既能帮地球省电，也在快速耗电；这两笔账必须写在同一页上。

- **id**：`b35` ｜ **楼层**：L4 ｜ **style**：`frontier` ｜ **年份跨度**：2019–2026

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源线索 |
|---|---|---|---|---|
| 1 | 气候：AI 减排多少、自己又排多少 | 机器学习在气候里是净收益还是净成本 | Schwartz（2019，Mila）；IEA（2024） | https://arxiv.org/abs/1906.05433；https://www.iea.org/reports/electricity-2024 |
| 2 | 能源：数据中心、核电与电网 | 一座数据中心能不能被一座电站养活 | Microsoft（2024）；IEA（2024） | Three Mile Island PPA 公告（2024）；IEA 报告 |
| 3 | 农业：精准农业与小农户 | 除草机器人省下的农药，谁买得起 | Blue River（2017）；John Deere（2022）；FAO（2022） | 公司官方页；FAO 报告（以官方页为准） |
| 4 | 灾害：洪水、野火与预警时间 | 多提前一小时预警，能救多少人 | Google（2018/2022）；UN（2015） | Google Flood Hub 官方页；仙台减灾框架（2015） |
| 5 | 人道救援：难民、地雷与卫星影像 | 救援数据化会不会伤害被救援者 | OCHA（2014）；UNHCR（2020s） | HDX 官方页；UNHCR 创新报告（以官方页为准） |
| 6 | 生物多样性：声学与相机陷阱 | 自动识别能否替代长期野外监测 | Google/WWF（2019）；Rainforest Connection（2014） | Wildlife Insights 官方页；RFCx 官方页 |
| 7 | 可持续与循环 | 材料、废弃物与供应链如何被算法重排 | Ellen MacArthur Foundation（2010/2013） | 基金会报告（以官方页为准） |
| 8 | 全球治理：UNESCO、G7 与全球南方 | 原则、峰会与约束力之间差什么 | UNESCO（2021）；G7（2023）；UN（2024） | UNESCO 伦理建议书；G7 广岛进程；Global Digital Compact（2024） |

**玩法挂载建议**：第 4 章挂「洪水预警地图」；第 8 章挂「治理拼图」。

---

## b36 ·《AI 与人类未来》 劳动 / 教育 / 医疗 / 心理 / 社交 / 不平等 / 治理 / 后人类

> 一句话：关于 AI 未来的争论，真正分歧不在技术速度，而在「谁承担转型成本」。

- **id**：`b36` ｜ **楼层**：L4 ｜ **style**：`frontier` ｜ **年份跨度**：2022–2026

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源线索 |
|---|---|---|---|---|
| 1 | 劳动：替代、重组与「任务」视角 | 消失的是岗位，还是岗位里的一部分任务 | Acemoglu & Restrepo（2019，MIT）；Eloundou（2023，OpenAI） | https://arxiv.org/abs/2303.10130；Acemoglu & Restrepo, JEP 2019 |
| 2 | 教育与技能：学位还有意义吗 | 当作业和考试都可生成，学校卖的是什么 | Khan Academy（2023）；OECD（2023） | Khanmigo 官方页；OECD 教育报告（以官方页为准） |
| 3 | 医疗与照护：诊断、陪伴与责任 | AI 医生和 AI 护工，哪个先被接受 | Singhal（2023，Google）；Google（2024，AMIE） | https://doi.org/10.1038/s41586-023-06291-2；AMIE 论文（2024，以论文页为准） |
| 4 | 心理与社交：陪伴、孤独与依恋 | 一个永远回应你的程序，是解药还是加重 | Replika（2017）；Character.AI（2022）；诉讼（2024） | 两家公司官方页；2024 诉讼报道（以原文为准） |
| 5 | 不平等：算力、数据与 AI 鸿沟 | 算力集中会不会变成能力集中 | Stanford HAI（2026）；UN（2024） | AI Index；UN 报告（以官方页为准） |
| 6 | 治理：从原则到执法 | 自愿承诺、行政令与法案，哪个真的咬人 | EU（2024）；中国（2023）；美国（2023，2025 撤销） | https://eur-lex.europa.eu/eli/reg/2024/1689/oj；《生成式人工智能服务管理暂行办法》；美国 EO 14110 |
| 7 | 后人类：增强、上传与「人」的定义 | 改造身体与复制心智，伦理边界在哪 | Haraway（1985）；Moravec（1988）；Kurzweil（2005） | 三本书目页（以出版方页为准） |
| 8 | 三种未来：乐观、悲观与「看情况」 | 如何不被叙事带走，保留可检验的判断 | Bostrom（2014）；Stanford HAI（2026） | Bostrom《Superintelligence》；AI Index |

**玩法挂载建议**：第 1 章挂「任务暴露度数据卡」；第 7 章挂「后人类书架」。

---

## 写手派单与验收要点

1. **一册一册派**：每本 8 章由一个写手连续写完，先交第 1、8 章做样章，再补 2–7 章，保证同一册口径一致。
2. **来源下限**：每章 3 条起，其中至少 1 条为论文/官方文档；Wikipedia 只做交叉核对。
3. **数字纪律**：参数量、金额、年份、错误率必须能在来源页找到；找不到就改成「约」「据 X 记载」或删掉。
4. **跨书去重**：b8 已写过的 CLIP/ImageNet 等，在 b17、b20、b21 只写「数据/技术/Agent」侧的新角度，不复述 b8 的九段。
5. **玩法装置上限**：失窃页全站规划 8 处、失败博物馆 20 件、模型尺寸墙 12 个；本文件中的挂载建议若超出，需先与总编合并去重，不擅自新增。

> 总计：24 本 × 8 章 = **192 章**。
