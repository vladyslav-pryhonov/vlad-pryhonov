/* ==========================================================================
   hero.js – шапка, меню, жили-зірка з іскрами (canvas), «зарядка» CTA, вступна анімація (GSAP)
   Без залежностей, окрім GSAP (необов'язкового: без нього сторінка просто показується одразу).
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Шапка: стан при прокрутці ---------- */
  var header = document.getElementById('header');
  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 8); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Мобільне меню ---------- */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('mobileMenu');
  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
    menu.hidden = !open;
    header.classList.toggle('is-open', open);
  }
  burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
  menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  window.matchMedia('(min-width: 900px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });

  /* Вибір тарифу (hero, блок цін, форма) – єдиний стан у js/site.js */

  /* ---------- Розбиття заголовка на слова для анімації ---------- */
  function splitWords(el) {
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/( +)/).forEach(function (part) {   // тільки звичайний пробіл: nbsp тримає слова разом
            if (!part) return;
            if (/^ +$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'word';
            var i = document.createElement('span'); i.className = 'word__in'; i.textContent = part;
            w.appendChild(i); frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) { walk(n); }
      });
    })(el);
  }
  var title = document.querySelector('[data-split]');
  if (title && !reduce.matches) splitWords(title);

  /* ==========================================================================
     Жили-зірка: 6 «сходинкових» стовбурів від центру CTA під кутами 30/90/150/210/270/330°,
     кроки чергують два сусідні напрямки гексагона (0/60/120…), на вузлах – короткі відгалуження.
     Усе симетричне відносно кнопки; яскравість спадає з відстанню.
     Послідовність (один раз за сесію): 3 імпульси з різних боків, кожен «гріє» рамку CTA (--charge),
     третій запалює кнопку; далі імпульсів немає – лише мерехтіння ліній хвилею від кнопки.
     ========================================================================== */
  var hero = document.querySelector('.hero');
  var canvas = hero.querySelector('.hero__veins');
  var cta = document.getElementById('heroCta');
  var glow = cta.closest('.cta-glow');
  var headerCta = document.getElementById('headerCta');
  var ctx = canvas.getContext('2d');

  var W = 0, H = 0, dpr = 1, target = { x: 0, y: 0 };
  var segs = [], dots = [], routes = [];
  var running = false, raf = 0, lastT = 0, lastDraw = 0;
  var seq = null;                       // активна послідовність «зарядки» або null
  var flickStart = -1e9;                // момент, з якого лінії мерехтять (Infinity – доки триває зарядка)
  var hitPulse = 0;                     // коротке «підсвічування» ліній при влучанні імпульсу

  var DIRS = [0, 60, 120, 180, 240, 300].map(function (a) { return [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180)]; });
  /* Стовбур (k: 0=30°, 1=90°, 2=150°, 5=330°, кути екранні: 90° – вниз) і момент влучання T, с.
     Широкий екран: два короткі імпульси зі стовбурів, а фінальний (head) стартує з лінії на голові
     і перетинає вільний центр до кнопки – це і є «думка → заявка». */
  var SPARKS_WIDE = [{ k: 1, T: 0.9 }, { k: 5, T: 1.4 }, { head: true, T: 1.9 }];
  var SPARKS_NARROW = [{ k: 5, T: 0.9 }, { k: 0, T: 1.4 }, { k: 2, T: 1.9 }];
  var sparkDefs = SPARKS_NARROW, headRoute = null;
  var CHARGE = [0.34, 0.68, 1];
  var BRANCH_AT = [3, 6, 9, 12], BRANCH_LEN = [3, 3, 2, 2];   // праві стовбури (k=0, 5) мають усі 4 вузли, решта – перші два
  var SPARK_MAX = 460;                  // довжина шляху іскри, px

  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function build() {
    var L = W < 700 ? 46 : 70;
    var R = Math.max(520, Math.hypot(W, H) * 0.75);
    var hr = hero.getBoundingClientRect();
    var stage = hero.querySelector('.hero__stage').getBoundingClientRect();
    var wide = W >= 960;
    var cb = cta.getBoundingClientRect();
    /* Текст: лінії там приглушені, крім «гало» навколо кнопки (видно, що жили виходять із неї).
       На широкому .hero__copy має display:contents (без власного блоку), тому беремо об'єднання заголовка, підзаголовка й кнопки;
       на мобільному колонка на всю ширину: приглушуємо лише текст над кнопкою. */
    var boxes;
    function rectOf(els, pad) {
      var rs = els.map(function (e) { return e.getBoundingClientRect(); });
      return { l: Math.min.apply(null, rs.map(function (r) { return r.left; })) - hr.left - pad, r: Math.max.apply(null, rs.map(function (r) { return r.right; })) - hr.left + pad,
               t: Math.min.apply(null, rs.map(function (r) { return r.top; })) - hr.top - pad, b: Math.max.apply(null, rs.map(function (r) { return r.bottom; })) - hr.top + pad };
    }
    if (wide) {                                 // два текстові блоки по боках від фото (.hero__copy тут display:contents)
      boxes = [rectOf([hero.querySelector('.hero__title')], 8),
               rectOf([hero.querySelector('.hero__lead'), hero.querySelector('.hero__actions')], 8)];
      var fe = hero.querySelector('.hero__facts');
      if (fe && fe.offsetParent) boxes.push(rectOf([fe], 8));
    } else {                                    // мобільний: колонка на всю ширину, приглушуємо лише текст над кнопкою
      var copy = hero.querySelector('.hero__copy').getBoundingClientRect();
      boxes = [{ l: copy.left - hr.left, r: copy.right - hr.left, t: copy.top - hr.top, b: cb.top - hr.top - 6 }];
    }
    /* Яскравість спадає від центру hero (на широкому), а не від кнопки: кнопка збоку, і лінії не мають збиватись біля неї */
    var focus = wide ? { x: W * 0.5, y: H * 0.55 } : target;
    var HALO = 150;
    sparkDefs = wide ? SPARKS_WIDE : SPARKS_NARROW;
    var headPt = { x: stage.left - hr.left + stage.width * 0.5, y: stage.top - hr.top + stage.height * 0.18 };   // голова
    var seenSeg = {}, seenDot = {};
    segs = []; dots = []; routes = [];

    var origin = target;                                            // центр зірки, що зараз будується
    function fadeAt(x, y) {
      var d = Math.hypot(x - origin.x, y - origin.y);                       // для хвилі мерехтіння й «гало» – від центру зірки
      var a = Math.max(0.16, 1 - Math.min(Math.hypot(x - focus.x, y - focus.y) / R, 1));
      for (var bi = 0; bi < boxes.length; bi++) {
        var bx = boxes[bi];
        if (x > bx.l && x < bx.r && y > bx.t && y < bx.b) { a *= 0.4 + 0.6 * clamp(1 - d / HALO, 0, 1); break; }
      }
      return { a: a, d: d };
    }
    function key(p) { return Math.round(p.x) + ',' + Math.round(p.y); }
    var main = 1;                                                   // 1 – стовбури (яскравіші, товщі), 0 – відгалуження
    function addSeg(a, b) {
      var k1 = key(a), k2 = key(b), id = k1 < k2 ? k1 + '|' + k2 : k2 + '|' + k1;
      if (seenSeg[id]) return; seenSeg[id] = 1;                    // збіг відгалуження зі стовбуром не малюємо двічі
      var f = fadeAt((a.x + b.x) / 2, (a.y + b.y) / 2);
      segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, a: (main ? 0.95 : 0.5) * f.a, d: f.d, main: main, ph: (segs.length * 2.399) % 6.283 });
    }
    function addDot(p) {
      var id = key(p); if (seenDot[id]) return; seenDot[id] = 1;
      var f = fadeAt(p.x, p.y);
      dots.push({ x: p.x, y: p.y, a: 1 * f.a, d: f.d, ph: (dots.length * 1.7) % 6.283 });
    }
    function stair(from, k, steps) {           // сходинки між гекс-напрямами k і k+1 → середній напрям 30°+60°·k
      var pts = [from], cur = from;
      for (var i = 0; i < steps; i++) {
        var d = DIRS[(k + (i & 1)) % 6], nx = { x: cur.x + d[0] * L, y: cur.y + d[1] * L };
        pts.push(nx); addSeg(cur, nx);
        var inside = nx.x > -12 && nx.x < W + 12 && nx.y > 60 && nx.y < H - 6;
        if (inside) addDot(nx); else break;
        cur = nx;
      }
      return pts;
    }
    function routeTo(start, end) {              // жадібний маршрут гекс-напрямами від start до end (сходинки)
      var pts = [start], cur = { x: start.x, y: start.y }, prev = -1, guard = 0;
      while (dist(cur, end) > L * 1.2 && guard++ < 90) {
        var best = -1, bestD = Infinity;
        for (var i = 0; i < 6; i++) {
          if (prev >= 0 && i === (prev + 3) % 6) continue;           // без розвороту на 180°
          var d = Math.hypot(cur.x + DIRS[i][0] * L - end.x, cur.y + DIRS[i][1] * L - end.y);
          if (i === prev) d += L * 0.55;                              // штраф за пряму: виходять сходинки
          if (d < bestD) { bestD = d; best = i; }
        }
        cur = { x: cur.x + DIRS[best][0] * L, y: cur.y + DIRS[best][1] * L };
        pts.push(cur); prev = best;
      }
      pts.push({ x: end.x, y: end.y });
      return pts;
    }
    /* Багатші відгалуження – на стовбурах у бік центру сторінки (там порожньо), решта скромніші */
    var rich = target.x > W / 2 ? [2, 3] : [0, 5];
    var k, trM = [];
    for (k = 0; k < 6; k++) routes[k] = stair(target, k, 60);
    headRoute = null;
    if (wide) {                                  // лінія від голови до кнопки: частина візерунка, по ній іде фінальний імпульс
      headRoute = routeTo(headPt, target);
      for (var hi = 1; hi < headRoute.length; hi++) { addSeg(headRoute[hi - 1], headRoute[hi]); if (hi < headRoute.length - 1) addDot(headRoute[hi]); }
      /* Дзеркальна зірка зліва (лише візерунок, без імпульсів): ліва половина hero не лишається порожньою, композиція симетрична */
      origin = { x: W - target.x, y: target.y };
      for (k = 0; k < 6; k++) trM[k] = stair(origin, k, 60);
      origin = target;
    }
    main = 0;
    function branches(tr, center, richArms) {
      origin = center;
      for (var kk = 0; kk < 6; kk++) {
        var nb = richArms.indexOf(kk) >= 0 ? BRANCH_AT.length : 2;
        for (var b = 0; b < nb; b++) {
          var node = tr[kk][BRANCH_AT[b]]; if (!node) break;
          stair(node, (kk + 5) % 6, BRANCH_LEN[b]);
          stair(node, (kk + 1) % 6, BRANCH_LEN[b]);
        }
      }
    }
    branches(routes, target, rich);
    if (wide) branches(trM, { x: W - target.x, y: target.y }, rich[0] === 2 ? [0, 5] : [2, 3]);
    origin = target;
    if (seq) layoutSparks();
  }

  /* Шлях іскри: останні ≤460px стовбура, у зворотному напрямку (від краю до кнопки) */
  function sparkRoute(pts, maxLen) {
    var cum = [0], m = pts.length - 1, i;
    for (i = 1; i < pts.length; i++) { cum.push(cum[i - 1] + dist(pts[i - 1], pts[i])); if (cum[i] >= maxLen) { m = i; break; } }
    var sub = pts.slice(0, m + 1).reverse(), c = [0];
    for (i = 1; i < sub.length; i++) c.push(c[i - 1] + dist(sub[i - 1], sub[i]));
    return { pts: sub, cum: c, len: c[c.length - 1] };
  }
  function makeRoute(pts) {                      // маршрут від голови до кнопки вже в потрібному напрямку
    var c = [0];
    for (var i = 1; i < pts.length; i++) c.push(c[i - 1] + dist(pts[i - 1], pts[i]));
    return { pts: pts, cum: c, len: c[c.length - 1] };
  }
  function layoutSparks() {
    seq.sparks = sparkDefs.map(function (def, i) {
      var r = def.head ? makeRoute(headRoute) : sparkRoute(routes[def.k], SPARK_MAX);
      var dur = Math.max(0.35, Math.min(r.len / 300, def.T - 0.1));
      return { r: r, start: seq.t0 + (def.T - dur) * 1000, dur: dur * 1000, hit: !!(seq.sparks && seq.sparks[i] && seq.sparks[i].hit) };
    });
  }
  function pointAt(r, s) {
    var c = r.cum, i = 1;
    while (i < c.length - 1 && c[i] < s) i++;
    var t = (s - c[i - 1]) / (c[i] - c[i - 1] || 1);
    return { x: r.pts[i - 1].x + (r.pts[i].x - r.pts[i - 1].x) * t, y: r.pts[i - 1].y + (r.pts[i].y - r.pts[i - 1].y) * t };
  }

  function drawSpark(sp, t) {
    var p = (t - sp.start) / sp.dur;
    if (p <= 0 || p >= 1 || sp.r.len < 2) return;
    var s = sp.r.len * Math.pow(p, 1.6);                           // розганяється до кнопки
    var TAIL = 70, k, a, b;
    ctx.lineWidth = 1.8;
    for (k = 0; k < 6; k++) {                                     // хвіст: 6 відрізків зі зростаючою яскравістю
      a = Math.max(0, s - TAIL + k * (TAIL / 6)); b = Math.max(0, s - TAIL + (k + 1) * (TAIL / 6));
      if (b <= a) continue;
      var pa = pointAt(sp.r, a), pb = pointAt(sp.r, b);
      ctx.strokeStyle = 'rgba(91,227,169,' + (0.08 + k * 0.15).toFixed(2) + ')';
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
    }
    var h = pointAt(sp.r, s);
    var g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 9);
    g.addColorStop(0, 'rgba(2,177,110,0.6)'); g.addColorStop(1, 'rgba(2,177,110,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h.x, h.y, 9, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#C9F7E1'; ctx.beginPath(); ctx.arc(h.x, h.y, 2.1, 0, 6.2832); ctx.fill();
  }

  /* Лінії групуються за яскравістю (≈30 рівнів): кілька stroke() замість сотні */
  var buckets = [];
  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var flick = reduce.matches ? 0 : clamp((t - flickStart) / 800, 0, 1);
    var sec = t / 1000, boost = 1 + hitPulse * 0.9, i, q;
    function wave(d, ph) {                                         // хвиля яскравості від кнопки + дрібне мерехтіння
      // розмах 0.2…1.6 (раніше 0.5…1.0): гребінь яскравіший за статичну лінію, западина майже гасне, тож мерехтіння видно
      var w = 0.2 + 1.4 * (0.5 + 0.5 * Math.sin(sec * 2.0 - d / 65));
      var m = w * (0.8 + 0.2 * Math.sin(sec * 3.3 + ph));
      return 1 + (m - 1) * flick;
    }
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (var pass = 0; pass < 2; pass++) {                         // спершу відгалуження, потім стовбури поверх
      for (i = 0; i < buckets.length; i++) buckets[i] = null;
      for (i = 0; i < segs.length; i++) {
        var s = segs[i]; if (s.main !== pass) continue;
        q = Math.round(s.a * (flick ? wave(s.d, s.ph) : 1) * boost * 50);
        if (q < 1) continue; if (q > 45) q = 45;
        (buckets[q] || (buckets[q] = [])).push(s);
      }
      ctx.lineWidth = pass ? 1.3 : 1;
      for (q = 1; q < buckets.length; q++) {
        var list = buckets[q]; if (!list) continue;
        var hl = clamp((q - 18) / 27, 0, 1);                       // яскравий гребінь хвилі трохи світлішає (Jungle → світла м'ята)
        ctx.strokeStyle = 'rgba(' + Math.round(2 + 89 * hl) + ',' + Math.round(177 + 50 * hl) + ',' + Math.round(110 + 59 * hl) + ',' + (q / 50).toFixed(2) + ')';
        ctx.beginPath();
        for (i = 0; i < list.length; i++) { ctx.moveTo(list[i].x1, list[i].y1); ctx.lineTo(list[i].x2, list[i].y2); }
        ctx.stroke();
      }
    }
    for (i = 0; i < dots.length; i++) {
      var d = dots[i], a = d.a * (flick ? wave(d.d, d.ph) : 1) * boost;
      if (a < 0.02) continue;
      ctx.fillStyle = 'rgba(2,177,110,' + Math.min(a, 0.9).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(d.x, d.y, 1.6, 0, 6.2832); ctx.fill();
    }
    if (seq) seq.sparks.forEach(function (sp) { drawSpark(sp, t); });
  }

  /* ---------- «Зарядка» CTA ---------- */
  function burst(cls) {
    glow.classList.remove('is-charged', 'is-ignited'); void glow.offsetWidth; glow.classList.add(cls);
  }
  function ignite() {
    if (!seq) return;
    seq = null;
    cta.removeAttribute('data-state');
    cta.style.removeProperty('--charge');
    burst('is-ignited');
    hitPulse = 1;
    flickStart = performance.now();
    try { sessionStorage.setItem('charged', '1'); } catch (e) { /* приватний режим */ }
  }
  function onHit(i) {
    cta.style.setProperty('--charge', String(CHARGE[i]));
    hitPulse = 1;
    if (i === sparkDefs.length - 1) ignite(); else burst('is-charged');
  }
  function updateSeq(t) {
    for (var i = 0; seq && i < seq.sparks.length; i++) {
      var sp = seq.sparks[i];
      if (!sp.hit && t >= sp.start + sp.dur) { sp.hit = true; onHit(i); }
    }
  }
  function canPlaySequence() {
    var replay = /[?&]replay\b/.test(location.search), done = false;
    try { done = !!sessionStorage.getItem('charged'); } catch (e) { /* приватний режим */ }
    var r = cta.getBoundingClientRect();
    return (replay || !done) && window.scrollY < 60 && r.top < window.innerHeight - 60;
  }
  function startSequence(delayMs) {
    seq = { t0: performance.now() + delayMs, sparks: null };
    layoutSparks();
    flickStart = Infinity;
    cta.setAttribute('data-state', 'charging');
    cta.style.setProperty('--charge', '0');
    setTimeout(ignite, delayMs + 5000);                           // страховка: у будь-якому разі запалюємо
  }

  function frame(t) {
    if (!running) return;
    var dt = Math.min(0.05, (t - lastT) / 1000 || 0); lastT = t;
    hitPulse *= Math.exp(-dt * 3.2);
    if (!seq && t - lastDraw < 32) { raf = requestAnimationFrame(frame); return; }   // після зарядки мерехтіння ~30 к/с
    lastDraw = t;
    draw(t);
    updateSeq(t);
    raf = requestAnimationFrame(frame);
  }
  function start() { if (running || reduce.matches) return; running = true; lastT = performance.now(); raf = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  /* Правий блок (підзаголовок, тарифи, кнопка) висить під заголовком, тож на низьких екранах кнопка впирається в прізвище.
     Піднімаємо його настільки, щоб між кнопкою й прізвищем лишався запас. Підйом – CSS-змінна --lift (top у hero.css),
     застосовується ДО виміру кнопки, тому жили й імпульси автоматично сходяться в її центр. Вимір – через offsetTop,
     тобто без урахування transform (GSAP-анімація входу його не збиває). */
  var markEl = hero.querySelector('.hero__mark'), desktopMq = window.matchMedia('(min-width: 960px)');
  function layoutTop(el) {
    var t = 0;
    while (el && el !== hero) { t += el.offsetTop; el = el.offsetParent; }
    return el === hero ? t : null;
  }
  function layoutLeft(el) {
    var l = 0;
    while (el && el !== hero) { l += el.offsetLeft; el = el.offsetParent; }
    return el === hero ? l : null;
  }
  function applyLift() {
    hero.style.setProperty('--lift', '0px');
    if (!desktopMq.matches || !markEl) return;
    var cTop = layoutTop(cta), mTop = layoutTop(markEl), lTop = layoutTop(hero.querySelector('.hero__lead'));
    if (cTop === null || mTop === null) return;
    var gap = mTop - (cTop + cta.offsetHeight);
    var minGap = Math.max(56, parseFloat(getComputedStyle(markEl).fontSize) * 0.5);
    var need = Math.max(0, minGap - gap);
    if (lTop !== null) need = Math.min(need, Math.max(0, lTop - 96));    // не вище шапки
    hero.style.setProperty('--lift', Math.round(need) + 'px');
  }

  function resize() {
    applyLift();
    var r = hero.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height);
    dpr = Math.min(window.devicePixelRatio || 1, W < 700 ? 1.5 : 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    /* Центр кнопки – за розкладкою (offset*), а не за getBoundingClientRect: той враховує transform анімації входу (y: 22 → 0),
       і перерахунок посеред інтро зміщував би центр «зірки» від центру кнопки */
    var lx = layoutLeft(cta), ly = layoutTop(cta);
    if (lx !== null && ly !== null) target = { x: lx + cta.offsetWidth / 2, y: ly + cta.offsetHeight / 2 };
    else { var c = cta.getBoundingClientRect(); target = { x: c.left - r.left + c.width / 2, y: c.top - r.top + c.height / 2 }; }
    build(); draw(performance.now());
  }

  var rt = 0;
  function scheduleResize() { cancelAnimationFrame(rt); rt = requestAnimationFrame(resize); }
  if ('ResizeObserver' in window) new ResizeObserver(scheduleResize).observe(hero); else window.addEventListener('resize', scheduleResize);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleResize);
  resize();

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { e[0].isIntersecting ? start() : stop(); }, { threshold: 0 }).observe(hero);
    /* Кнопка в шапці: контурна, поки видно CTA першого екрана; коли той пішов із кадру – стає оранжевою */
    new IntersectionObserver(function (e) { headerCta.classList.toggle('is-hot', !e[0].isIntersecting); },
      { rootMargin: '-80px 0px 0px 0px' }).observe(cta);
  } else { start(); }
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  reduce.addEventListener('change', function () { reduce.matches ? (stop(), draw(0)) : start(); });

  /* ---------- Вступна анімація (GSAP) ---------- */
  function reveal() { root.classList.add('ready'); }
  if (!window.gsap || reduce.matches) { reveal(); return; }

  var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from('.hero__title .word__in', { yPercent: 115, duration: 1, stagger: 0.05 }, 0)
    .from('.hero__lead', { y: 22, opacity: 0, duration: 0.8 }, 0.35)
    .from('.hero__veins', { opacity: 0, duration: 1.2, ease: 'power1.out' }, 0.2)
    .from('.hero__stage', { y: 40, opacity: 0, scale: 1.03, duration: 1.3 }, 0.15)
    .from('.hero__facts li', { y: 14, opacity: 0, duration: 0.8, stagger: 0.12 }, 0.9)
    .from('.hero__mark', { yPercent: 35, opacity: 0, duration: 1.4 }, 0.3);
  tl.from('.hero__actions', { y: 22, opacity: 0, duration: 0.8 }, 0.55);
  if (canPlaySequence()) startSequence(500);                      // кнопка контурна → імпульси → запалюється (≈2.4 с)
  reveal();                                                       // стани "from" вже виставлені – показуємо без стрибка

  /* Легкий паралакс фото за мишею (тільки точний вказівник) */
  if (window.matchMedia('(pointer: fine)').matches) {
    var stage = document.querySelector('.hero__stage');
    var qx = gsap.quickTo(stage, 'x', { duration: 0.9, ease: 'power3.out' });
    var qy = gsap.quickTo(stage, 'y', { duration: 0.9, ease: 'power3.out' });
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      qx(((e.clientX - r.left) / r.width - 0.5) * -14);
      qy(((e.clientY - r.top) / r.height - 0.5) * -10);
    });
  }
})();
