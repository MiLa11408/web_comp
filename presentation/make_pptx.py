# -*- coding: utf-8 -*-
"""
机忆书库 · 答辩 PPT 生成脚本
产出：动态组-队伍名-队长名-学号-演示.pptx（16 页 + 演示视频页）
可重复运行；替换视频时只需改 VIDEO_PATH 后重跑。
"""
import os
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.oxml.ns import qn

# ---------------- 常量 ----------------
OUT_PATH = r"e:\MiLa_Puzzle\Explore\ai-library\presentation\动态组-塔之诅咒队-盛梓杨-2421010219-演示.pptx"
VIDEO_PATH = r"e:\MiLa_Puzzle\Explore\deliverables\动态组-塔之诅咒队-盛梓杨-2421010219-演示视频.mp4"

BG      = RGBColor(0x14, 0x10, 0x0D)   # 深墨棕
BG_DEEP = RGBColor(0x0D, 0x0A, 0x07)   # 深黑
PANEL   = RGBColor(0x1D, 0x17, 0x12)
PANEL2  = RGBColor(0x24, 0x1C, 0x14)
INK     = RGBColor(0xE6, 0xD9, 0xBD)   # 旧纸米白
DIM     = RGBColor(0x9A, 0x8A, 0x6F)
FAINT   = RGBColor(0x7D, 0x6E, 0x55)
GOLD    = RGBColor(0xC8, 0xA2, 0x4A)   # 烫金
GOLD2   = RGBColor(0xE2, 0xC1, 0x7C)
GOLD3   = RGBColor(0x8A, 0x63, 0x20)
LINE    = RGBColor(0x3A, 0x2F, 0x22)
LINE2   = RGBColor(0x5A, 0x45, 0x26)
RUST    = RGBColor(0x9C, 0x1F, 0x1F)   # 暗红章色
CODEBG  = RGBColor(0x0F, 0x0B, 0x08)
CODEFG  = RGBColor(0xCD, 0xBF, 0x9A)

SERIF = "SimSun"                 # 宋体
SANS  = "Microsoft YaHei"        # 微软雅黑
MONO  = "Consolas"

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)

LX = Inches(0.9)   # 左页边距
RW = Inches(0.9)   # 右页边距
CW = Inches(13.333 - 1.8)  # 内容宽 11.533"

TEAM_LINE = "动态组 · 塔之诅咒队 · 盛梓杨 · 2421010219"
URL_ONLINE = "https://150.158.1.111/ai/"

# ---------------- 基础工具 ----------------
def R(text, size=None, color=None, font=None, bold=None, italic=None):
    return dict(text=text, size=size, color=color, font=font, bold=bold, italic=italic)

def _apply_font(run, d):
    f = run.font
    name = d.get("font") or SANS
    f.name = name
    if d.get("size"):
        f.size = Pt(d["size"])
    if d.get("color") is not None:
        f.color.rgb = d["color"]
    if d.get("bold") is not None:
        f.bold = d["bold"]
    if d.get("italic") is not None:
        f.italic = d["italic"]
    rPr = run._r.get_or_add_rPr()
    ea = rPr.find(qn('a:ea'))
    if ea is None:
        ea = rPr.makeelement(qn('a:ea'), {})
        rPr.append(ea)
    ea.set('typeface', name)

def textbox(slide, x, y, w, h, paras, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP,
            wrap=True, line_spacing=None, space_after=None):
    box = slide.shapes.add_textbox(x, y, w, h)
    tf = box.text_frame
    tf.word_wrap = wrap
    tf.vertical_anchor = anchor
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    for i, runs in enumerate(paras):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        if line_spacing:
            p.line_spacing = line_spacing
        if space_after:
            p.space_after = Pt(space_after)
        for d in runs:
            r = p.add_run()
            r.text = d.get("text", "")
            _apply_font(r, d)
    return box

def set_bg(slide, color=BG):
    slide.background.fill.solid()
    slide.background.fill.fore_color.rgb = color

def rect(slide, x, y, w, h, fill=None, line_color=None, line_w=0.75,
         shape=MSO_SHAPE.RECTANGLE):
    sp = slide.shapes.add_shape(shape, x, y, w, h)
    if fill is None:
        sp.fill.background()
    else:
        sp.fill.solid()
        sp.fill.fore_color.rgb = fill
    if line_color is None:
        sp.line.fill.background()
    else:
        sp.line.color.rgb = line_color
        sp.line.width = Pt(line_w)
    sp.shadow.inherit = False
    return sp

def hline(slide, x1, y1, x2, y2, color=LINE2, w=0.75):
    ln = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, x1, y1, x2, y2)
    ln.line.color.rgb = color
    ln.line.width = Pt(w)
    ln.shadow.inherit = False
    return ln

def _corner(slide, x, y, dx, dy, color, w):
    hline(slide, x, y, x + dx, y, color, w)
    hline(slide, x, y, x, y + dy, color, w)

