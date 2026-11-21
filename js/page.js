/* ==========================================================================
   page.js – внутрішні сторінки: шапка (стан при прокрутці, мобільне меню) і тест «який тариф підходить».
   Поява блоків при прокрутці – js/case.js, cookie й аналітика – js/site.js (ті самі файли, що на головній).
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Шапка ---------- */
  var header = document.getElementById('header');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    var burger = document.getElementById('burger'), menu = document.getElementById('mobileMenu');
    if (burger && menu) {
      var setMenu = function (open) {
        burger.setAttribute('aria-expanded', String(open));
        burger.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
        menu.hidden = !open;
        header.classList.toggle('is-open', open);
      };
      burger.addEventListener('click', function () { setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
      menu.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
      window.matchMedia('(min-width: 900px)').addEventListener && window.matchMedia('(min-width: 900px)').addEventListener('change', function (e) { if (e.matches) setMenu(false); });
    }
  }

  /* ---------- Живий фон hero: анімація (решітка, хвилі, промінь по специфікації) грає, лише поки hero у кадрі ---------- */
  var phero = document.querySelector('.phero');
  if (phero) {
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { phero.classList.toggle('is-live', e[0].isIntersecting); }, { threshold: 0.05 }).observe(phero);
    } else { phero.classList.add('is-live'); }
  }

  /* ---------- Візуальні «підписи» сторінок: цикли грають, лише поки блок у кадрі; лічильник і нахил пристроїв ---------- */
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var liveEls = document.querySelectorAll('[data-live]');
  function countUp(el) {
    var to = parseFloat(el.getAttribute('data-count-to')), t0 = null, dur = 1500;
    if (!isFinite(to) || reduce) return;
    el.textContent = '0';
    function step(ts) {
      if (t0 === null) t0 = ts;
      var k = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = String(Math.round(to * e));
      if (k < 1) requestAnimationFrame(step); else el.textContent = String(to);
    }
    requestAnimationFrame(step);
  }
  if (liveEls.length) {
    if ('IntersectionObserver' in window) {
      var counted = new WeakSet();
      var lio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          e.target.classList.toggle('is-live', e.isIntersecting);
          if (e.isIntersecting && !counted.has(e.target)) { counted.add(e.target); e.target.querySelectorAll('[data-count-to]').forEach(countUp); }
        });
      }, { threshold: 0.2 });
      liveEls.forEach(function (el) { lio.observe(el); });
    } else { liveEls.forEach(function (el) { el.classList.add('is-live'); }); }
  }
  if (!reduce && window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('[data-tilt]').forEach(function (box) {
      var tilt = box.querySelector('.dev__tilt'), raf = 0, px = 0.5, py = 0.5;
      if (!tilt) return;
      function paint() { raf = 0; tilt.style.setProperty('--ry', ((px - 0.5) * 9).toFixed(2) + 'deg'); tilt.style.setProperty('--rx', ((0.5 - py) * 6).toFixed(2) + 'deg'); }
      box.addEventListener('pointermove', function (e) { var r = box.getBoundingClientRect(); px = (e.clientX - r.left) / r.width; py = (e.clientY - r.top) / r.height; if (!raf) raf = requestAnimationFrame(paint); });
      box.addEventListener('pointerleave', function () { px = 0.5; py = 0.5; if (!raf) raf = requestAnimationFrame(paint); });
    });
  }

  /* ---------- Тариф за замовчуванням у формі: сторінка тарифу → її тариф (site.js читає sessionStorage.tariff при старті) ---------- */
  var contactEl = document.getElementById('contact');
  var defTariff = contactEl && contactEl.getAttribute('data-tariff-default');
  if (defTariff === 'fast' || defTariff === 'personal') {
    try { sessionStorage.setItem('tariff', defTariff); } catch (e) { /* приватний режим */ }
  }

  /* ---------- Тест вибору тарифу (сторінка «Скільки коштує сайт») ----------
     Три питання. Магазин із оплатою → «Особистий» (його збираю на готовій платформі). Інакше більшість відповідей, а при рівності вирішує пріоритет. */
  var quiz = document.getElementById('quiz');
  if (quiz) {
    var answers = {}, result = document.getElementById('quizResult');
    var render = function () {
      if (!(answers.edit && answers.shop && answers.goal)) { result.hidden = true; return; }
      var personal = (answers.edit === 'self') + (answers.goal === 'freedom'), fast = (answers.edit === 'me') + (answers.goal === 'speed');
      var pick = answers.shop === 'yes' ? 'personal' : (personal > fast ? 'personal' : (fast > personal ? 'fast' : (answers.goal === 'freedom' ? 'personal' : 'fast')));
      var t = {
        fast: { name: 'Швидкий', price: 'від $600 за лендінг, від $1000 за сайт від 5 сторінок', text: 'Код і AI-інструменти прискорюють роботу, а кожен блок перевіряю я. Запуск від 7 днів, ціль 85+ у PageSpeed на мобільному. Дрібні правки після здачі роблю я.', href: '/shvydkyi-tarif/', q: 'fast' },
        personal: { name: 'Особистий', price: 'від $800 за лендінг, від $1300 за сайт від 5 сторінок', text: 'Вручну збираю сайт на платформі-конструкторі, а ви самі змінюєте тексти, ціни й фото. Запуск від 14 днів. Магазин із оплатою збираю на готовій платформі, швидкість залежить від обраної платформи.', href: '/osobystyi-tarif/', q: 'personal' }
      }[pick];
      var note = '';
      if (answers.shop === 'yes') note = 'Інтернет-магазин із онлайн-оплатою не входить у базову ціну: платформу, підписки й обсяг обговорюємо окремо після брифу.';
      else if (pick === 'personal' && answers.goal === 'speed') note = 'Ви обрали швидкість, але хочете керувати сайтом самі: на конструкторі швидкість залежить від платформи. Якщо швидкість важливіша, розгляньте «Швидкий».';
      else if (pick === 'fast' && answers.edit === 'self') note = 'Ви хочете редагувати самі: на «Швидкому» дрібні правки роблю я. Якщо вам потрібна самостійність, розгляньте «Особистий».';
      result.innerHTML = '';
      var title = document.createElement('b'); title.textContent = 'Вам підходить тариф «' + t.name + '»'; result.appendChild(title);
      var price = document.createElement('p'); price.className = 'quiz__price'; price.textContent = t.price; result.appendChild(price);
      var p = document.createElement('p'); p.textContent = t.text; result.appendChild(p);
      if (note) { var n = document.createElement('p'); n.textContent = note; result.appendChild(n); }
      var act = document.createElement('div'); act.className = 'pactions';
      var a1 = document.createElement('a'); a1.className = 'btn btn--primary'; a1.href = '#contact'; a1.textContent = 'Отримати перший екран'; a1.setAttribute('data-track', 'quiz_cta');
      a1.addEventListener('click', function () {                      // форма на цій самій сторінці: вмикаємо рекомендований тариф у перемикачі форми
        var btn = document.querySelector('.tpick [data-pick="' + t.q + '"]');
        if (btn && btn.getAttribute('aria-pressed') !== 'true') btn.click();
      });
      var a2 = document.createElement('a'); a2.className = 'plink'; a2.href = t.href; a2.textContent = 'Докладніше про тариф';
      act.appendChild(a1); act.appendChild(a2); result.appendChild(act);
      result.hidden = false;
    };
    quiz.querySelectorAll('fieldset[data-q]').forEach(function (fs) {
      var key = fs.getAttribute('data-q');
      fs.querySelectorAll('button[data-v]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          answers[key] = btn.getAttribute('data-v');
          fs.querySelectorAll('button[data-v]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
          render();
        });
      });
    });
  }
})();
