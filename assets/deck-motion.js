/* ===================================================================
 * deck-motion.js — anime.js(v3) 기반 슬라이드 진입 연출 (에디토리얼 판)
 *
 * 의존: lib/anime.min.js, assets/runtime.js (body[data-current-slide] 갱신)
 * runtime.js 는 수정하지 않는다. body 속성 변화를 MutationObserver 로 감지한다.
 * 색은 CSS 변수(--accent, --text-1, --bg)에서 읽어 테마(paper/ink) 전환에 따라간다.
 *
 * 연출 규칙 (슬라이드 구조에서 자동 판별):
 *   .cover         : eyebrow → 제목 단어 stagger → 리드 → 메타 4칸
 *   .hero (파트)   : 대형 숫자 → 필 → 제목 단어 stagger → 부제 · 메타
 *   본문           : 키커 → 제목 단어 stagger → 부제 → 항목(.card/.stg/tbody tr) stagger → 라벨 줄 → 강조 카드
 *   .versus        : 왼쪽 → vs 배지 팝 → 오른쪽
 *   [data-flow]    : 카드 위 타임라인(선 · 점 · 화살표)
 *   [data-formula] : 카드 사이 + 연산자 → = 결과 문장
 *   [data-count-to]: 숫자 카운트업
 *   video          : 진입 시 처음부터 재생, 이탈 시 정지. 클릭/버튼으로 다시 재생
 *
 * 생략 조건: ?preview=N (발표자 미리보기 iframe), prefers-reduced-motion
 * 단축키: R — 현재 슬라이드 연출 다시 재생
 * =================================================================== */
