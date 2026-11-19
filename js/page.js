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
      var a1 = document.createElement('a'); a1.className = 'btn btn--primary'; a1.href = '/?tariff=' + t.q + '#contact'; a1.textContent = 'Отримати перший екран'; a1.setAttribute('data-track', 'quiz_cta');
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
