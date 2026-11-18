/* РЕЖИМ ЧЕРГИ: коли ви зайняті проєктами й не встигаєте з першим екраном за 24 години.
   Вимкнено: var QUEUE = null;
   Увімкнути: var QUEUE = { from: '15 грудня', days: '5–7 днів' };   (from: з якої дати берете нові проєкти; days: у який строк після брифу тепер перший екран, одразу з одиницею: «3 дні», «5–7 днів»)
   Що змінюється на сторінці: зʼявляється позначка над заголовком «Нові проєкти беру з …», а всі згадки «24 години» в H1, процесі та формі міняються на ваш строк.
   Що НЕ змінюється (статичні тексти для Google/месенджерів): title, description, og-заголовок, розмітка JSON-LD, llms.txt: якщо черга надовго, поправте їх вручну.
   Подивитись, як це виглядає, без правки файлу: на локальному сервері відкрийте http://localhost:5173/?queue (на pryhonov.com цей параметр не діє).
   Рекламу й її тексти цей режим не зачіпає. Після зміни файлу його треба опублікувати. Скрипт підключено ПЕРЕД hero.js, щоб заголовок змінився до анімації. */
(function () {
  'use strict';
  var QUEUE = null;
  /* Перегляд без зміни файлу: лише на локальному сервері відкрийте /?queue (дата й строк у прикладі нижче) */
  if (!QUEUE && /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]queue(=|&|$)/.test(location.search)) QUEUE = { from: '15 грудня', days: '5–7 днів' };
  if (!QUEUE) return;

  function nb(s) { return String(s).replace(/ /g, ' '); }                       // нерозривні пробіли: «5–7 днів» і «15 грудня» не рвуться між рядками
  function fill(t) { return t.replace(/\{from\}/g, nb(QUEUE.from)).replace(/\{days\}/g, nb(QUEUE.days)); }

  Array.prototype.forEach.call(document.querySelectorAll('[data-queue-text]'), function (el) {
    el.textContent = fill(el.getAttribute('data-queue-text'));
  });

  var badge = document.getElementById('queueBadge');
  if (badge) { badge.textContent = fill('Нові проєкти беру з {from}'); badge.hidden = false; }
  document.documentElement.setAttribute('data-queue', '');
})();