def decorate(slide, num_str):
    """细金线框 + 四角压花 + 超大页码水印"""
    x0 = Inches(0.24); y0 = Inches(0.20)
    x1 = Inches(13.333 - 0.24); y1 = Inches(7.30)
    # 双层线框
    rect(slide, x0, y0, x1 - x0, y1 - y0, fill=None, line_color=GOLD, line_w=0.5)
    rect(slide, Inches(0.30), Inches(0.26), Inches(13.333 - 0.60), Inches(7.04),
         fill=None, line_color=RGBColor(0x3A, 0x2F, 0x22), line_w=0.5)
    arm = Inches(0.30)
    w = 1.4
    _corner(slide, x0, y0, arm, arm, GOLD, w)                    # tl
    _corner(slide, x1, y0, -arm, arm, GOLD, w)                   # tr
    _corner(slide, x0, y1, arm, -arm, GOLD, w)                   # bl
    _corner(slide, x1, y1, -arm, -arm, GOLD, w)                  # br
    # 页码水印
    textbox(slide, Inches(9.6), Inches(0.30), Inches(3.5), Inches(1.9),
            [[R(num_str, size=110, color=RGBColor(0x4A, 0x3A, 0x28), font=SERIF, bold=True)]],
            align=PP_ALIGN.RIGHT, anchor=MSO_ANCHOR.TOP)

def header(slide, kick, en, num_str):
    tb = textbox(slide, LX, Inches(0.46), Inches(7.0), Inches(0.4),
                 [[R(kick, size=14, color=GOLD, font=SANS),
                   R("   " + en, size=10, color=DIM, font=SANS)]])
    textbox(slide, Inches(8.43), Inches(0.46), Inches(4.0), Inches(0.4),
            [[R(num_str, size=13, color=FAINT, font=MONO)]], align=PP_ALIGN.RIGHT)
    hline(slide, LX, Inches(1.16), Inches(13.333 - 0.9), Inches(1.16), LINE2, 1.0)
    return tb

def title_block(slide, title, sub=None, y=1.32):
    paras = [[R(title, size=29, color=INK, font=SERIF, bold=True)]]
    if sub:
        paras.append([R(sub, size=11, color=DIM, font=SANS)])
    textbox(slide, LX, Inches(y), CW, Inches(0.9), paras, space_after=4)

def bullets(slide, x, y, w, items, size=14, gap=10):
    """items: list of paras; each para = list of runs; 自动加金色菱形标记"""
    paras = []
    for runs in items:
        paras.append([R("\u25C6 ", size=size, color=GOLD, font=SANS)] + runs)
    textbox(slide, x, y, w, Inches(0.5 * len(items)), paras,
            line_spacing=1.25, space_after=gap)

def notes(slide, full_note, cue):
    """底部备注区（完整备注）+ notes_slide + 右下角 9pt 提词"""
    # 底部备注区
    textbox(slide, LX, Inches(6.82), Inches(11.5), Inches(0.55),
            [[R("提词 · NOTES   ", size=10, color=GOLD3, font=SANS),
              R(full_note, size=10.5, color=FAINT, font=SANS)]], line_spacing=1.15)
    hline(slide, LX, Inches(6.78), Inches(13.333 - 0.9), Inches(6.78), LINE2, 0.75)
    # 演讲者备注
    slide.notes_slide.notes_text_frame.text = full_note

def card(slide, x, y, w, h, kick, big=None, body=None, note=None, data_no=None):
    """暗色卡片：kick 小字 / big 大字 / body 正文 / note 注释 / 角落字母"""
    rect(slide, x, y, w, h, fill=PANEL2, line_color=LINE, line_w=0.75)
    paras = [[R(kick, size=10, color=GOLD3, font=SANS)]]
    if big:
        paras.append([R(big, size=30, color=GOLD2, font=SERIF, bold=True)])
    if body:
        paras.append([R(body, size=11.5, color=DIM, font=SANS)])
    if note:
        paras.append([R(note, size=9.5, color=FAINT, font=SANS)])
    textbox(slide, x + Inches(0.18), y + Inches(0.14), w - Inches(0.36), h - Inches(0.28),
            paras, line_spacing=1.2, space_after=5)
    if data_no:
        textbox(slide, x + w - Inches(0.6), y + h - Inches(0.62), Inches(0.55), Inches(0.5),
                [[R(data_no, size=34, color=RGBColor(0x3A, 0x2F, 0x22), font=SERIF, bold=True)]],
                align=PP_ALIGN.RIGHT)

def rows(slide, x, y, w, items, label_w=Inches(1.65), size=13.5, row_h=0.52):
    """两列键值行（左标签 dim，右内容可含加粗）"""
    cur = y.inches if hasattr(y, 'inches') else float(y)
    for label, value_runs in items:
        textbox(slide, x, Inches(cur), label_w, Inches(row_h),
                [[R(label, size=size, color=DIM, font=SANS)]])
        textbox(slide, x + label_w, Inches(cur), w - label_w, Inches(row_h),
                [value_runs], line_spacing=1.15)
        hline(slide, x, Inches(cur + row_h - 0.06), x + w, Inches(cur + row_h - 0.06), LINE, 0.5)
        cur += row_h
    return cur

def steps(slide, x, y, w, items, num_size=34, size=14.5):
    """编号步骤：两位序号 + 主文 + 每项可带子说明"""
    cur = y.inches if hasattr(y, 'inches') else float(y)
    for i, (light, sub) in enumerate(items):
        textbox(slide, x, Inches(cur), Inches(0.85), Inches(0.7),
                [[R("%02d" % (i + 1), size=num_size, color=GOLD3, font=SERIF, bold=True)]])
        paras = [light]
        if sub:
            paras.append([R(sub, size=11.5, color=DIM, font=SANS)])
        textbox(slide, x + Inches(0.85), Inches(cur), w - Inches(0.85), Inches(0.9),
                paras, line_spacing=1.2, space_after=3)
        cur += 0.82
    return cur

