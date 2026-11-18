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
