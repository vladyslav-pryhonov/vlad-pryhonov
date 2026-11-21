/* ==========================================================================
   site.js – єдиний вибір тарифу (hero, ціни, форма), відео-слот, форма (2 кроки), cookie-згода, аналітика, політика.
   Заявки й трекери працюють ТІЛЬКИ на бойовому домені (pryhonov.com): на localhost і прев'ю нічого не відправляється
   у Google-таблицю й не вантажить GA4/Pixel, щоб тестові дії не потрапляли в реальні дані.
   ========================================================================== */
(function () {
  'use strict';

  var CFG = {
    sheetUrl: 'https://script.google.com/macros/s/AKfycbzF9lsNCDppQI-03AsQU4n56pEgTUqyR02T31PdS9VlZsVa7Yj5fvM1t9A9e_IlVnwW/exec',
    telegram: 'vvladdos_ik',
    ga4: 'G-HC06J6SL8W',
    pixel: '4639720499582370',
    youtube: ''                       // ID ролика для блоку «Про мене»; порожньо – слот вимкнений
  };
  var IS_PROD = /(^|\.)pryhonov\.com$/.test(location.hostname);
  var root = document.documentElement;
  var loadedAt = Date.now();
  var $ = function (id) { return document.getElementById(id); };

  function store(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* приватний режим */ } }
  function read(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }

  /* ---------- UTM і джерело (перший дотик зберігається на сесію) ---------- */
  (function captureSource() {
    if (read('src')) return;
    var q = new URLSearchParams(location.search), keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid'], parts = [];
    keys.forEach(function (k) { if (q.get(k)) parts.push(k + '=' + q.get(k)); });
    if (document.referrer) parts.push('ref=' + document.referrer);
    store('src', parts.join('; '));
  })();

  /* ---------- Тариф: єдиний вибір для hero, блока цін і форми ----------
     За замовчуванням нічого не обрано (null): у заявку йде «не обрано», а не вгаданий тариф.
     Hero-картки (radio), кнопки «Обрати» в цінах і перемикач у формі лише відображають цей стан.
     Повторний клік по обраному (у hero, цінах чи формі) знімає вибір. */
  var TARIFFS = { personal: 'Особистий', fast: 'Швидкий' };
  var tariff = null;
  var heroRadios = document.querySelectorAll('input[name="tariff"]');
  var plans = document.querySelectorAll('.plan[data-plan]');
  var picks = document.querySelectorAll('[data-pick]');
  function setTariff(v) {
    tariff = TARIFFS[v] ? v : null;
    if (tariff) root.setAttribute('data-tariff', tariff); else root.removeAttribute('data-tariff');
    if (tariff) store('tariff', tariff); else { try { sessionStorage.removeItem('tariff'); } catch (e) { /* приватний режим */ } }
    heroRadios.forEach(function (r) { r.checked = r.value === tariff; });
    plans.forEach(function (p) { p.classList.toggle('is-selected', p.dataset.plan === tariff); });
    picks.forEach(function (b) {
      var on = b.dataset.pick === tariff;
      b.setAttribute('aria-pressed', String(on));
      if (b.classList.contains('plan__pick')) b.textContent = on ? 'Тариф обрано' : 'Обрати цей тариф';
    });
  }
  heroRadios.forEach(function (r) { r.addEventListener('click', function () { setTariff(tariff === r.value ? null : r.value); }); });   // radio сам не знімається: повторний клік знімає вибір вручну
  picks.forEach(function (b) { b.addEventListener('click', function () { setTariff(tariff === b.dataset.pick ? null : b.dataset.pick); }); });
  setTariff(read('tariff'));
  /* Перехід зі сторінок тарифів (/?tariff=fast#contact): тариф уже обрано, у формі й заявці він збережеться */
  (function tariffFromUrl() {
    var q = new URLSearchParams(location.search).get('tariff');
    if (q && TARIFFS[q]) setTariff(q);
  })();
  function tariffName() { return tariff ? TARIFFS[tariff] : 'не обрано'; }

  /* ---------- Відео-звернення (вмикається, коли з'явиться ролик) ---------- */
  var frame = $('aboutVideo');
  var videoId = frame && (frame.dataset.youtube || CFG.youtube);
  if (frame && videoId) {
    var play = frame.querySelector('.about__play');
    play.hidden = false;
    play.addEventListener('click', function () {
      frame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(videoId) + '?autoplay=1&rel=0" title="Відео-звернення" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>';
      track('video_play');
    });
  }

  /* ---------- Спільний фон форми й підвалу: фон завжди сягає низу підвалу (висота підвалу залежить від ширини екрана й кількості посилань) ---------- */
  (function footerBg() {
    var foot = document.querySelector('.footer');
    if (!foot || !document.querySelector('.finale__bg')) return;
    function sync() { root.style.setProperty('--footer-real', Math.ceil(foot.getBoundingClientRect().height) + 'px'); }
    sync();
    window.addEventListener('resize', sync);
    window.addEventListener('load', sync);
    if ('ResizeObserver' in window) new ResizeObserver(sync).observe(foot);
  })();

  /* ---------- Плаваюча кнопка Telegram, фон форми, висота cookie-банера ---------- */
  (function floating() {
    var tg = $('tgFloat'), heroEl = document.querySelector('.hero'), contactEl = $('contact'), bar = $('cookieBar');
    var heroOut = false, contactIn = false;
    function upd() { if (tg) tg.classList.toggle('is-on', heroOut && !contactIn); }
    if ('IntersectionObserver' in window) {
      if (heroEl) new IntersectionObserver(function (e) { heroOut = e[0].intersectionRatio < 0.2; upd(); }, { threshold: [0, 0.2, 1] }).observe(heroEl);
      if (contactEl) new IntersectionObserver(function (e) {
        contactIn = e[0].isIntersecting && e[0].intersectionRatio > 0.15;
        contactEl.classList.toggle('is-live', e[0].isIntersecting);            // анімації фону грають, лише поки блок видно
        upd();
      }, { threshold: [0, 0.15, 0.5] }).observe(contactEl);
    }
    function syncCookie() { root.style.setProperty('--cookie-h', bar.hidden ? '0px' : (bar.offsetHeight + 16) + 'px'); }
    if (bar) { new MutationObserver(syncCookie).observe(bar, { attributes: true, attributeFilter: ['hidden'] }); window.addEventListener('resize', syncCookie); syncCookie(); }
  })();

  /* ---------- Аналітика і cookie-згода ---------- */
  function track(name, extra) {
    if (window.gtag) window.gtag('event', name, extra || {});
    if (window.fbq) window.fbq('trackCustom', name);
  }
  document.querySelectorAll('[data-track]').forEach(function (el) {
    el.addEventListener('click', function () { track(el.getAttribute('data-track')); });
  });

  (function consent() {
    var KEY = 'cookieConsent', bar = $('cookieBar');
    function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
    function set(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* приватний режим */ } }
    function loadTrackers() {
      if (!IS_PROD || window.__trackers) return;
      window.__trackers = true;
      var s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + CFG.ga4; document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date()); window.gtag('config', CFG.ga4);
      !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', CFG.pixel); window.fbq('track', 'PageView');
    }
    var c = get();
    if (c === 'accepted') loadTrackers();
    else if (c !== 'declined') setTimeout(function () { bar.hidden = false; }, 800);
    $('cookieAccept').addEventListener('click', function () { set('accepted'); bar.hidden = true; loadTrackers(); });
    $('cookieDecline').addEventListener('click', function () { set('declined'); bar.hidden = true; });
  })();

  /* ---------- Код країни з прапором (власний випадаючий список: емодзі-прапори не відображаються на Windows) ---------- */
  (function countryCode() {
    var btn = $('ccBtn'), list = $('ccList'); if (!btn || !list) return;
    var opts = Array.prototype.slice.call(list.querySelectorAll('[role="option"]')), idx = 0;
    function open(o) {
      list.hidden = !o; btn.setAttribute('aria-expanded', String(o));
      if (o) { idx = Math.max(0, opts.findIndex(function (x) { return x.getAttribute('aria-selected') === 'true'; })); list.focus(); mark(); }
    }
    opts.forEach(function (x, i) { x.id = 'ccOpt' + i; });
    function mark() {
      opts.forEach(function (x, i) { x.style.background = i === idx ? 'var(--forest-raised)' : ''; });
      list.setAttribute('aria-activedescendant', opts[idx].id);           // скрінрідер озвучує підсвічену країну
    }
    function pick(li) {
      opts.forEach(function (x) { x.setAttribute('aria-selected', String(x === li)); });
      $('fPhoneCode').value = li.dataset.code; $('ccCode').textContent = li.dataset.code;
      $('ccFlag').className = 'flag flag--' + li.dataset.flag;
      open(false); btn.focus();
    }
    btn.addEventListener('click', function () { open(list.hidden); });
    opts.forEach(function (li) { li.addEventListener('click', function () { pick(li); }); });
    list.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { open(false); btn.focus(); }
      else if (e.key === 'Tab') { open(false); }                 // фокус іде далі, список не лишається висіти відкритим
      else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); idx = e.key === 'Home' ? 0 : opts.length - 1; mark(); opts[idx].scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); idx = Math.min(opts.length - 1, idx + 1); mark(); opts[idx].scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(0, idx - 1); mark(); opts[idx].scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(opts[idx]); }
    });
    document.addEventListener('click', function (e) { if (!list.hidden && !$('cc').contains(e.target)) open(false); });
  })();

  /* ---------- Відправка (лише бойовий домен) ---------- */
  function cookie(name) { var m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)')); return m ? m[2] : ''; }
  function send(payload) {
    payload.userAgent = navigator.userAgent;
    payload.fbp = cookie('_fbp'); payload.fbc = cookie('_fbc');
    try { payload.analytics = localStorage.getItem('cookieConsent') === 'accepted'; } catch (e) { payload.analytics = false; }   // згода на рекламну аналітику: сервер за нею вирішує, чи слати Lead у Meta CAPI
    if (!IS_PROD) { console.info('[dev] заявка НЕ відправлена (не бойовий домен):', payload); return; }
    fetch(CFG.sheetUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) }).catch(function () { /* без блокування UI */ });
  }
  function source() { return read('src') || 'пряме відвідування'; }              // utm-мітки першого візиту або «пряме відвідування»
  function context() { return 'Тариф: ' + tariffName() + '; ' + source() + '; сторінка: ' + location.pathname; }   // те саме одним рядком: для сумісності зі старою версією скрипта (нова бере окремі поля)

  /* ---------- Крок 1: контакт ---------- */
  var form = $('leadForm'), lead = null;
  function validTelegram(v) { return /^@?[a-zA-Z0-9_]{4,32}$/.test(v); }           // 32 – максимум юзернейма в Telegram; збігається з перевіркою на сервері
  var PHONE_MAX = 10;                                                                  // у полі лише національний номер: не більше 10 цифр (097…, 971234567)
  function validPhone(v) { var n = (v.match(/\d/g) || []).length; return n >= 6 && n <= PHONE_MAX && !/[^\d\s()+\-]/.test(v); }
  /* Під час введення й вставки лишає тільки цифри, знімає вже вписаний код країни (+380…, 380…) і обрізає до 10 цифр */
  function cleanPhoneInput(raw, code) {
    var d = raw.replace(/\D/g, ''), cd = code.replace(/\D/g, '');
    if (d.indexOf(cd) === 0 && (/^\s*\+/.test(raw) || d.length > PHONE_MAX)) d = d.slice(cd.length);
    return d.slice(0, PHONE_MAX);
  }
  /* Міжнародний вигляд: люди пишуть 097…, +380 97… або 380 97… – у всіх випадках має вийти +380971234567, а не +3800971234567 чи +380380971234567 */
  var TRUNK0 = { '+380': 1, '+44': 1, '+49': 1 };       // країни зі стартовим 0 у національному номері
  function normalizePhone(code, raw) {
    var d = raw.replace(/\D/g, ''), cd = code.replace(/\D/g, '');
    if (!d) return '';
    if ((/^\s*\+/.test(raw) || d.length >= cd.length + 9) && d.indexOf(cd) === 0) d = d.slice(cd.length);   // код країни вже вписано
    if (TRUNK0[code] && d.charAt(0) === '0') d = d.slice(1);
    return code + d;
  }
  function checkContact() {
    var tg = $('fTelegram'), ph = $('fPhone'), err = $('fContactError');
    var tv = tg.value.trim(), pv = ph.value.trim(), msg = '';
    var tgBad = tv && !validTelegram(tv), phBad = pv && !validPhone(pv);
    if (!tv && !pv) msg = 'Вкажіть Telegram або телефон для зв\'язку';
    else if (phBad) msg = /[^\d\s()+\-]/.test(pv) ? 'Перевірте номер телефону: мають бути лише цифри' : ((pv.match(/\d/g) || []).length > 13 ? 'Номер занадто довгий: перевірте, чи немає зайвих цифр' : 'Номер занадто короткий: перевірте, чи всі цифри вписані');
    else if (tgBad) msg = 'Перевірте Telegram: схоже, юзернейм неповний';
    tg.setAttribute('aria-invalid', (tgBad || (!tv && !pv)) ? 'true' : 'false'); ph.setAttribute('aria-invalid', (phBad || (!tv && !pv)) ? 'true' : 'false');
    err.textContent = msg;
    return !msg;
  }
  if (form) {
    $('fPhone').addEventListener('input', function () {
      var c = cleanPhoneInput(this.value, $('fPhoneCode').value);
      if (c !== this.value) this.value = c;
    });
    ['fTelegram', 'fPhone'].forEach(function (id) {
      $(id).addEventListener('blur', checkContact);
      $(id).addEventListener('input', function () { if ($('fContactError').textContent) checkContact(); });
    });
    $('fConsent').addEventListener('change', function () { $('fConsentError').textContent = ''; });

    /* Мобільний перемикач контакту «Telegram | Телефон»: показує одне поле, друге при перемиканні очищається
       (щоб у прихованому полі не лишилось значення, яке користувач не бачить). Від 760 px CSS показує обидва поля. */
    var cpair = $('contactPair');
    if (cpair) {
      cpair.querySelectorAll('[data-cmode]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var mode = btn.getAttribute('data-cmode');
          if (cpair.getAttribute('data-mode') === mode) return;
          cpair.setAttribute('data-mode', mode);
          cpair.querySelectorAll('[data-cmode]').forEach(function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
          var other = $(mode === 'tg' ? 'fPhone' : 'fTelegram'), shown = $(mode === 'tg' ? 'fTelegram' : 'fPhone');
          other.value = ''; other.setAttribute('aria-invalid', 'false'); $('fContactError').textContent = '';
          shown.focus();
        });
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var okContact = checkContact();
      var okConsent = $('fConsent').checked;
      $('fConsentError').textContent = okConsent ? '' : 'Потрібна згода на обробку даних, щоб відправити заявку';
      if (!okContact) { ($('fTelegram').offsetParent === null ? $('fPhone') : $('fTelegram')).focus(); return; }   // на мобільному Telegram-поле може бути сховане перемикачем
      if (!okConsent) { $('fConsent').focus(); return; }

      var tooFast = Date.now() - loadedAt < 3000, tries = +(read('leadTries') || 0);
      var bot = ($('fWebsite').value.trim() !== '') || tooFast || tries >= 3;      // honeypot, надто швидко, забагато спроб
      store('leadTries', String(tries + 1));

      var name = $('fName').value.trim(), tg = $('fTelegram').value.trim();
      var phone = normalizePhone($('fPhoneCode').value, $('fPhone').value);
      var eventId = 'lead_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
      lead = { name: name, telegram: tg, phone: phone, eventId: eventId };

      if (!bot) {
        send({ step: 1, name: name, telegram: tg, phone: phone, tariff: tariffName(), source: source(), message: context(), eventId: eventId });
        if (window.fbq) window.fbq('track', 'Lead', tariff ? { content_name: TARIFFS[tariff] } : {}, { eventID: eventId });
        if (window.gtag) window.gtag('event', 'generate_lead', { tariff: tariff || 'not_selected' });
      }

      var text = 'Нова заявка з сайту' + (name ? '\nІм\'я: ' + name : '') + (tg ? '\nTelegram: ' + tg : '') + (phone ? '\nТелефон: ' + phone : '');
      $('thanksTelegram').href = 'https://t.me/' + CFG.telegram + '?text=' + encodeURIComponent(text);
      form.hidden = true;
      var thanks = $('thanks'); thanks.hidden = false; thanks.focus();
    });
  }

  /* ---------- Крок 2: необов'язкові уточнення ---------- */
  var details = $('detailsForm');
  if (details) {
    details.querySelectorAll('.chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var g = chip.dataset.group, on = chip.getAttribute('aria-pressed') !== 'true';
        if (g) details.querySelectorAll('.chip[data-group="' + g + '"]').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
        chip.setAttribute('aria-pressed', String(on));
        if (chip.id === 'chipOther') { $('nicheOtherWrap').hidden = !on; if (on) $('fNicheOther').focus(); }
      });
    });
    details.addEventListener('submit', function (e) {
      e.preventDefault();
      var niche = [], ads = '';
      details.querySelectorAll('.chip[aria-pressed="true"]').forEach(function (c) {
        if (c.dataset.group === 'ads') ads = c.textContent;
        else niche.push(c.id === 'chipOther' ? ($('fNicheOther').value.trim() || 'Інше') : c.textContent);
      });
      var link = $('fLink').value.trim();
      if (!niche.length && !link && !ads) return;
      send({ step: 2, name: lead ? lead.name : '', telegram: lead ? lead.telegram : '', phone: lead ? lead.phone : '', tariff: tariffName(), source: source(), business: niche.join(', '), ads: ads, link: link, message: 'Уточнення (крок 2). Реклама: ' + (ads || 'не вказано') + '; сайт/соцмережі: ' + (link || 'не вказано') + '; ' + context(), eventId: lead ? lead.eventId : '' });
      track('lead_details');
      details.hidden = true; $('detailsDone').hidden = false;
    });
  }
})();