def code_block(slide, x, y, w, h, lines):
    rect(slide, x, y, w, h, fill=CODEBG, line_color=LINE2, line_w=0.5)
    paras = []
    for ln in lines:
        paras.append([R(ln, size=13, color=CODEFG, font=MONO)])
    textbox(slide, x + Inches(0.24), y + Inches(0.16), w - Inches(0.48), h - Inches(0.32),
            paras, line_spacing=1.35)

def add_video(slide, path, left, top, width, height):
    """封装视频插入；替换视频只需换 path 重跑脚本"""
    return slide.shapes.add_movie(path, left, top, width, height, mime_type="video/mp4")

# ---------------- 备注（完整） ----------------
NOTES = [
    "开场一句即可，不用读整页。",
    "直接引出三个关键词：空间、线路、残缺——这是后文全部展开的骨架。",
    "评委最关心「内容是不是抄来的」——直接答：每章 3 条以上实开核验来源 + 全文自校验。",
    "一句话总结——楼层回答「信不信」，书轨回答「按什么顺序读」，星图回答「谁和谁有关系」。",
    "现场可以演示搜「神经网络」——命中优先落在神经书系，而不是散在全文里。",
    "强调「缺失成为玩法」——残页和失窃页让读者注意到史料是怎么丢的。",
    "三步打开暗门的过程本身就是一个悬念镜头，适合放视频中段。",
    "答辩时可现场点开一个演示；视频录制直接跑导览即可。",
    "评委问到「技术选型为什么」——答：无构建步骤 = 任何一台 Node ≥ 22.5 的机器三条命令跑起来。",
    "技术难点举例——3D/2D 楼层状态双向同步、物理书与手持状态分离、软件渲染下 E2E 稳定。",
    "这一页专给路过的专业开发者评委准备。",
    "如果有安全评委，重点讲密钥工程化与限流。",
    "一句话——网站不只是展示，它记录每一次阅读。",
    "压缩包里的运行说明以这页为准。",
    "视频前 3 分钟跑导览，后 1 分钟给暗门与检索特写。",
    "Q&A 提示：和普通百科的区别 / 内容准确性 / 性能低配 / 为什么做残页。",
]

def cue_of(note):
    return note if len(note) <= 60 else note[:60]

# ---------------- 各页 ----------------
def build_cover(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide, BG_DEEP)
    decorate(slide, "")
    textbox(slide, Inches(0.9), Inches(1.35), CW, Inches(0.4),
            [[R("网页设计大赛 · 参赛作品", size=13, color=GOLD3, font=SANS)]],
            align=PP_ALIGN.CENTER)
    textbox(slide, Inches(0.9), Inches(1.85), CW, Inches(1.35),
            [[R("机忆书库", size=72, color=INK, font=SERIF, bold=True)]],
            align=PP_ALIGN.CENTER)
    textbox(slide, Inches(0.9), Inches(3.15), CW, Inches(0.5),
            [[R("T H E   M A C H I N E   M E M O R Y", size=17, color=GOLD, font=SANS)]],
            align=PP_ALIGN.CENTER)
    textbox(slide, Inches(0.9), Inches(3.85), CW, Inches(0.5),
            [[R("一座可以走进去的 AI 知识档案馆", size=20, color=DIM, font=SERIF)]],
            align=PP_ALIGN.CENTER)
    # 队名占位
    rect(slide, Inches(3.87), Inches(5.0), Inches(5.6), Inches(0.52),
         fill=PANEL, line_color=GOLD3, line_w=0.75)
    textbox(slide, Inches(3.87), Inches(5.08), Inches(5.6), Inches(0.4),
            [[R(TEAM_LINE, size=15, color=GOLD2, font=SANS)]], align=PP_ALIGN.CENTER)
    textbox(slide, Inches(0.9), Inches(5.85), CW, Inches(0.4),
            [[R("线上地址　" + URL_ONLINE, size=13, color=DIM, font=MONO)]],
            align=PP_ALIGN.CENTER)
    notes(slide, NOTES[0], cue_of(NOTES[0]))

def build_positioning(prs, n):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide)
    decorate(slide, "02")
    header(slide, "定位", "POSITIONING", "02 / 16")
    title_block(slide, "一句话定位", "One Sentence · Positioning")
    textbox(slide, LX, Inches(2.05), CW, Inches(1.15),
            [[R("这不是一个 AI 百科，而是一座", size=20, color=INK, font=SERIF),
              R("可以走进去", size=20, color=GOLD2, font=SERIF, bold=True),
              R("的 AI 档案馆：用", size=20, color=INK, font=SERIF),
              R("空间、线路与残缺页", size=20, color=GOLD2, font=SERIF, bold=True),
              R("，把 90 年的人工智能史组织成可探索的路径。", size=20, color=INK, font=SERIF)]],
            line_spacing=1.5)
    # 三关键词
    trio = [
        ("空间", "书 = 知识，电梯 = 分级，把晦涩的 AI 史变成一栋楼。"),
        ("线路", "书轨 = 主题路线，星图 = 概念关系，按顺序读、按关系读。"),
        ("残缺", "残页、失窃页、暗门——让「缺失」本身成为玩法。"),
    ]
    x = LX
    w = Inches(3.6)
    for k, v in trio:
        hline(slide, x, Inches(3.55), x + w, Inches(3.55), GOLD, 1.0)
        textbox(slide, x, Inches(3.7), w, Inches(1.6),
                [[R(k, size=22, color=GOLD2, font=SERIF, bold=True)],
                 [R(v, size=11.5, color=DIM, font=SANS)]], line_spacing=1.35, space_after=6)
        x += w + Inches(0.37)
    textbox(slide, LX, Inches(5.75), CW, Inches(0.4),
            [[R("所有史实有来源，所有推测有标注。", size=14, color=FAINT, font=SANS)]])
    notes(slide, NOTES[1], cue_of(NOTES[1]))

