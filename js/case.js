/* ==========================================================================
   case.js – поява блоків при прокрутці і лайтбокс для скрінів переписки. Без залежностей.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Поява при прокрутці ---------- */
  var items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el, i) { el.style.transitionDelay = (i % 3) * 80 + 'ms'; io.observe(el); });
  }

  /* ---------- Картки «Що ви отримуєте» (мобільний вигляд, css/sections.css): кожна з'являється окремо, коли доходить до екрана ---------- */
  var valueCards = document.querySelectorAll('.values li');
  if (valueCards.length) {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      valueCards.forEach(function (el) { el.classList.add('is-in'); });
    } else {
      var vio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-in'); vio.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
      valueCards.forEach(function (el) { vio.observe(el); });
    }
  }

  /* ---------- Картки «Що ви отримуєте» (css/sections.css, блок .values) ----------
     Десктоп: .values.is-live вмикає мигання країв карток (промінь по рамці) лише поки блок у кадрі.
     Мобільний (вузький екран і рух дозволено): .values.is-stack. CSS закріплює всі картки в ОДНІЙ точці (sticky з однаковим top),
     тому наприкінці блока вони відпускаються разом. Решту рахуємо тут за позицією карток:
     1) виїзд: поки картка заходить знизу, вона з'їжджається з боку (непарні зліва, парні справа) і проявляється;
     2) глибина: коли наступна картка наїжджає, попередня зсувається вгору на крок STEP (лишається смужка з назвою), трохи зменшується
        й темнішає; чим глибше в стопці, тим менша й темніша, тож кожну картку видно окремо.
     Значення пишуться inline щокадру (rAF, passive scroll); при розширенні вікна чи вимкненні руху все скидається. */
  var stackList = document.querySelector('.values');
  if (stackList && window.matchMedia) {
    var stackCards = Array.prototype.slice.call(stackList.children);
    stackCards.forEach(function (el) { var b = el.querySelector('b'); if (b) b.setAttribute('data-t', b.textContent.trim()); });   // назва для смужки покритої картки

    if ('IntersectionObserver' in window) {                                   // безперервні ефекти лише поки блок видно
      new IntersectionObserver(function (e) { stackList.classList.toggle('is-live', e[0].isIntersecting); }, { rootMargin: '80px 0px' }).observe(stackList);
    } else { stackList.classList.add('is-live'); }


    var mqNarrow = window.matchMedia('(max-width: 759px)'), mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    var stackOn = false, queued = false, STEP = 26, pinTop = 0, shiftNow = [];
    var clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
    var measure = function () { pinTop = parseFloat(getComputedStyle(stackCards[0]).top) || 0; };
    var resetCards = function () {
      stackCards.forEach(function (el) { el.style.opacity = ''; el.style.translate = ''; el.style.scale = ''; el.style.filter = ''; el.style.removeProperty('--cov'); });
      shiftNow = [];
    };
    var paint = function () {
      queued = false;
      var vh = window.innerHeight, box = stackList.getBoundingClientRect(), n = stackCards.length, i;
      if (box.bottom < -400 || box.top > vh + 400) return;                    // блок далеко від екрана: нічого не малюємо
      var top = [], h = [], p = [], depth = [];
      for (i = 0; i < n; i++) {                                               // «природна» верхня межа без нашого зсуву по вертикалі
        top[i] = stackCards[i].getBoundingClientRect().top - (shiftNow[i] || 0);
        h[i] = stackCards[i].offsetHeight;
      }
      for (i = 0; i < n - 1; i++) {                                           // наскільки наступна картка вже наїхала на цю (0…1)
        p[i] = clamp((pinTop + 0.9 * h[i] - top[i + 1]) / (0.9 * h[i]), 0, 1);
      }
      p[n - 1] = 0; depth[n - 1] = 0;
      for (i = n - 2; i >= 0; i--) { depth[i] = depth[i + 1] + p[i]; }        // скільки карток лежить поверх цієї
      for (i = 0; i < n; i++) {
        var el = stackCards[i];
        var e = clamp((vh * 0.96 - top[i]) / (vh * 0.4), 0, 1);               // 0 – картка щойно показалась знизу, 1 – зайшла
        var k = 1 - Math.pow(1 - e, 3);                                       // easing out
        var shift = -STEP * depth[i];
        shiftNow[i] = shift;
        el.style.opacity = (0.12 + 0.88 * k).toFixed(3);
        el.style.translate = ((i % 2 === 0 ? -1 : 1) * (1 - k) * 80).toFixed(1) + 'px ' + shift.toFixed(1) + 'px';
        el.style.scale = Math.max(0.88, 1 - 0.02 * depth[i]).toFixed(4);
        el.style.filter = depth[i] > 0.01 ? 'brightness(' + Math.max(0.7, 1 - 0.05 * depth[i]).toFixed(3) + ')' : '';
        el.style.setProperty('--cov', p[i].toFixed(3));
      }
    };
    var schedule = function () { if (stackOn && !queued) { queued = true; requestAnimationFrame(paint); } };
    var sync = function () {
      var want = mqNarrow.matches && !mqReduce.matches;
      if (want === stackOn) { if (stackOn) { measure(); schedule(); } return; }
      stackOn = want;
      stackList.classList.toggle('is-stack', stackOn);
      if (stackOn) { measure(); paint(); } else { resetCards(); }
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', sync);
    if (mqNarrow.addEventListener) { mqNarrow.addEventListener('change', sync); mqReduce.addEventListener('change', sync); }
    sync();
  }

  /* ---------- Жива лінія процесу: іскра й спалахи вузлів грають, лише поки блок у кадрі ---------- */
  var steps = document.querySelector('.steps');
  if (steps && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { steps.classList.toggle('is-live', e[0].isIntersecting); }, { threshold: 0.25 }).observe(steps);
  }

  /* ---------- Крапки під горизонтальними стрічками (демо-приклади, скріни переписки) ---------- */
  function addDots(scroller) {
    var kids = Array.prototype.slice.call(scroller.children);
    if (kids.length < 2) return;
    var dots = document.createElement('div');
    dots.className = 'dots'; dots.setAttribute('aria-hidden', 'true');
    var spans = kids.map(function () { var s = document.createElement('span'); dots.appendChild(s); return s; });
    scroller.parentNode.insertBefore(dots, scroller.nextSibling);
    var ticking = false;
    function update() {
      ticking = false;
      var overflow = scroller.scrollWidth - scroller.clientWidth > 4;
      dots.hidden = !overflow;
      if (!overflow) return;
      var active = 0, best = Infinity;
      kids.forEach(function (k, i) { var d = Math.abs(k.offsetLeft - scroller.offsetLeft - scroller.scrollLeft); if (d < best) { best = d; active = i; } });
      if (scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 2) active = kids.length - 1;   // останній елемент не доходить до лівого краю
      spans.forEach(function (s, i) { s.classList.toggle('is-on', i === active); });
    }
    function queue() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    scroller.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    update();
  }
  document.querySelectorAll('.demos, .shots').forEach(addDots);

  /* ---------- Лайтбокс ---------- */
  var box = document.getElementById('lightbox');
  if (!box || typeof box.showModal !== 'function') return;     // без <dialog> скріни просто лишаються мініатюрами
  var big = box.querySelector('img');
  var closeBtn = box.querySelector('.lightbox__close');
  var opener = null;

  document.querySelectorAll('[data-shot]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      opener = btn;
      big.src = btn.dataset.shot;
      big.alt = btn.dataset.alt || '';
      box.showModal();
      closeBtn.focus();
    });
  });
  closeBtn.addEventListener('click', function () { box.close(); });
  box.addEventListener('click', function (e) { if (e.target === box) box.close(); });     // клік по затемненню
  box.addEventListener('close', function () { big.removeAttribute('src'); if (opener) opener.focus(); });
})();
