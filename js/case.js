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

  /* ---------- Мобільна стопка карток «Що ви отримуєте» ----------
     На вузькому екрані (і якщо рух дозволено) .values отримує клас .is-stack: CSS робить кожну картку sticky зі зсувом, тож картки
     по черзі «прилипають» зверху й лишаються стопкою. Тут за позицією на екрані рахується решта:
     1) виїзд: поки картка заходить знизу, вона з'їжджається з боку (непарні зліва, парні справа) і проявляється;
     2) прогортування: коли наступна картка наїжджає, попередня трохи зменшується (до 95%) і затемнюється.
     Значення пишуться inline щокадру (rAF, passive scroll); при розширенні вікна чи вимкненні руху все скидається. */
  var stackList = document.querySelector('.values');
  if (stackList && window.matchMedia) {
    var mqNarrow = window.matchMedia('(max-width: 759px)'), mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    var stackCards = Array.prototype.slice.call(stackList.children), stuckTop = [], stackOn = false, queued = false, PEEK = 14;
    var clamp = function (v, a, b) { return v < a ? a : (v > b ? b : v); };
    var measure = function () { stuckTop = stackCards.map(function (el) { return parseFloat(getComputedStyle(el).top) || 0; }); };
    var resetCards = function () { stackCards.forEach(function (el) { el.style.opacity = ''; el.style.translate = ''; el.style.scale = ''; el.style.filter = ''; }); };
    var paint = function () {
      queued = false;
      var vh = window.innerHeight, box = stackList.getBoundingClientRect();
      if (box.bottom < -300 || box.top > vh + 300) return;                  // блок далеко від екрана: нічого не малюємо
      for (var i = 0; i < stackCards.length; i++) {
        var el = stackCards[i], r = el.getBoundingClientRect();
        var e = clamp((vh * 0.96 - r.top) / (vh * 0.4), 0, 1);               // 0 – картка щойно показалась знизу, 1 – зайшла
        var k = 1 - Math.pow(1 - e, 3);                                       // easing out
        var p = 0;
        if (i < stackCards.length - 1) {                                      // наскільки наступна картка вже наїхала на цю
          var next = stackCards[i + 1].getBoundingClientRect().top;
          p = clamp(1 - (next - (stuckTop[i] + PEEK)) / (r.height * 0.9), 0, 1);
        }
        el.style.opacity = (0.12 + 0.88 * k).toFixed(3);
        el.style.translate = ((i % 2 === 0 ? -1 : 1) * (1 - k) * 80).toFixed(1) + 'px 0';
        el.style.scale = (1 - 0.05 * p).toFixed(4);
        el.style.filter = p > 0.01 ? 'brightness(' + (1 - 0.42 * p).toFixed(3) + ')' : '';
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