def build_content_48(prs, n):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide)
    decorate(slide, "03")
    header(slide, "内容", "CONTENT", "03 / 16")
    title_block(slide, "内容深度 · 48 本书 × 384 章")
    textbox(slide, LX, Inches(1.95), CW, Inches(1.1),
            [[R("48", size=64, color=GOLD2, font=SERIF, bold=True),
              R(" × ", size=40, color=GOLD3, font=SERIF),
              R("8", size=64, color=GOLD2, font=SERIF, bold=True),
              R("  = 384 章 · 约 80 万字", size=17, color=DIM, font=SANS)]])
    items = [
        ("书目", [R("48", size=13.5, color=GOLD2, font=SERIF, bold=True),
                  R(" 本 × 8 章 = 384 章，约 80 万字", size=13.5, color=INK, font=SANS)]),
        ("时间跨度", [R("1936 图灵机 → 2026 前沿（每日更新 arXiv）", size=13.5, color=INK, font=SANS)]),
        ("每章骨架", [R("9 段固定骨架：时间人物 → 机制 → 影响 → 争议 → 关系 → 来源", size=13.5, color=INK, font=SANS)]),
        ("来源", [R("每章 ≥3 条", size=13.5, color=GOLD2, font=SANS, bold=True),
                  R("实开核验来源，checked: true", size=13.5, color=INK, font=SANS)]),
        ("大白话", [R("每章 ≥2 处机制白话讲解 + 馆员页边注", size=13.5, color=INK, font=SANS)]),
    ]
    rows(slide, LX, Inches(3.15), CW, items, row_h=0.46)
    textbox(slide, LX, Inches(5.55), CW, Inches(0.75),
            [[R("覆盖 ·  ", size=11, color=GOLD3, font=SANS),
              R("符号主义 · 神经网络 · GPT 世系 · DeepSeek 与中国 AI · 具身智能 · AI 安全 · 算力芯片 · 法律伦理 · 气候教育", size=11.5, color=DIM, font=SANS)],
             [R("三大模型家族功绩全部落位：", size=11.5, color=DIM, font=SANS),
              R("GPT / Claude / DeepSeek", size=11.5, color=GOLD2, font=SANS, bold=True)]],
            line_spacing=1.3)
    notes(slide, NOTES[2], cue_of(NOTES[2]))

def build_structure(prs, n):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide)
    decorate(slide, "04")
    header(slide, "结构", "STRUCTURE", "04 / 16")
    title_block(slide, "知识不是一堵墙，是有结构的", "Structure, not a wall")
    cards = [
        ("楼层 · LEVEL", "知识分级", "L1 公开 → L2 内部 → L3 机密 → L4 绝密", "越往上越残破、越接近争议。", "L"),
        ("书轨 · ROUTE", "主题线路", "5 条主线 + 7 条支线 + 55 站", "同一本书跨线出现 = 换乘站。", "R"),
        ("星图 · GRAPH", "概念关系", "48 个节点 · 30 条关系弧线", "节点分布在四层球壳。", "G"),
        ("时间 · TIME", "年代与尺度", "384 张年代卡 · 12 项标尺 · 20 件失败案例", "时间轴 / 模型尺寸墙 / 失败博物馆。", "T"),
    ]
    x = LX
    w = Inches(2.72)
    for kick, t, body, note, dn in cards:
        textbox(slide, x, Inches(2.05), w, Inches(1.7),
                [[R(kick, size=9.5, color=GOLD3, font=SANS)],
                 [R(t, size=17, color=GOLD2, font=SERIF, bold=True)],
                 [R(body, size=11, color=INK, font=SANS)],
                 [R(note, size=9, color=FAINT, font=SANS)]], line_spacing=1.25, space_after=5)
        rect(slide, x, Inches(1.95), w, Inches(1.95), fill=None, line_color=LINE, line_w=0.75)
        textbox(slide, x + w - Inches(0.5), Inches(3.45), Inches(0.45), Inches(0.4),
                [[R(dn, size=26, color=RGBColor(0x3A, 0x2F, 0x22), font=SERIF, bold=True)]],
                align=PP_ALIGN.RIGHT)
        x += w + Inches(0.22)
    textbox(slide, LX, Inches(4.6), CW, Inches(0.5),
            [[R("一句话 · IN SHORT", size=11, color=GOLD3, font=SANS)]])
    textbox(slide, LX, Inches(5.05), CW, Inches(0.7),
            [[R("楼层回答「", size=15, color=DIM, font=SANS),
              R("信不信", size=15, color=GOLD2, font=SANS, bold=True),
              R("」，书轨回答「", size=15, color=DIM, font=SANS),
              R("按什么顺序读", size=15, color=GOLD2, font=SANS, bold=True),
              R("」，星图回答「", size=15, color=DIM, font=SANS),
              R("谁和谁有关系", size=15, color=GOLD2, font=SANS, bold=True),
              R("」。", size=15, color=DIM, font=SANS)]])
    notes(slide, NOTES[3], cue_of(NOTES[3]))

