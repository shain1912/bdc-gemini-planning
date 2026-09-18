"""
Red Teaming — 반대편에서 읽으면: 반박 → 보완(사람) → 재검토
슬라이드 4-2(Red Teaming)에 삽입. 에디토리얼 페이퍼 팔레트.

렌더 (저장소 루트에서):
    PYTHONPATH=manim manim -qh manim/red_team.py RedTeam
결과:
    media/videos/red_team/1080p60/RedTeam.mp4  →  assets/manim_red_team.mp4
"""

from manim import *
from palette import KO, SERIF, BG, INK, SUB, ACC, SOFT, LINE, OK


def card(title, sub, w=3.4, h=1.15, fill=SOFT, stroke=INK):
    r = Rectangle(width=w, height=h, fill_color=fill, fill_opacity=1, stroke_color=stroke, stroke_width=2)
    t = Text(title, font=KO, weight=BOLD, color=INK).scale(0.46)
    s = Text(sub, font=KO, color=SUB).scale(0.36)
    g = VGroup(t, s).arrange(DOWN, buff=0.14).move_to(r.get_center())
    return VGroup(r, t, s)


class RedTeam(Scene):
    def construct(self):
        self.camera.background_color = BG

        title = Text("반대편에서 읽으면", font=SERIF, weight=BOLD, color=INK).scale(0.8)
        title.to_edge(UP, buff=0.6)
        self.play(FadeIn(title, shift=DOWN * 0.3))
        self.wait(0.4)

        # 결론
        concl = Rectangle(width=7.4, height=0.95, fill_color=INK, fill_opacity=1, stroke_width=0)
        concl_t = Text("결론 · 부산 디자인 기업용 AI 진단 서비스", font=KO, weight=BOLD, color=BG).scale(0.5)
        concl_t.move_to(concl.get_center())
        concl_g = VGroup(concl, concl_t).move_to(UP * 1.7 + LEFT * 1.6)
        self.play(FadeIn(concl_g, shift=UP * 0.2))

        # 이유 3 + 근거
        reasons = [("이유 1 · 문제의 크기", "근거 · 조사 수치 (출처)"),
                   ("이유 2 · 지금인 이유", "근거 · —"),
                   ("이유 3 · 우리인 이유", "근거 · 사례 1건")]
        xs = [-5.2, -1.6, 2.0]
        cards = VGroup(*[card(t, s).move_to([x, -0.2, 0]) for (t, s), x in zip(reasons, xs)])
        links = VGroup(*[Line(concl.get_bottom(), c[0].get_top(), color=LINE, stroke_width=2) for c in cards])
        self.play(LaggedStart(*[Create(l) for l in links], lag_ratio=0.1), run_time=0.6)
        self.play(LaggedStart(*[GrowFromCenter(c) for c in cards], lag_ratio=0.15), run_time=1.0)
        self.wait(0.6)

        # 검토자 3인 (오른쪽)
        who = ["심사위원", "경쟁사", "회계"]
        revs = VGroup()
        for i, w in enumerate(who):
            pill = RoundedRectangle(corner_radius=0.3, width=1.7, height=0.55, stroke_color=ACC, stroke_width=2, fill_color=BG, fill_opacity=1)
            txt = Text(w, font=KO, weight=BOLD, color=ACC).scale(0.38).move_to(pill.get_center())
            revs.add(VGroup(pill, txt).move_to([5.4, 1.2 - i * 0.85, 0]))
        rev_lbl = Text("Red Team", font=KO, color=ACC).scale(0.36).next_to(revs, UP, buff=0.2)
        self.play(FadeIn(rev_lbl), LaggedStart(*[FadeIn(r, shift=LEFT * 0.3) for r in revs], lag_ratio=0.15))
        self.wait(0.3)

        # 반박 화살표
        a1 = Arrow(revs[0].get_left(), cards[1][0].get_right() + UP * 0.25, buff=0.1, color=ACC, stroke_width=4, max_tip_length_to_length_ratio=0.12)
        a2 = Arrow(revs[2].get_left(), cards[2][0].get_right() + DOWN * 0.1, buff=0.1, color=ACC, stroke_width=4, max_tip_length_to_length_ratio=0.12)
        self.play(GrowArrow(a1), GrowArrow(a2), run_time=0.7)

        f1 = Text("근거 없음 · 심각도 상", font=KO, weight=BOLD, color=ACC).scale(0.4)
        f1.next_to(cards[1], DOWN, buff=0.25)
        f2 = Text("사례 1건 · 심각도 중", font=KO, weight=BOLD, color=ACC).scale(0.4)
        f2.next_to(cards[2], DOWN, buff=0.25)
        self.play(cards[1][0].animate.set_stroke(ACC, 3), cards[2][0].animate.set_stroke(ACC, 3),
                  FadeIn(f1, shift=UP * 0.15), FadeIn(f2, shift=UP * 0.15))
        self.wait(1.2)

        # 보완 = 사람
        human = Text("보완 = 사람", font=KO, weight=BOLD, color=INK).scale(0.5)
        human.move_to(DOWN * 2.05 + LEFT * 1.6)
        self.play(FadeIn(human, shift=UP * 0.2), FadeOut(a1), FadeOut(a2))
        new_s1 = Text("근거 · 시범 결과 + 출처", font=KO, color=INK).scale(0.36).move_to(cards[1][2].get_center())
        new_s2 = Text("근거 · 사례 3건 + 수치", font=KO, color=INK).scale(0.36).move_to(cards[2][2].get_center())
        self.play(ReplacementTransform(cards[1][2], new_s1), ReplacementTransform(cards[2][2], new_s2), run_time=0.8)
        self.wait(0.4)

        # 재검토 → 통과
        self.play(FadeOut(f1), FadeOut(f2),
                  cards[1][0].animate.set_stroke(OK, 3), cards[2][0].animate.set_stroke(OK, 3), run_time=0.6)
        checks = VGroup()
        for c in cards:
            ck = Text("통과", font=KO, weight=BOLD, color=OK).scale(0.4).next_to(c, DOWN, buff=0.25)
            checks.add(ck)
        self.play(LaggedStart(*[FadeIn(k, shift=UP * 0.15) for k in checks], lag_ratio=0.15))
        self.wait(0.5)

        cycle = Text("반박 → 보완(사람) → 재검토 · 3회", font=KO, color=SUB).scale(0.45)
        cycle.move_to(DOWN * 2.05 + LEFT * 1.6)
        self.play(ReplacementTransform(human, cycle))
        fin = Text("심각도 '상' 0건 = 통과", font=SERIF, weight=BOLD, color=OK).scale(0.7)
        fin.move_to(DOWN * 2.8 + LEFT * 1.6)
        self.play(FadeIn(fin, shift=UP * 0.2))
        self.wait(1.6)

        note = Text("개념 도식 — 실제 기획서 아님", font=KO, color=SUB).scale(0.34)
        note.to_edge(DOWN, buff=0.25).to_edge(RIGHT, buff=0.5)
        self.play(FadeIn(note))
        self.wait(1.0)
