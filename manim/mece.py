"""
MECE — 기획서 하나를 나누면: 중복 없이 · 누락 없이
슬라이드 3-1(MECE)에 삽입. 에디토리얼 페이퍼 팔레트.

렌더 (저장소 루트에서):
    PYTHONPATH=manim manim -qh manim/mece.py Mece
결과:
    media/videos/mece/1080p60/Mece.mp4  →  assets/manim_mece.mp4
"""

from manim import *
from palette import KO, SERIF, BG, INK, SUB, ACC, SOFT, LINE, OK


def box(label, w=2.3, h=0.9, fill=SOFT, stroke=INK, color=INK, scale=0.5, dashed=False, weight=NORMAL):
    r = Rectangle(width=w, height=h, fill_color=fill, fill_opacity=1, stroke_color=stroke, stroke_width=2)
    if dashed:
        r = DashedVMobject(Rectangle(width=w, height=h, stroke_color=stroke, stroke_width=2), num_dashes=28)
    t = Text(label, font=KO, color=color, weight=weight).scale(scale)
    return VGroup(r, t.move_to(r.get_center()))


class Mece(Scene):
    def construct(self):
        self.camera.background_color = BG

        title = Text("기획서 하나를 나누면", font=SERIF, weight=BOLD, color=INK).scale(0.8)
        title.to_edge(UP, buff=0.6)
        self.play(FadeIn(title, shift=DOWN * 0.3))
        self.wait(0.4)

        root = box("AI 디자인 진단 서비스 기획", w=5.2, h=0.95, fill=INK, color=BG, scale=0.52, weight=BOLD)
        root.move_to(UP * 1.6)
        self.play(FadeIn(root, shift=UP * 0.2))
        self.wait(0.3)

        names = ["시장", "고객", "서비스", "수익"]
        xs = [-3.9, -1.3, 1.3, 3.9]
        kids = VGroup(*[box(n, w=2.1, h=0.85).move_to([x, -0.4, 0]) for n, x in zip(names, xs)])
        links = VGroup(*[Line(root.get_bottom(), k.get_top(), color=LINE, stroke_width=2) for k in kids])
        self.play(LaggedStart(*[Create(l) for l in links], lag_ratio=0.12), run_time=0.8)
        self.play(LaggedStart(*[GrowFromCenter(k) for k in kids], lag_ratio=0.15), run_time=1.0)
        self.wait(0.6)

        # 중복: '경쟁 사례' 가 '시장' 과 겹침
        dup = box("경쟁 사례", w=2.1, h=0.85).move_to([-2.6, -1.9, 0])
        dup_link = Line(root.get_bottom(), dup.get_top(), color=LINE, stroke_width=2)
        self.play(Create(dup_link), GrowFromCenter(dup), run_time=0.7)
        brace = Brace(VGroup(kids[0], dup), LEFT, color=ACC, buff=0.12)
        dup_lbl = Text("중복 · 같은 내용 두 번", font=KO, weight=BOLD, color=ACC).scale(0.42)
        dup_lbl.next_to(dup, DOWN, buff=0.25)
        self.play(Create(brace), FadeIn(dup_lbl, shift=UP * 0.2), kids[0][0].animate.set_stroke(ACC, 3), dup[0].animate.set_stroke(ACC, 3))
        self.wait(1.0)

        # 누락: 빈 칸
        gap = box("?", w=2.0, h=0.85, dashed=True, color=ACC, scale=0.7, weight=BOLD).move_to([6.0, -0.4, 0])
        gap[0].set_stroke(ACC, 2)
        gap_lbl = Text("누락 · 검토자의 첫 질문", font=KO, weight=BOLD, color=ACC).scale(0.42)
        gap_lbl.next_to(gap, DOWN, buff=0.3)
        gap_lbl.shift(LEFT * max(0, gap_lbl.get_right()[0] - 6.85))  # 프레임 우측 여백 확보
        self.play(Create(gap[0]), FadeIn(gap[1]), FadeIn(gap_lbl, shift=UP * 0.2))
        self.wait(1.2)

        # 보정: 중복은 흡수, 누락은 채움
        self.play(FadeOut(brace), FadeOut(dup_lbl), FadeOut(dup_link),
                  dup.animate.move_to(kids[0].get_center()).set_opacity(0),
                  kids[0][0].animate.set_stroke(INK, 2), run_time=0.9)
        risk = box("리스크", w=2.0, h=0.85).move_to(gap.get_center())
        risk_link = Line(root.get_bottom(), risk.get_top(), color=LINE, stroke_width=2)
        self.play(FadeOut(gap_lbl), Create(risk_link), ReplacementTransform(gap, risk), run_time=0.9)

        # 항목 재배치: 5개 균등
        all_kids = VGroup(kids[0], kids[1], kids[2], kids[3], risk)
        new_xs = [-4.8, -2.4, 0.0, 2.4, 4.8]
        moves = [k.animate.move_to([x, -0.4, 0]) for k, x in zip(all_kids, new_xs)]
        self.play(*moves, FadeOut(links), FadeOut(risk_link), run_time=0.8)
        new_links = VGroup(*[Line(root.get_bottom(), k.get_top(), color=LINE, stroke_width=2) for k in all_kids])
        self.play(Create(new_links), run_time=0.5)

        rule = Text("한 층에 기준 하나 · 항목 3~5개", font=KO, color=SUB).scale(0.45)
        rule.move_to(DOWN * 1.7)
        self.play(FadeIn(rule))
        self.wait(0.8)

        fin = Text("중복 없이 · 누락 없이 = MECE", font=SERIF, weight=BOLD, color=OK).scale(0.7)
        fin.move_to(DOWN * 2.6)
        self.play(FadeIn(fin, shift=UP * 0.2))
        self.wait(1.6)

        note = Text("개념 도식 — 실제 기획서 아님", font=KO, color=SUB).scale(0.34)
        note.to_edge(DOWN, buff=0.25)
        self.play(FadeIn(note))
        self.wait(1.0)