def build_search(prs, n):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide)
    decorate(slide, "05")
    header(slide, "查找", "SEARCH", "05 / 16")
    title_block(slide, "查找：为「查得到」设计的检索", "Four-level ranking")
    textbox(slide, LX, Inches(1.95), CW, Inches(0.4),
            [[R("四级排序，一条查询同时锁定四个层面。", size=16, color=INK, font=SERIF)]])
    srch = [
        ([R("大标题", size=15, color=GOLD2, font=SANS, bold=True),
          R("（权重最高）", size=12, color=DIM, font=SANS)], None),
        ([R("标签 tag", size=15, color=GOLD2, font=SANS, bold=True)], None),
        ([R("正文提及次数", size=15, color=GOLD2, font=SANS, bold=True)], None),
        ([R("相关内容", size=15, color=GOLD2, font=SANS, bold=True)], None),
    ]
    steps(slide, LX, Inches(2.45), CW, srch, num_size=30, size=15)
    textbox(slide, LX, Inches(5.15), CW, Inches(0.4),
            [[R("体验 · UX", size=11, color=GOLD3, font=SANS)]])
    bullets(slide, LX, Inches(5.55), CW, [
        [R("输入补全：书名 / 章节 / 人物 / 标签，", size=13.5, color=INK),
         R("边输边出", size=13.5, color=GOLD2, bold=True)],
        [R("命中词在正文中", size=13.5, color=INK),
         R("高亮", size=13.5, color=GOLD2, bold=True), R("，检索侧栏可跳转", size=13.5, color=INK)],
        [R("书架总览一键列出全部 48 本书、索书号、年份与进度", size=13.5, color=INK)],
    ], size=13.5, gap=8)
    notes(slide, NOTES[4], cue_of(NOTES[4]))

def build_play(prs, n):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide)
    decorate(slide, "06")
    header(slide, "趣味", "PLAY", "06 / 16")
    title_block(slide, "把档案做成可玩的馆藏", "Playable collection")
    items = [
        ("残页", [R("12", size=14, color=GOLD2, font=SERIF, bold=True),
                  R(" 张 if 线残页，藏在章节与 3D 展厅，掉落/拾取，可拼合成一条故事线", size=12.5, color=INK, font=SANS)]),
        ("失窃页", [R("9", size=14, color=GOLD2, font=SERIF, bold=True),
                    R(" 件，锁在 3D 展柜里，读到章末才能追回", size=12.5, color=INK, font=SANS)]),
        ("躁动书页", [R("12", size=14, color=GOLD2, font=SERIF, bold=True),
                      R(" 件，先「收容」再「归位」到正确章节", size=12.5, color=INK, font=SANS)]),
        ("隐藏书", [R("读够 12 章才显形的《未编目 · 第七码》", size=12.5, color=INK, font=SANS)]),
        ("徽章", [R("10", size=14, color=GOLD2, font=SERIF, bold=True),
                  R(" 枚借阅徽章 + 「我翻过的书」聚合", size=12.5, color=INK, font=SANS)]),
        ("盖章 / 读完", [R("红章落纸动画、二次确认、可撤销", size=12.5, color=INK, font=SANS)]),
    ]
    rows(slide, LX, Inches(2.0), CW, items, label_w=Inches(1.35), row_h=0.55)
    notes(slide, NOTES[5], cue_of(NOTES[5]))

def build_hidden_door(prs, n):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide)
    decorate(slide, "07")
    header(slide, "趣味 · 暗门", "THE HIDDEN DOOR", "07 / 16")
    title_block(slide, "L4 的暗门", "录制视频的亮点镜头")
    st = [
        ([R("L4 蜡封桌上多一张盖着", size=14.5, color=INK),
          R("红 X 的备忘", size=14.5, color=GOLD2, bold=True)],
         "「第十柜未编目 / 右墙帷幕后 / 十道脊 = 钥匙」"),
        ([R("右墙帷幕没有拉直，点它滑开 → 露出", size=14.5, color=INK),
          R("不在平面图上的铁门", size=14.5, color=GOLD2, bold=True)], None),
        ([R("门后是", size=14.5, color=INK),
          R("十本「假如之书」", size=14.5, color=GOLD2, bold=True),
          R("（1956 达特茅斯 → 2024 开源）", size=12, color=DIM)],
         "选一条科技树：符号树 / 神经树 / 具身树 · 点「走假如」→ 生成 12 段约 1400 字科幻推测，换树内容不同"),
        ([R("书架尽头还有", size=14.5, color=INK),
          R("第十一本「未写之书」", size=14.5, color=GOLD2, bold=True)],
         "只接受「如果没有 X 会怎么样」，调 DeepSeek V3.2 生成小故事，不合格式直接拒绝"),
    ]
    steps(slide, LX, Inches(2.0), CW, st, num_size=30, size=14.5)
    notes(slide, NOTES[6], cue_of(NOTES[6]))

