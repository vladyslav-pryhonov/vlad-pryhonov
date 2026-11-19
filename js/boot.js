/* boot.js – те саме, що inline-скрипт у <head> головної, але зовнішнім файлом (на внутрішніх сторінках CSP без inline-скриптів).
   Підключається синхронно в <head>, щоб клас .js з'явився до першого малювання. */
(function () {
  'use strict';
  /* Анти-фреймінг (захист від clickjacking: заголовка X-Frame-Options на GitHub Pages нема) */
  if (window.top !== window.self) { try { window.top.location.href = window.self.location.href; } catch (e) { document.documentElement.style.display = 'none'; } }
  /* .js вмикає початкові стани анімацій появи; якщо js/case.js не завантажився – через 6 с усе показується */
  var root = document.documentElement;
  root.classList.add('js');
  setTimeout(function () { root.classList.add('ready'); }, 2500);
  setTimeout(function () { root.classList.add('reveal-fallback'); }, 6000);
})();
