# 机忆书库 · 详细目录（96 章）

> 用途：给你审书单和章节切分。确认后再写 12 个样章（每本 1 章），样章通过后批量写。
> 每章最终都要满足：1500–2500 字、9 段结构、3–6 条可点来源。
> 下表“初版来源”只是开工前的线索，**开写前会逐条打开核对**；打不开或对不上的换来源或删条目，不编造。
>
> 共通底本：Russell & Norvig《Artificial Intelligence: A Modern Approach》(https://aima.cs.berkeley.edu/)；Nilsson《The Quest for Artificial Intelligence》；Stanford HAI《AI Index 2026》(https://hai.stanford.edu/ai-index/2026-ai-index-report)；SEP“Artificial Intelligence”(https://plato.stanford.edu/entries/artificial-intelligence/)。Wikipedia 只做交叉核对，不作唯一来源。

---

## 1. 《序卷：何为智能》

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源 |
|---|---|---|---|---|
| 1 | 图灵的问题 | “机器能思考吗”到底问的是什么 | 图灵（1950）；Hodges 传记 | Turing, *Mind* 1950, https://doi.org/10.1093/mind/LIX.236.433 |
| 2 | 达特茅斯之前 | 控制论、神经模型、信息论如何汇流 | McCulloch & Pitts（1943）；Wiener（1948）；Hebb（1949）；Shannon（1948） | https://doi.org/10.1007/BF02478259；Wiener《Cybernetics》；Hebb《The Organization of Behavior》 |
| 3 | 达特茅斯会议 | 1956 年夏天到底发生了什么，“AI”如何得名 | McCarthy、Minsky、Shannon、Rochester（1956） | 达特茅斯提案 http://www-formal.stanford.edu/jmc/history/dartmouth/dartmouth.html |
| 4 | 符号与逻辑 | 为什么早期 AI 相信“推理=搜索+符号” | Newell、Shaw、Simon（1956–57）；Frege、Russell | Logic Theorist / GPS 原始报告（RAND）；SEP“Logic and AI” |
| 5 | 感知机第一次浪潮 | 学习机器第一次进入公众想象，又为何退潮 | Rosenblatt（1958）；Widrow & Hoff（1960） | https://doi.org/10.1037/h0042519 |
| 6 | 中文屋与意识 | 会说话是否等于理解；意识问题为何难 | Searle（1980）；Chalmers（1995） | https://doi.org/10.1017/S0140525X00005756；https://consc.net/papers/facing.html |
| 7 | 具身与情境 | 智能是否必须有一个身体 | Brooks（1991）；Pfeifer & Bongard（2006） | https://doi.org/10.1016/0004-3702(91)90053-M |
| 8 | AI 在人类知识中的位置 | AI 与计算机、数学、认知科学、生物、哲学、经济的关系 | 学科地图；AI Index 2026 | AI Index 2026；AIMA 第 1 章；SEP |

**玩法挂载**：第 8 章挂“学科地图”（3D 折页/星图，独立装置，不算一本）；第 3 章挂“失窃页：达特茅斯提案原件”。

---

## 2. 《符号的世纪》

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源 |
|---|---|---|---|---|
| 1 | Logic Theorist 与 GPS | 机器能否证明定理、规划步骤 | Newell、Shaw、Simon（1956–57） | RAND 报告；AIMA 第 1、3 章 |
| 2 | ELIZA 与 SHRDLU | 第一代“会聊天”和“会摆积木”的错觉 | Weizenbaum（1966）；Winograd（1972） | https://doi.org/10.1145/365153.365168；Winograd《Understanding Natural Language》 |
| 3 | 专家系统 | 把专家知识写成规则，为什么能赚钱 | Feigenbaum、Buchanan、Shortliffe（1970s）；DENDRAL、MYCIN | AIMA 第 2 章；MYCIN 原始论文 |
| 4 | 知识表示 | 框架、语义网络、本体如何表达世界 | Minsky（1974）；Lenat（Cyc，1984） | Minsky《A Framework for Representing Knowledge》；Cyc 论文 |
| 5 | 第一次寒冬 | 1974–1980 资金为何断裂 | Lighthill 报告（1973）；DARPA 削减 | https://en.wikipedia.org/wiki/Lighthill_report；Science Museum AI 史 |
| 6 | 专家系统泡沫与第二次寒冬 | 1987–1993 专用硬件与专家系统为何崩 | XCON、Symbolics；日本第五代计算机（1982–92） | Science Museum AI 史；AI Index 历史章节 |
| 7 | 形式化的遗产 | Prolog、SAT/SMT、模型检验留下了什么 | Colmerauer（Prolog，1972）；模型检验 | AIMA 第 7–9 章；Prolog 论文 |
| 8 | 符号主义今天还在哪 | 知识图谱、规则引擎、神经符号 | Cyc、Wikidata、神经符号系统 | Cyc 官网；Wikidata；神经符号综述 |

**玩法挂载**：第 5 章挂“失败博物馆：第一次寒冬”；第 6 章挂“失败博物馆：第五代计算机 / 专家系统泡沫”；第 2 章挂“可玩演示：ELIZA 式模式匹配”。

---

## 3. 《神经的复活》

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源 |
|---|---|---|---|---|
| 1 | MP 神经元 | 一个简化神经元如何计算 | McCulloch & Pitts（1943） | https://doi.org/10.1007/BF02478259 |
| 2 | 感知机 | 第一个能“从数据学权重”的机器 | Rosenblatt（1958）；Mark I Perceptron | https://doi.org/10.1037/h0042519 |
| 3 | XOR 危机 | 单层感知机为何被判定“死路” | Minsky & Papert（1969） | Minsky & Papert《Perceptrons》 |
| 4 | 反向传播 | 多层网络如何终于能训练 | Rumelhart、Hinton、Williams（1986）；Werbos（1974） | https://doi.org/10.1038/323533a0 |
| 5 | LeNet 与卷积 | 卷积为什么适合图像 | LeCun（1989/1998）；Fukushima（1980） | https://doi.org/10.1109/5.726791 |
| 6 | LSTM 与序列 | 长依赖为什么难，门控怎么解 | Hochreiter & Schmidhuber（1997）；Cho（GRU，2014） | https://doi.org/10.1162/neco.1997.9.8.1735 |
| 7 | AlexNet | 2012 年为什么是分水岭：数据、GPU、ReLU、Dropout | Krizhevsky、Sutskever、Hinton（2012）；ImageNet | https://doi.org/10.1145/3065386；https://doi.org/10.1109/CVPR.2009.5206848 |
| 8 | ResNet 与深度 | 更深为什么更难训，残差怎么破 | He 等（2015）；BatchNorm（2015） | https://arxiv.org/abs/1512.03385 |

**玩法挂载**：第 2 章“可玩演示：感知机分界线”；第 4 章“梯度下降山谷”；第 5 章“卷积核滑动”；第 3 章“失败博物馆：XOR 危机”；第 2 章“失窃页：Mark I 接线图”。

---

## 4. 《学习的统计》

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源 |
|---|---|---|---|---|
| 1 | VC 维 | 为什么“能拟合”不等于“能泛化” | Vapnik、Chervonenkis（1971） | Vapnik《Statistical Learning Theory》；AIMA 第 19 章 |
| 2 | SVM 与核方法 | 最大间隔与核技巧为什么优雅 | Cortes & Vapnik（1995）；Boser（1992） | https://doi.org/10.1007/BF00994018 |
| 3 | 树与集成 | 随机森林、AdaBoost、XGBoost 为什么赢表格数据 | Breiman（2001）；Freund & Schapire（1997）；Chen（XGBoost，2016） | https://doi.org/10.1023/A:1010933404324；https://doi.org/10.1006/jcss.1997.1504 |
| 4 | 概率图模型 | 不确定性如何进入 AI | Pearl（1988）；HMM；CRF（2001） | Pearl《Probabilistic Reasoning in Intelligent Systems》；AIMA 第 14–15 章 |
| 5 | 特征工程 | “数据决定了上限”具体指什么 | Domingos（2012）；数据-centric AI | https://doi.org/10.1145/2347736.2347755 |
| 6 | 竞赛文化 | Netflix Prize、Kaggle 如何改变研究风格 | Netflix Prize（2006–09）；Kaggle（2010） | Netflix Prize 官网/维基；Kaggle |
| 7 | 评估与基准 | 交叉验证、校准、基准污染 | GLUE（2018）；校准（2017） | https://arxiv.org/abs/1804.07461；https://arxiv.org/abs/1706.04599 |
| 8 | 统计学习的今天 | 小数据、表格、可解释性还在哪 | 现代表格模型；因果推断 | AIMA；AI Index 2026 |

**玩法挂载**：第 1 章“可玩演示：过拟合与泛化”；第 3 章“决策树/随机森林可视化”；第 6 章“失败博物馆：Netflix Prize 的工程代价”。

---

## 5. 《注意力纪元》

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源 |
|---|---|---|---|---|
| 1 | seq2seq | 用一个网络把序列映射到序列 | Sutskever、Vinyals、Le（2014） | https://arxiv.org/abs/1409.3215 |
| 2 | 注意力 | 为什么对齐不需要靠记忆 | Bahdanau、Cho、Bengio（2015） | https://arxiv.org/abs/1409.0473 |
| 3 | Transformer | 去掉循环后，模型如何并行 | Vaswani 等（2017，Google） | https://arxiv.org/abs/1706.03762 |
| 4 | BERT | 双向预训练为什么改变 NLP | Devlin 等（2018，Google） | https://arxiv.org/abs/1810.04805 |
| 5 | GPT 与自回归 | 预测下一个词为什么能work | Radford 等（2018–2020，OpenAI） | GPT-2 https://openai.com/index/better-language-models/；GPT-3 https://arxiv.org/abs/2005.14165 |
| 6 | 缩放定律 | 参数、数据、算力如何交换 | Kaplan 等（2020，OpenAI） | https://arxiv.org/abs/2001.08361 |
| 7 | Chinchilla | “参数越多越好”错在哪 | Hoffmann 等（2022，DeepMind） | https://arxiv.org/abs/2203.15556 |
| 8 | 长上下文 | 上下文窗口为什么难、怎么扩 | RoPE（2021）；FlashAttention（2022）；Lost in the Middle（2023） | https://arxiv.org/abs/2104.09864；https://arxiv.org/abs/2205.14135；https://arxiv.org/abs/2307.03172 |

**玩法挂载**：第 3 章“可玩演示：注意力热力”；第 5 章“下一词预测”；第 8 章“上下文窗口滑块”；第 3 章“失窃页：原始注意力图”。

---

## 6. 《生成的想象》

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源 |
|---|---|---|---|---|
| 1 | VAE | 如何让网络“生成”而不是“判别” | Kingma & Welling（2013/14） | https://arxiv.org/abs/1312.6114 |
| 2 | GAN | 生成器与判别器如何对抗 | Goodfellow 等（2014） | https://arxiv.org/abs/1406.2661 |
| 3 | StyleGAN | 风格如何被分离与控制 | Karras 等（2018/2019，NVIDIA） | https://arxiv.org/abs/1812.04948 |
| 4 | 扩散 | 为什么“去噪”能生成图像 | Sohl-Dickstein（2015）；Ho（DDPM，2020） | https://arxiv.org/abs/1503.03585；https://arxiv.org/abs/2006.11239 |
| 5 | 文生图 | 文字如何变成像素 | DALL·E 2（2022）；Imagen（2022）；Stable Diffusion（2022） | https://arxiv.org/abs/2204.06125；https://arxiv.org/abs/2205.11487；https://arxiv.org/abs/2112.10752 |
| 6 | 视频生成 | 时间一致性为什么难 | Video Diffusion（2022）；Sora（2024） | https://arxiv.org/abs/2204.03458；OpenAI Sora 技术报告 |
| 7 | 多模态生成 | 图、文、音、视频如何进同一个模型 | Flamingo（2022）；GPT-4o（2024） | https://arxiv.org/abs/2204.14198；OpenAI GPT-4o 公告 |
| 8 | 版权与真实性 | 生成内容归谁、如何证明不是伪造 | 美国版权局；C2PA；EU AI Act | https://www.copyright.gov/ai/；https://c2pa.org/；https://eur-lex.europa.eu/eli/reg/2024/1689/oj |

**玩法挂载**：第 4 章“扩散去噪滑块”；第 2 章“GAN 对抗小游戏”；第 8 章“AI 失败博物馆：Sports Illustrated 假作者 / Willy’s Chocolate Experience”。

---

## 7. 《行动的智能》

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源 |
|---|---|---|---|---|
| 1 | 控制论与早期机器人 | 反馈、感知-行动循环从哪来 | Wiener（1948）；Shakey（1966–72，SRI） | Wiener《Cybernetics》；SRI Shakey 档案 |
| 2 | TD 与 Q-learning | 没有标签时如何从奖励里学 | Sutton（1988）；Watkins（1992） | https://doi.org/10.1007/BF00115009；https://doi.org/10.1007/BF00992698 |
| 3 | DQN | 深度网络如何稳住 RL | Mnih 等（2013/2015，DeepMind） | https://doi.org/10.1038/nature14236 |
| 4 | 策略梯度与 PPO | 连续动作、稳定性怎么解 | Williams（1992）；Schulman（PPO，2017） | https://doi.org/10.1007/BF00992696；https://arxiv.org/abs/1707.06347 |
| 5 | AlphaGo | 搜索+神经网络如何击败人类 | Silver 等（2016，DeepMind） | https://doi.org/10.1038/nature16961 |
| 6 | AlphaZero 与 MuZero | 不靠人类棋谱、不靠已知规则 | Silver（2017）；Schrittwieser（2019） | https://arxiv.org/abs/1712.01815；https://arxiv.org/abs/1911.08265 |
| 7 | RLHF | 人类偏好如何变成训练信号 | Christiano（2017）；Ouyang（InstructGPT，2022） | https://arxiv.org/abs/1706.03741；https://arxiv.org/abs/2203.02155 |
| 8 | Agent 与工具 | 从“会回答”到“会做事” | ReAct（2022）；Toolformer（2023）；Generative Agents（2023） | https://arxiv.org/abs/2210.03629；https://arxiv.org/abs/2302.04761；https://arxiv.org/abs/2304.03442 |

**玩法挂载**：第 2 章“Q-learning 走格子”；第 5 章“失窃页：AlphaGo 第 37 手”；第 8 章“失败博物馆：Project Vend / Air Canada 客服”。

---

## 8. 《感知与语言》

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源 |
|---|---|---|---|---|
| 1 | 早期视觉 | 边缘、特征、几何如何拼出“看见” | Marr（1982）；Canny（1986）；SIFT（2004） | Marr《Vision》；Canny 论文；SIFT 论文 |
| 2 | ImageNet | 数据规模如何点燃深度学习 | Deng 等（2009）；Fei-Fei Li | https://doi.org/10.1109/CVPR.2009.5206848 |
| 3 | 检测与分割 | 从“是什么”到“在哪里” | R-CNN（2014）；YOLO（2015）；Mask R-CNN（2017） | https://arxiv.org/abs/1311.2524；https://arxiv.org/abs/1506.02640；https://arxiv.org/abs/1703.06870 |
| 4 | 语音识别 | 从 HMM/GMM 到端到端 | DNN-HMM（2012）；Whisper（2022） | https://arxiv.org/abs/2212.04356 |
| 5 | 机器翻译 | 规则、统计、神经三代怎么换 | Koehn（统计 MT）；Bahdanau（NMT，2015） | Koehn《Statistical Machine Translation》；https://arxiv.org/abs/1409.0473 |
| 6 | 中文 NLP | 分词、中文语料、中文评测的特殊性 | 中文信息学会；CLUE（2020）；C-Eval（2023）；CMMLU（2023） | https://arxiv.org/abs/2004.05986；https://arxiv.org/abs/2305.08322；https://arxiv.org/abs/2306.09212 |
| 7 | CLIP | 图文对比学习为什么能零样本 | Radford 等（2021，OpenAI） | https://arxiv.org/abs/2103.00020 |
| 8 | 多模态大模型 | 一个模型如何同时看、听、说 | Flamingo（2022）；LLaVA（2023）；GPT-4o（2024） | https://arxiv.org/abs/2204.14198；https://arxiv.org/abs/2304.08485 |

**玩法挂载**：第 7 章“图文匹配小演示”；第 6 章“中文分词/评测对比”；第 4 章“失败博物馆：早期语音 demo 的过度承诺”。

---

## 9. 《智能与生命》

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源 |
|---|---|---|---|---|
| 1 | Hebb 与神经科学 | “一起放电的神经元”如何影响 AI | Hebb（1949）；神经科学 | Hebb《The Organization of Behavior》 |
| 2 | Hopfield | 记忆能否存进能量地形 | Hopfield（1982） | https://doi.org/10.1073/pnas.79.8.2554 |
| 3 | 进化计算 | 不用梯度，靠变异和选择 | Holland（1975）；遗传算法；神经进化 | Holland《Adaptation in Natural and Artificial Systems》 |
| 4 | 神经形态硬件 | 脉冲、低功耗、类脑芯片 | Loihi（2018，Intel）；脉冲网络 | Intel Loihi 论文/官网 |
| 5 | AlphaFold | 蛋白质结构为什么是 50 年难题 | Jumper 等（2020/2021，DeepMind）；CASP14 | https://doi.org/10.1038/s41586-021-03819-2 |
| 6 | 蛋白质设计 | 从预测结构到设计新蛋白 | RFdiffusion（2023）；Baker Lab | https://doi.org/10.1038/s41586-023-06415-8 |
| 7 | 医学影像 | 临床 AI 到底走到哪一步 | FDA AI/ML 设备清单；深度学习影像综述 | https://www.fda.gov/medical-devices/software-medical-device-samd/artificial-intelligence-enabled-medical-devices |
| 8 | 脑机接口 | 读神经信号是 AI 还是医学 | EEG/植入式 BCI；Neuralink（2016–） | BCI 综述；Neuralink 白皮书 |

**玩法挂载**：第 2 章“Hopfield 记忆召回小演示”；第 5 章“失窃页：CASP14 结果页”；第 7 章“失败博物馆：Watson for Oncology”。

---

## 10. 《智能与产业》

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源 |
|---|---|---|---|---|
| 1 | 实验室到产品 | 为什么 demo 和产品之间隔着一整条河 | 专家系统公司（1980s）；API 化（2010s） | AI Index 2026；AIMA 第 25 章 |
| 2 | 推荐系统 | 信息过载如何变成注意力经济 | Amazon（2003）；YouTube DNN（2016）；TikTok | Amazon 推荐论文；YouTube RecSys 2016 |
| 3 | 自动驾驶 | 从 ALVINN 到 Waymo，难点在哪 | Pomerleau（1989）；DARPA 挑战赛（2004–07）；Waymo（2018–） | ALVINN 论文；https://waymo.com/safety/ |
| 4 | 金融风控 | 评分、欺诈、算法交易与监管 | FICO；机器学习风控 | AI Index 2026 金融章节；监管报告 |
| 5 | 教育与知识工作 | AI 是助教、替身还是同事 | ITS；ChatGPT（2022）；Copilot（2021–） | UNESCO AI 教育报告；AI Index 2026 |
| 6 | 中国 AI 产业简史 | 从规划、BAT 到国产大模型 | 国务院《新一代人工智能发展规划》（2017）；商汤/旷视；DeepSeek（2025） | https://www.gov.cn/zhengce/content/2017-07/20/content_5211996.htm；中国信通院 http://www.caict.ac.cn/；AI Index 2026 |
| 7 | 算力与能源 | 训练和推理的账到底怎么算 | GPU/TPU；数据中心；能耗研究 | https://arxiv.org/abs/1907.10597；AI Index 2026 环境章节 |
| 8 | 劳动与经济 | 岗位会被替代还是被重组 | AI Index 2026；OECD；GPTs are GPTs | https://arxiv.org/abs/2303.10130；AI Index 2026 |

**玩法挂载**：第 3 章“自动驾驶感知小演示”；第 7 章“模型尺寸墙 / 算力铜秤”；第 8 章“职业影响数据卡”。

---

## 11. 《智能的边界》

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源 |
|---|---|---|---|---|
| 1 | 对齐 | 让系统“想要”的和我想要的同向 | Amodei（2016）；Russell（2019）；RLHF | https://arxiv.org/abs/1606.06565；Russell《Human Compatible》 |
| 2 | 可解释 | 我们到底能不能知道它为什么这么答 | LIME（2016）；Circuits（2020）；单义性（2024） | https://arxiv.org/abs/1602.04938；https://distill.pub/2020/circuits/；https://transformer-circuits.pub/2024/scaling-monosemanticity/ |
| 3 | 评测的局限 | 分数高为什么不等于可靠 | HELM（2022）；基准污染；校准 | https://arxiv.org/abs/2211.09110；https://arxiv.org/abs/1706.04599 |
| 4 | 安全与深伪 | 生成能力如何变成攻击面 | 深伪综述；EU AI Act；C2PA | 深伪综述；EU AI Act；C2PA |
| 5 | 隐私 | 训练数据、记忆、推断攻击 | GDPR（2018）；成员推断（2016）；联邦学习 | https://eur-lex.europa.eu/eli/reg/2016/679/oj；https://arxiv.org/abs/1610.05820 |
| 6 | 版权 | 训练、生成、风格模仿的边界 | 美国版权局；EU AI Act；诉讼 | https://www.copyright.gov/ai/；EU AI Act |
| 7 | 治理 | 风险分级、备案、审计怎么做 | EU AI Act（2024）；NIST AI RMF（2023）；中国生成式 AI 管理办法（2023） | https://eur-lex.europa.eu/eli/reg/2024/1689/oj；https://www.nist.gov/itl/ai-risk-management-framework |
| 8 | 泡沫、末日论与现实 | 如何不被叙事带走 | AI Index 2026；AI 寒冬史；Science Museum | AI Index 2026；Science Museum AI 史 |

**玩法挂载**：第 1 章“对齐小剧场：目标错位”；第 2 章“注意力/特征可视化”；第 7 章“失窃页：EU AI Act 风险分级表”；第 4 章“失败博物馆：Tay / Deepfake 机器人电话”。

---

## 12. 《未编目》

| 章 | 标题 | 核心问题 | 关键人物·机构（年份） | 初版来源 |
|---|---|---|---|---|
| 1 | 世界模型 | 智能体能否在脑内预演世界 | Ha & Schmidhuber（2018）；Dreamer（2019） | https://arxiv.org/abs/1803.10122；https://arxiv.org/abs/1912.01603 |
| 2 | 推理与测试时计算 | 多想一会儿能不能更强 | CoT（2022）；测试时缩放（2024）；o1（2024） | https://arxiv.org/abs/2201.11903；https://arxiv.org/abs/2408.03314 |
| 3 | 合成数据 | 没有真实数据时，模型能否自己造教材 | Self-Instruct（2022）；Textbooks（2023）；模型崩溃（2023） | https://arxiv.org/abs/2212.10560；https://arxiv.org/abs/2306.11644；https://arxiv.org/abs/2305.17493 |
| 4 | 递归自我改进 | 机器能否改进自己，边界在哪 | Good（1965）；Gödel machine（2003） | Good《Speculations》；https://arxiv.org/abs/cs/0309048 |
| 5 | AGI 的定义与主张 | “通用”到底怎么定义、怎么测 | Levels of AGI（2023，DeepMind）；AI Index 2026 | https://arxiv.org/abs/2312.13771；AI Index 2026 |
| 6 | 意识与主观性 | 行为像人是否意味着有体验 | Chalmers（1995）；Butlin 等（2023） | https://consc.net/papers/facing.html；https://arxiv.org/abs/2308.08708 |
| 7 | 量子机器学习 | 量子能不能真的加速学习 | Biamonte 等（2017）；NISQ 局限 | https://arxiv.org/abs/1611.09347；https://doi.org/10.1038/nature23474 |
| 8 | 开放问题清单 | 还有哪些硬骨头没啃 | 组合性、因果、 grounding、评测、对齐 | AIMA 第 26–27 章；AI Index 2026 |

**玩法挂载**：第 1 章“世界模型小演示：预测下一帧”；第 5 章“AGI 定义卡牌”；第 8 章“未编目书架：封蜡书 / 缺页”。

---

## 13. 独立装置（不占 12 本）

| 装置 | 内容 | 数据/来源 |
|---|---|---|
| 学科地图 | AI 与计算机、数学、认知科学、语言学、生物医学、经济、哲学、法律的关系图 | 序卷第 8 章；AIMA；SEP |
| 时间轴 | 80 条事件，1943–2026 | 各章来源 |
| 轨道图 | 7 条线、约 50 站、9 个换乘 | 各章“关系”字段 |
| 星图 | 96 节点 + 概念关系 | 各章“关系”字段 |
| 失败博物馆 | 20 件（见下） | 逐条来源 |
| 模型尺寸墙 | 12 个公开参数量/算力 | 论文/技术报告 |
| 失窃页 | 8 处 | 各章“失窃页”标记 |
| 历史分岔 | 4 条 | 标注“推测” |
| 前沿书架 | 人工 12 条 + arXiv 每日 | arXiv API |

### 失败博物馆 20 件（候选）
1. Lighthill 报告与第一次寒冬（1973–80）
2. 感知机 XOR 批评（1969）
3. 日本第五代计算机（1982–92）
4. 专家系统泡沫与第二次寒冬（1987–93）
5. Cyc 的“常识”野心（1984–）
6. IBM Watson for Oncology（2013–2018）
7. Microsoft Tay（2016）
8. Amazon 招聘 AI 偏见（2018）
9. Uber ATG 事故（2018）
10. Zillow Offers（2021）
11. Meta Galactica（2022）
12. Sports Illustrated 假 AI 作者（2023）
13. Willy’s Chocolate Experience（2024）
14. Air Canada 聊天机器人（2024）
15. 麦当劳 AI 点餐（2024）
16. Deepfake 机器人电话（2024）
17. Cruise 无人出租车事件（2023）
18. Anthropic Project Vend（2025）
19. AI 生成“假论文”与撤稿潮（2023–2025）
20. 过度承诺的“通用 AI 助手”产品（2023–2026）

> 以上每条开写前都要找到可靠报道/官方说明；找不到就删，不硬凑。

### 模型尺寸墙 12 个（候选）
LeNet-5（~6 万）、AlexNet（6,000 万）、ResNet-50（2,560 万）、BERT-large（3.4 亿）、GPT-2（12.4 亿）、GPT-3（1,750 亿）、PaLM（5,400 亿）、Llama 2 70B、Mixtral 8×7B、DeepSeek-V3（671B 总/37B 激活）、Qwen2.5 72B、Llama 3 70B。
> 参数量以论文/技术报告为准；GPT-4 未公开，不放进墙。

### 失窃页 8 处（候选）
1. 达特茅斯提案原件（序卷 3）
2. Mark I Perceptron 接线图（神经 2）
3. 第一次寒冬的 DARPA 削减备忘录（符号 5）
4. Transformer 原始注意力图（注意力 3）
5. AlphaGo 第 37 手棋谱（行动 5）
6. CASP14 结果页（生命 5）
7. EU AI Act 风险分级表（边界 7）
8. AGI 定义页（未编目 5）

### 历史分岔 4 条
1. 假如符号主义赢了（没有连接主义复兴）
2. 假如没有 ImageNet（深度学习晚十年）
3. 假如 2016 AlphaGo 输了
4. 假如 2022 没有 ChatGPT

> 全部标“推测”，每条先给真实事实，再给分岔推演，不冒充历史。

---

## 14. 需要你确认

1. 12 本书的切分和 96 章标题是否同意？想换哪几章？
2. 失败博物馆 20 件里有没有你觉得不合适/太敏感的？（事故类可换成纯技术失败）
3. 模型尺寸墙的 12 个模型要不要换成你更关心的（比如只放开源模型）？
4. 失窃页 8 处、历史分岔 4 条是否保留？

确认后我按这个目录写 12 个样章（每本 1 章），你审完再批量。