def build_demo(prs, n):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide)
    decorate(slide, "08")
    header(slide, "趣味 · 演示", "DEMO & GUIDE", "08 / 16")
    title_block(slide, "可玩演示与馆长导览", "Interactive demos & auto tour")
    card(slide, LX, Inches(2.0), Inches(5.5), Inches(1.7),
         "06 个可玩演示", big="6 个", body="图灵测试 · 中文屋 · 注意力示意 · 规则系统 · 扩散去噪 · 缩放定律",
         note="参数可拖拽，现场即可演示。")
    card(slide, Inches(6.93), Inches(2.0), Inches(4.6), Inches(1.7),
         "馆长导览 · 自动版", big="8 站", body="8 站自动巡游约 3 分钟", note="进度条 + 暂停继续，无需操作。")
    bullets(slide, LX, Inches(4.0), CW, [
        [R("接待卡、四层馆员个性欢迎语、WebAudio 环境音", size=13.5, color=INK)],
        [R("分区域新手提示卡：第一次到哪，才在哪出现，", size=13.5, color=INK),
         R("不打断探索", size=13.5, color=GOLD2, bold=True)],
    ], size=13.5, gap=8)
    notes(slide, NOTES[7], cue_of(NOTES[7]))

def build_stack(prs, n):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide)
    decorate(slide, "09")
    header(slide, "技术", "STACK", "09 / 16")
    title_block(slide, "无构建 · 可审计 · 轻依赖", "No build step · Auditable · Lightweight")
    items = [
        ("前端", [R("原生 HTML/JS + three.js（本地 vendor）+ Rapier 物理 + WebAudio", size=13.5, color=INK, font=SANS)]),
        ("后端", [R("Fastify 5 + Node 内置 ", size=13.5, color=INK, font=SANS),
                  R("node:sqlite", size=13.5, color=GOLD2, font=SANS, bold=True),
                  R("（零数据库服务）", size=13.5, color=INK, font=SANS)]),
        ("内容", [R("Markdown + YAML frontmatter + JSON（", size=13.5, color=INK, font=SANS),
                  R("内容与代码分离", size=13.5, color=GOLD2, font=SANS, bold=True),
                  R("）", size=13.5, color=INK, font=SANS)]),
        ("部署", [R("systemd + nginx 子路径 /ai/，npm ci --omit=dev 即上线", size=13.5, color=INK, font=SANS)]),
        ("运维", [R("arXiv 每日 04:17 自动入库 · 每日 03:40 自动备份（保留 14 天）", size=13.5, color=INK, font=SANS)]),
    ]
    rows(slide, LX, Inches(2.15), CW, items, label_w=Inches(1.2), row_h=0.68)
    notes(slide, NOTES[8], cue_of(NOTES[8]))

def build_3d(prs, n):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide)
    decorate(slide, "10")
    header(slide, "技术亮点 ①", "3D READING ROOM", "10 / 16")
    title_block(slide, "3D 阅览室", "First-person immersive reading")
    bullets(slide, LX, Inches(2.1), CW, [
        [R("第一人称 ", size=15, color=INK),
         R("WASD + 拖拽视角", size=15, color=GOLD2, bold=True),
         R("；点击书脊抽到手里 → E 翻开 → Q 叠到长桌（", size=15, color=INK),
         R("Rapier 真物理", size=15, color=GOLD2, bold=True), R("）", size=15, color=INK)],
        [R("精细建模：拱形高窗、藻井与梁底藏光、护墙板、滑梯、吊灯水晶坠", size=15, color=INK)],
        [R("黄铜电梯", size=15, color=INK),
         R("入舱转场", size=15, color=GOLD2, bold=True),
         R("（门开 → 走入 → 黑场切层 → 到站），楼层切换同步 3D / 2D 视图", size=15, color=INK)],
        [R("低配自动降 DPR、关阴影、减粒子；2D 页面暂停 3D 渲染省电；手机虚拟摇杆", size=15, color=INK)],
    ], size=15, gap=14)
    notes(slide, NOTES[9], cue_of(NOTES[9]))

def build_quality(prs, n):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide)
    decorate(slide, "11")
    header(slide, "技术亮点 ②", "QUALITY", "11 / 16")
    title_block(slide, "工程质量", "Engineered for auditors")
    card(slide, LX, Inches(2.0), Inches(5.5), Inches(1.9),
         "内容校验 · npm run verify", big="0 FAIL · 0 WARN",
         body="384 章全自动校验：字数、来源、双向关系、索书号唯一性")
    card(slide, Inches(6.93), Inches(2.0), Inches(4.6), Inches(1.9),
         "端到端 · npm run test:e2e", big="144 项全绿",
         body="Playwright + 系统 Chrome：入馆、取书、检索、电梯、书轨、星图、暗门、未写之书、盖章撤销、移动端")
    bullets(slide, LX, Inches(4.25), CW, [
        [R("四身份走查打磨：目标用户 / 评委 / 路过开发者 / 路人", size=14, color=INK)],
        [R("提交记录与档案 skill 全程留痕", size=14, color=INK)],
    ], size=14, gap=8)
    notes(slide, NOTES[10], cue_of(NOTES[10]))