(function () {
  'use strict';
  if (typeof anime === 'undefined') { console.warn('[deck-motion] anime.js 미로드'); return; }
  if (/[?&]preview=\d+/.test(location.search || '')) return;

  var REDUCE = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EASE = 'cubicBezier(.22,1,.36,1)';
  var ITEM_STEP = 80;
  var VERSUS_STEP = 320;

  var running = [];
  var currentSlide = null;

  function $(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function isAfter(a, b) { return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING); }
  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function splitWords(el) {
    if (el.getAttribute('data-split')) return $('.w', el);
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var nodes = [], n;
    while ((n = walker.nextNode())) { if (n.nodeValue.trim()) nodes.push(n); }
    nodes.forEach(function (t) {
      var parent = t.parentNode;
      var frag = document.createDocumentFragment();
      t.nodeValue.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var s = document.createElement('span');
        s.className = 'w';
        s.textContent = part;
        frag.appendChild(s);
      });
      parent.replaceChild(frag, t);
    });
    el.setAttribute('data-split', '1');
    return $('.w', el);
  }

  function playVideos(slide) {
    $('video', slide).forEach(function (v) {
      try { v.muted = true; v.currentTime = 0; var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
    });
  }

  function cleanup() {
    running.forEach(function (a) { try { a.pause(); } catch (e) {} });
    running = [];
    if (!currentSlide) return;
    $('video', currentSlide).forEach(function (v) { try { v.pause(); } catch (e) {} });
    $('.flow-svg, .formula-op', currentSlide).forEach(function (e) { e.parentNode && e.parentNode.removeChild(e); });
    $('.versus', currentSlide).forEach(function (v) { v.classList.remove('vs-in'); });
    $('.card.glow', currentSlide).forEach(function (c) { c.classList.remove('glow'); });
    $('.visual-box.video', currentSlide).forEach(function (b) { b.classList.remove('ended'); });
  }

  function at(tl, t, fn) { var proxy = { v: 0 }; tl.add({ targets: proxy, v: 1, duration: 1, begin: fn }, t); }

  /* ---------- 타임라인 커넥터(data-flow) ---------- */
  function buildFlow(slide, container, cards) {
    if (cards.length < 2) return null;
    var accent = cssVar('--accent', '#d8401c'), bg = cssVar('--bg', '#f4f1ea');
    var sr = slide.getBoundingClientRect();
    var rects = cards.map(function (c) { return c.getBoundingClientRect(); });
    var y = Math.min.apply(null, rects.map(function (r) { return r.top; })) - sr.top - 26;
    var xs = rects.map(function (r) { return r.left + r.width / 2 - sr.left; });
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'flow-svg');
    svg.setAttribute('viewBox', '0 0 ' + sr.width + ' ' + sr.height);
    svg.setAttribute('preserveAspectRatio', 'none');

    var path = document.createElementNS(NS, 'path');
    path.setAttribute('d', 'M' + xs[0] + ' ' + y + ' L' + xs[xs.length - 1] + ' ' + y);
    path.setAttribute('stroke', accent); path.setAttribute('stroke-width', '2'); path.setAttribute('fill', 'none'); path.setAttribute('stroke-linecap', 'round');
    svg.appendChild(path);

    var halos = [], dots = [];
    xs.forEach(function (x) {
      var halo = document.createElementNS(NS, 'circle');
      halo.setAttribute('cx', x); halo.setAttribute('cy', y); halo.setAttribute('r', '0'); halo.setAttribute('fill', accent); halo.setAttribute('opacity', '.18');
      var dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('cx', x); dot.setAttribute('cy', y); dot.setAttribute('r', '0'); dot.setAttribute('fill', accent); dot.setAttribute('stroke', bg); dot.setAttribute('stroke-width', '3');
      svg.appendChild(halo); svg.appendChild(dot); halos.push(halo); dots.push(dot);
    });

    var head = document.createElementNS(NS, 'path');
    var hx = xs[xs.length - 1] + 22;
    head.setAttribute('d', 'M' + (hx - 9) + ' ' + (y - 7) + ' L' + hx + ' ' + y + ' L' + (hx - 9) + ' ' + (y + 7));
    head.setAttribute('stroke', accent); head.setAttribute('stroke-width', '2.5'); head.setAttribute('fill', 'none'); head.setAttribute('stroke-linecap', 'round'); head.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(head);

    slide.appendChild(svg);
    return { svg: svg, path: path, halos: halos, dots: dots, head: head };
  }

  /* ---------- 수식 연산자(data-formula) ---------- */
  function buildFormulaOps(container, cards) {
    var cr = container.getBoundingClientRect();
    var ops = [];
    for (var i = 0; i < cards.length - 1; i++) {
      var a = cards[i].getBoundingClientRect(), b = cards[i + 1].getBoundingClientRect();
      var op = document.createElement('div');
      op.className = 'formula-op'; op.textContent = '+';
      op.style.left = ((a.right + b.left) / 2 - cr.left) + 'px';
      container.appendChild(op); ops.push(op);
    }
    return ops;
  }

  /* ---------- 표지 ---------- */
  function animateCover(slide) {
    var eyebrow = slide.querySelector('.eyebrow');
    var h1 = slide.querySelector('h1');
    var lede = slide.querySelector('.lede');
    var meta = $('.meta > div', slide);
    var words = h1 ? splitWords(h1) : [];
    var tl = anime.timeline({ easing: EASE });
    running.push(tl);
    if (eyebrow) { anime.set(eyebrow, { opacity: 0, translateY: 10 }); tl.add({ targets: eyebrow, opacity: 1, translateY: 0, duration: 500 }, 0); }
    if (words.length) { anime.set(words, { opacity: 0, translateY: 40 }); tl.add({ targets: words, opacity: 1, translateY: 0, duration: 900, delay: anime.stagger(60) }, 150); }
    if (lede) { anime.set(lede, { opacity: 0, translateY: 16 }); tl.add({ targets: lede, opacity: 1, translateY: 0, duration: 700 }, 500 + Math.min(words.length, 8) * 60); }
    if (meta.length) { anime.set(meta, { opacity: 0, translateY: 14 }); tl.add({ targets: meta, opacity: 1, translateY: 0, duration: 600, delay: anime.stagger(90) }, 800 + Math.min(words.length, 8) * 60); }
  }

  /* ---------- 파트 표지 ---------- */
  function animateHero(slide, hero) {
    var num = hero.querySelector('.hero-num');
    var rule = hero.querySelector('.hero-rule');
    var pill = hero.querySelector('.pill');
    var h1 = hero.querySelector('h1');
    var rest = $('.hero-content p, .hero-content .hm', hero);
    var words = h1 ? splitWords(h1) : [];
    var tl = anime.timeline({ easing: EASE });
    running.push(tl);
    if (num) { anime.set(num, { opacity: 0, translateY: 60 }); tl.add({ targets: num, opacity: 1, translateY: 0, duration: 1200 }, 0); }
    if (rule) { anime.set(rule, { scaleX: 0, transformOrigin: '0 50%' }); tl.add({ targets: rule, scaleX: 1, duration: 900, easing: 'easeInOutQuart' }, 250); }
    if (pill) { anime.set(pill, { opacity: 0, translateY: 12 }); tl.add({ targets: pill, opacity: 1, translateY: 0, duration: 500 }, 400); }
    if (words.length) { anime.set(words, { opacity: 0, translateY: 36 }); tl.add({ targets: words, opacity: 1, translateY: 0, duration: 850, delay: anime.stagger(55) }, 550); }
    if (rest.length) { anime.set(rest, { opacity: 0, translateY: 16 }); tl.add({ targets: rest, opacity: 1, translateY: 0, duration: 700, delay: anime.stagger(140) }, 800 + Math.min(words.length, 10) * 55); }
  }

  /* ---------- 본문 ---------- */
  function animateContent(slide) {
    var kicker = slide.querySelector('.kicker');
    var heads = $(':scope > h1, :scope > h2, .split-visual h1, .split-visual h2', slide);
    var subs = $('.big-subtitle, .label-line, .formula-result', slide);
    var visual = slide.querySelector('.visual-box');
    var versus = slide.querySelector('.versus');
    var items = versus ? $(':scope > div', versus) : $('.card, .stg, tbody tr, .step-list > li, .toc > li, .q, .goal, .gates > div, .canvas > div', slide);
    var flowBox = slide.querySelector('[data-flow]');
    var formulaBox = slide.querySelector('[data-formula]');
    var counters = $('[data-count-to]', slide);

    var preSubs = [], postSubs = [];
    subs.forEach(function (s) { (items.length && isAfter(s, items[0])) ? postSubs.push(s) : preSubs.push(s); });

    var flow = flowBox ? buildFlow(slide, flowBox, $('.card', flowBox)) : null;
    var ops = formulaBox ? buildFormulaOps(formulaBox, $('.card', formulaBox)) : [];

    var words = [];
    heads.forEach(function (h) { words = words.concat(splitWords(h)); });

    var tl = anime.timeline({ easing: EASE });
    running.push(tl);
    var t = 0;

    if (kicker) { anime.set(kicker, { opacity: 0, translateX: -16 }); tl.add({ targets: kicker, opacity: 1, translateX: 0, duration: 500 }, t); t += 150; }
    if (words.length) { anime.set(words, { opacity: 0, translateY: 26 }); tl.add({ targets: words, opacity: 1, translateY: 0, duration: 700, delay: anime.stagger(36) }, t); t += 240 + Math.min(words.length, 12) * 36; }
    if (preSubs.length) { anime.set(preSubs, { opacity: 0, translateY: 16 }); tl.add({ targets: preSubs, opacity: 1, translateY: 0, duration: 650 }, t); t += 120; }
    if (visual) { anime.set(visual, { opacity: 0, translateX: 40 }); tl.add({ targets: visual, opacity: 1, translateX: 0, duration: 900 }, Math.max(0, t - 250)); }

    var step = versus ? VERSUS_STEP : ITEM_STEP;
    var tc = t;
    if (items.length) {
      anime.set(items, { opacity: 0, translateY: 28 });
      tl.add({ targets: items, opacity: 1, translateY: 0, duration: 620, delay: anime.stagger(step) }, tc);
    }
    if (versus) at(tl, tc + step * 0.55, function () { versus.classList.add('vs-in'); });

    if (flow) {
      anime.set(flow.path, { strokeDashoffset: anime.setDashoffset });
      anime.set(flow.head, { opacity: 0, translateX: -8 });
      tl.add({ targets: flow.path, strokeDashoffset: [anime.setDashoffset, 0], duration: 900, easing: 'easeInOutQuart' }, tc + 120);
      tl.add({ targets: flow.halos, r: 12, duration: 500, easing: 'easeOutBack', delay: anime.stagger(step) }, tc + 220);
      tl.add({ targets: flow.dots, r: 5.5, duration: 500, easing: 'easeOutBack', delay: anime.stagger(step) }, tc + 220);
      tl.add({ targets: flow.head, opacity: 1, translateX: 0, duration: 400 }, tc + 900);
    }
    if (ops.length) {
      anime.set(ops, { opacity: 0, scale: 0 });
      ops.forEach(function (op, i) { tl.add({ targets: op, opacity: 1, scale: 1, duration: 450, easing: 'easeOutBack' }, tc + (i + 1) * step + 120); });
    }

    var tEnd = tc + Math.min(items.length, 12) * step + 350;
    if (postSubs.length) { anime.set(postSubs, { opacity: 0, translateY: 14 }); tl.add({ targets: postSubs, opacity: 1, translateY: 0, duration: 650, delay: anime.stagger(120) }, tEnd); }
    counters.forEach(function (el) {
      var to = parseFloat(el.getAttribute('data-count-to')) || 0;
      var o = { v: 0 };
      el.textContent = '0';
      tl.add({ targets: o, v: to, duration: 1100, easing: 'easeOutExpo', round: 1, update: function () { el.textContent = String(o.v); } }, tEnd - 250);
    });
    $('.card.highlight', slide).forEach(function (c) { at(tl, tEnd + 120, function () { c.classList.add('glow'); }); });
  }

  function animateSlide(slide) {
    cleanup();
    currentSlide = slide;
    if (REDUCE) { playVideos(slide); return; }
    var hero = slide.querySelector(':scope > .hero');
    if (slide.classList.contains('cover')) animateCover(slide);
    else if (hero) animateHero(slide, hero);
    else animateContent(slide);
    playVideos(slide);
  }

  function replay() { if (currentSlide) { var s = currentSlide; currentSlide = null; animateSlide(s); } }
  function onChange() {
    var s = document.querySelector('.deck > .slide.is-active');
    if (s && s !== currentSlide) animateSlide(s);
  }

  function wireVideos() {
    $('.visual-box.video').forEach(function (box) {
      var v = box.querySelector('video');
      var btn = box.querySelector('.video-replay');
      if (!v) return;
      v.addEventListener('ended', function () { box.classList.add('ended'); });
      v.addEventListener('play', function () { box.classList.remove('ended'); });
      var restart = function (e) { e.stopPropagation(); v.currentTime = 0; var p = v.play(); if (p && p.catch) p.catch(function () {}); };
      v.addEventListener('click', restart);
      if (btn) btn.addEventListener('click', restart);
    });
  }

  var obs = new MutationObserver(onChange);
  obs.observe(document.body, { attributes: true, attributeFilter: ['data-current-slide'] });
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'r' || e.key === 'R') replay();
  });

  function init() { wireVideos(); onChange(); }
  if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', init);
  window.deckMotion = { replay: replay };
})();