def build_security(prs, n):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide)
    decorate(slide, "12")
    header(slide, "安全", "SECURITY", "12 / 16")
    title_block(slide, "安全性", "Defense in depth")
    items = [
        ("认证", [R("密码 ", size=13, color=INK),
                  R("scrypt 慢哈希", size=13, color=GOLD2, bold=True),
                  R(" + 随机盐；会话 token 签名鉴权", size=13, color=INK)]),
        ("注入", [R("全部 SQL 走参数化查询；注册/登录/IP 级", size=13, color=INK),
                  R("限流", size=13, color=GOLD2, bold=True)]),
        ("未写之书 API", [R("输入格式白名单校验 + 8 次/10 分钟限流 + 最大 token 限制", size=13, color=INK)]),
        ("密钥", [R("放服务器 .env（权限 600），", size=13, color=INK),
                  R("不进仓库、不进压缩包", size=13, color=GOLD2, bold=True),
                  R("，只提供 .env.example", size=13, color=INK)]),
        ("权限", [R("访客", size=13, color=INK),
                  R("只读", size=13, color=GOLD2, bold=True),
                  R("全部内容；盖章/批注/进度才需借书证", size=13, color=INK)]),
        ("部署", [R("自签 https + http 双入口，CSP 收紧与最小权限", size=13, color=INK)]),
    ]
    rows(slide, LX, Inches(2.0), CW, items, label_w=Inches(1.5), row_h=0.58)
    notes(slide, NOTES[11], cue_of(NOTES[11]))

def build_data(prs, n):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide)
    decorate(slide, "13")
    header(slide, "数据", "DATA & LOG", "13 / 16")
    title_block(slide, "数据与统计（后端记录）", "The site remembers every read")
    bullets(slide, LX, Inches(2.35), CW, [
        [R("每个人翻阅了", size=16, color=INK),
         R("什么书多少次", size=16, color=GOLD2, bold=True)],
        [R("什么书被多少人翻阅（", size=16, color=INK),
         R("全馆 TOP 榜", size=16, color=GOLD2, bold=True), R("）", size=16, color=INK)],
        [R("残页收集程度、印章、批注、进度、徽章", size=16, color=INK)],
        [R("「借阅档案 · 今日可做」把隐藏玩法摊成", size=16, color=INK),
         R("可照着做的清单", size=16, color=GOLD2, bold=True)],
    ], size=16, gap=16)
    notes(slide, NOTES[12], cue_of(NOTES[12]))

def build_run(prs, n):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide)
    decorate(slide, "14")
    header(slide, "运行", "RUN IT", "14 / 16")
    title_block(slide, "运行方式（评委可直接照做）")
    code_block(slide, LX, Inches(2.0), Inches(7.6), Inches(1.35),
               ["npm install      # 只需 fastify/yaml/three/rapier（playwright-core 仅测试用）",
                "npm start        # http://127.0.0.1:3300"])
    textbox(slide, LX, Inches(3.55), CW, Inches(0.4),
            [[R("线上演示　", size=14, color=DIM, font=SANS),
              R(URL_ONLINE, size=14, color=GOLD2, font=MONO)]])
    textbox(slide, LX, Inches(4.1), CW, Inches(0.4),
            [[R("自检（可选）· OPTIONAL CHECKS", size=11, color=GOLD3, font=SANS)]])
    code_block(slide, LX, Inches(4.5), Inches(7.6), Inches(1.35),
               ["npm run verify     # 内容校验",
                "npm run test:e2e   # 端到端测试（需本机 Chrome/Edge）"])
    textbox(slide, LX, Inches(6.05), CW, Inches(0.4),
            [[R("详细步骤与排错见 README.md 与 docs/DEPLOY.md", size=12, color=FAINT, font=SANS)]])
    notes(slide, NOTES[13], cue_of(NOTES[13]))

def build_tour(prs, n):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide)
    decorate(slide, "15")
    header(slide, "路线", "30-SECOND TOUR", "15 / 16")
    title_block(slide, "演示路线（30 秒版）", "The 30-second walkthrough")
    def flow(y, nodes, hl_pos=()):
        y = y.inches if hasattr(y, 'inches') else float(y)
        x = LX
        for i, (txt, hl) in enumerate(nodes):
            w = Inches(1.9)
            if i in hl_pos:
                rect(slide, x, Inches(y), w, Inches(0.62), fill=RGBColor(0x2A, 0x21, 0x14),
                     line_color=GOLD2, line_w=0.75)
                c = GOLD2
            else:
                rect(slide, x, Inches(y), w, Inches(0.62), fill=PANEL, line_color=GOLD, line_w=0.75)
                c = INK
            textbox(slide, x, Inches(y + 0.1), w, Inches(0.42),
                    [[R(txt, size=11.5, color=c, font=SANS)]], align=PP_ALIGN.CENTER)
            if i < len(nodes) - 1:
                textbox(slide, x + w, Inches(y + 0.06), Inches(0.5), Inches(0.5),
                        [[R("→", size=16, color=GOLD3, font=SERIF)]], align=PP_ALIGN.CENTER)
            x += w + Inches(0.5)
    flow(Inches(2.2), [("门厅入馆", 0), ("3D 书架抽书翻开", 0), ("馆长导览 8 站", 1)], hl_pos=(2,))
    flow(Inches(3.1), [("↳ L4 暗门三连", 1), ("假如之书 · 走科技树", 0), ("未写之书 · 问假设", 0)], hl_pos=(0,))
    textbox(slide, LX, Inches(4.4), CW, Inches(0.4),
            [[R("暗门三连 · MEMO → CURTAIN → DOOR", size=11, color=GOLD3, font=SANS)]])
    bullets(slide, LX, Inches(4.85), CW, [
        [R("备忘（盖红 X）→ 帷幕滑开 → 铁门现身", size=14, color=INK)],
        [R("假如之书选树走线 · 未写之书只接受假设性问题", size=14, color=INK)],
    ], size=14, gap=8)
    notes(slide, NOTES[14], cue_of(NOTES[14]))

def build_end(prs, n):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide, BG_DEEP)
    decorate(slide, "16")
    header(slide, "机忆书库", "THE MACHINE MEMORY", "16 / 16")
    textbox(slide, LX, Inches(2.25), CW, Inches(1.0),
            [[R("不替你下结论，只把线索摆在你面前。", size=36, color=GOLD2, font=SERIF, bold=True)]],
            align=PP_ALIGN.CENTER)
    bullets(slide, Inches(4.0), Inches(3.5), Inches(5.33), [
        [R("线上　", size=13, color=DIM, font=SANS), R(URL_ONLINE, size=13, color=GOLD2, font=MONO)],
        [R("48 本书 · 384 章 · 144 项 E2E 全绿", size=13, color=INK, font=SANS)],
        [R("「假如」都标注为推测，史实都有来源", size=13, color=INK, font=SANS)],
    ], size=13, gap=6)
    rect(slide, Inches(3.87), Inches(4.9), Inches(5.6), Inches(0.52),
         fill=PANEL, line_color=GOLD3, line_w=0.75)
    textbox(slide, Inches(3.87), Inches(4.98), Inches(5.6), Inches(0.4),
            [[R(TEAM_LINE, size=15, color=GOLD2, font=SANS)]], align=PP_ALIGN.CENTER)
    textbox(slide, LX, Inches(5.75), CW, Inches(0.5),
            [[R("感谢观看，欢迎提问。", size=20, color=INK, font=SERIF)]], align=PP_ALIGN.CENTER)
    notes(slide, NOTES[15], cue_of(NOTES[15]))

def build_video_page(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    set_bg(slide, BG_DEEP)
    decorate(slide, "17")
    header(slide, "演示视频", "DEMO VIDEO", "17 / 17")
    v_w = Inches(13.333 * 0.76)
    v_h = Emu(int(v_w * 9 / 16))
    v_l = Emu(int((Emu(int(SLIDE_W)) - v_w) / 2))
    v_t = Inches(1.30)
    if os.path.exists(VIDEO_PATH):
        add_video(slide, VIDEO_PATH, v_l, v_t, v_w, v_h)
    else:
        rect(slide, v_l, v_t, v_w, v_h, fill=PANEL, line_color=GOLD, line_w=0.75)
        textbox(slide, v_l, Inches(3.6), v_w, Inches(0.5),
                [[R("视频文件缺失：请确认路径后重跑脚本", size=14, color=RUST, font=SANS)]],
                align=PP_ALIGN.CENTER)
    textbox(slide, LX, Inches(7.02), CW, Inches(0.4),
            [[R("双击播放 · 若无声音请检查播放器", size=10, color=FAINT, font=SANS)]],
            align=PP_ALIGN.CENTER)
    full_note = "演示视频：门厅入馆 → 抽书翻开 → 馆长导览 → L4 暗门三连 → 假如之书 → 未写之书。"
    slide.notes_slide.notes_text_frame.text = full_note

def build():
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H
    build_cover(prs)
    build_positioning(prs, 2)
    build_content_48(prs, 3)
    build_structure(prs, 4)
    build_search(prs, 5)
    build_play(prs, 6)
    build_hidden_door(prs, 7)
    build_demo(prs, 8)
    build_stack(prs, 9)
    build_3d(prs, 10)
    build_quality(prs, 11)
    build_security(prs, 12)
    build_data(prs, 13)
    build_run(prs, 14)
    build_tour(prs, 15)
    build_end(prs, 16)
    build_video_page(prs)
    prs.save(OUT_PATH)
    return OUT_PATH

def verify(path):
    from pptx import Presentation as P
    from pptx.opc.constants import RELATIONSHIP_TYPE as RT
    prs = P(path)
    n = len(prs.slides)
    print("幻灯片页数 =", n)
    assert n == 17, "应为 17 页（16 + 视频页）"
    # 检查视频 part
    video_parts = []
    for slide in prs.slides:
        for rel in slide.part.rels.values():
            if rel.reltype.endswith("/video"):
                part = rel.target_part
                info = (slide.slide_id, part.partname, len(getattr(part, 'blob', b'')))
                video_parts.append(info)
    # 直接遍历包 media
    media_sizes = []
    for part in prs.part.package.iter_parts():
        pname = str(part.partname)
        if "/media/" in pname and pname.startswith("/ppt/media/media"):
            media_sizes.append((pname, len(part.blob)))
    print("视频 relationship =", video_parts)
    print("media parts =", media_sizes)
    return n, video_parts, media_sizes

if __name__ == "__main__":
    print("生成中...")
    out = build()
    print("已保存 →", out)
    verify(out)
    print("完成")