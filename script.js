// ===== ЗАМІНІТЬ на ваш реальний юзернейм Telegram =====
const TELEGRAM_USERNAME = "vvladdos_ik";
// Google Apps Script Web App URL – інструкція внизу чату, як отримати цей URL.
const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbxvADnyHIDhS3rH3TJK4eck-l9Vn7z7pefN9lXNY4-gKVdYQ9t61Dn16hX3YDrsXsp4/exec";

// показати більше кейсів
function toggleMoreCases(){
  const wrap = document.getElementById('moreCasesWrap');
  const row = document.getElementById('moreCasesRow');
  const label = document.getElementById('moreCasesLabel');
  const arrow = document.getElementById('moreCasesArrow');
  const expanding = !wrap.classList.contains('expanded');

  if (expanding){
    wrap.style.maxHeight = wrap.scrollHeight + 'px';
    wrap.classList.add('expanded');
  } else {
    // спершу фіксуємо поточну висоту числом, щоб transition стартував коректно
    wrap.style.maxHeight = wrap.scrollHeight + 'px';
    void wrap.offsetHeight; // форсуємо reflow
    wrap.style.maxHeight = '0px';
    wrap.classList.remove('expanded');
    // скролимо до кнопки лише після завершення анімації згортання,
    // інакше ціль скролу "їде" разом з контентом, що й давало глюк
    wrap.addEventListener('transitionend', function onCollapseEnd(e){
      if (e.propertyName === 'max-height'){
        wrap.removeEventListener('transitionend', onCollapseEnd);
        row.scrollIntoView({behavior:'smooth', block:'center'});
      }
    });
  }

  label.textContent = expanding ? 'Сховати кейси' : 'Більше кейсів';
  arrow.style.transform = expanding ? 'rotate(180deg)' : 'rotate(0deg)';
}

// перемикач тарифів (Особистий / Швидкий)
function showTariff(key){
  const panels = {personal: document.getElementById('tariffPersonal'), fast: document.getElementById('tariffFast')};
  const btns = {personal: document.getElementById('tabPersonalBtn'), fast: document.getElementById('tabFastBtn')};
  Object.keys(panels).forEach(k => {
    if (!panels[k] || !btns[k]) return;
    panels[k].classList.toggle('active', k === key);
    btns[k].classList.toggle('active', k === key);
  });
}

// слайдер відгуків (автоматично адаптується до кількості слайдів)
(function initTestimonialSlider(){
  const slider = document.querySelector('.testimonial-slider');
  const track = document.getElementById('testimonialTrack');
  const dotsWrap = document.getElementById('testimonialDots');
  const prevBtn = document.getElementById('testimonialPrev');
  const nextBtn = document.getElementById('testimonialNext');
  if (!track || !dotsWrap || !slider) return;
  const slides = Array.from(track.children);
  if (slides.length <= 1) {
    if (prevBtn) prevBtn.classList.add('hidden');
    if (nextBtn) nextBtn.classList.add('hidden');
    return; // один слайд – навігація не потрібна
  }
  dotsWrap.classList.remove('hidden');
  let current = 0;
  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'testimonial-dot' + (i === 0 ? ' active' : '');
    dot.setAttribute('aria-label', 'Слайд ' + (i + 1));
    dot.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(dot);
  });
  function isDesktop(){ return window.matchMedia('(min-width: 901px)').matches; }
  // на десктопі кожен слайд трохи вужчий за видиму область – це дає "підглядання"
  // сусідніх слайдів по краях; на мобільному слайд лишається на всю ширину (без змін)
  function applyDesktopSizing(){
    if (!isDesktop()) {
      slides.forEach(s => { s.style.width = ''; s.style.marginRight = ''; });
      return;
    }
    const sliderWidth = slider.getBoundingClientRect().width;
    const itemWidth = Math.min(720, sliderWidth * 0.82);
    slides.forEach(s => {
      s.style.width = itemWidth + 'px';
      s.style.marginRight = '24px';
    });
  }
  function syncActiveClass(){
    slides.forEach((s, idx) => s.classList.toggle('active-slide', idx === current));
  }
  // позиція треку рахується по РЕАЛЬНИХ координатах активного слайда (offsetLeft),
  // а не за формулою "i * 100%" – так воно лишається коректним і на десктопі (де
  // слайди вужчі за контейнер, з відступами) і на мобільному (де слайд = 100% ширини)
  function positionTrack(){
    const item = slides[current];
    if (isDesktop()) {
      const sliderWidth = slider.getBoundingClientRect().width;
      const offset = sliderWidth / 2 - (item.offsetLeft + item.offsetWidth / 2);
      track.style.transform = 'translateX(' + offset + 'px)';
    } else {
      track.style.transform = 'translateX(-' + (current * 100) + '%)';
    }
  }
  function goTo(i){
    current = i;
    syncActiveClass();
    positionTrack();
    Array.from(dotsWrap.children).forEach((d, idx) => d.classList.toggle('active', idx === current));
  }
  if (prevBtn) prevBtn.addEventListener('click', () => goTo((current - 1 + slides.length) % slides.length));
  if (nextBtn) nextBtn.addEventListener('click', () => goTo((current + 1) % slides.length));
  applyDesktopSizing();
  syncActiveClass();
  positionTrack();
  window.addEventListener('resize', () => { applyDesktopSizing(); positionTrack(); });
  // свайп на мобільному
  let startX = 0;
  track.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, {passive:true});
  track.addEventListener('touchend', e => {
    const diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) < 40) return;
    if (diff < 0 && current < slides.length - 1) goTo(current + 1);
    if (diff > 0 && current > 0) goTo(current - 1);
  }, {passive:true});
})();

// лайтбокс – збільшення скріншотів переписки по кліку
(function initLightbox(){
  const overlay = document.getElementById('lightboxOverlay');
  const imgEl = document.getElementById('lightboxImg');
  const closeBtn = document.getElementById('lightboxClose');
  if (!overlay || !imgEl) return;
  function open(src, alt){
    imgEl.src = src;
    imgEl.alt = alt || '';
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function close(){
    overlay.classList.remove('show');
    document.body.style.overflow = '';
    imgEl.src = '';
  }
  document.querySelectorAll('.testimonial-card .screenshot-wrap').forEach(wrap => {
    const img = wrap.querySelector('.testimonial-screenshot');
    wrap.addEventListener('click', () => open(img.src, img.alt));
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
})();

// мобільне меню
const burgerBtn = document.getElementById('burgerBtn');
const mobileMenu = document.getElementById('mobileMenu');
burgerBtn.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('open');
  burgerBtn.classList.toggle('open', isOpen);
  burgerBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
});
mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    burgerBtn.classList.remove('open');
    burgerBtn.setAttribute('aria-expanded', 'false');
  });
});

// header scroll state
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 10);
});

// reveal on scroll
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.12 });
revealEls.forEach(el => io.observe(el));

// animated stat counters
const statEls = document.querySelectorAll('.stat .num');
const statIo = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = parseInt(el.dataset.count, 10);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const start = performance.now();
    const dur = 900;
    function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      const val = Math.round(target * (1 - Math.pow(1 - p, 3)));
      el.textContent = prefix + val + suffix;
      if (p < 1) requestAnimationFrame(tick); else el.textContent = prefix + target + suffix;
    }
    requestAnimationFrame(tick);
    statIo.unobserve(el);
  });
}, { threshold: 0.5 });
statEls.forEach(el => statIo.observe(el));

// hero mockup: циклічна демонстрація різних прикладів бізнесу (доки користувач сам не почне редагувати)
const demoExamples = [
  { tag: 'СТУДІЯ РЕМОНТУ', title: 'Ремонт квартир під ключ', titleShort: 'Ремонт квартир', price: 'від $1 200', btn: 'Залишити заявку',
    media: 'linear-gradient(135deg,#0d2b2e,#127A46 55%,#0f3b52)', accent: '#E2571C',
    font: 'var(--font-display)', weight: '700', tracking: '-0.01em',
    icon: '<svg viewBox="0 0 100 100"><path d="M10 55 L50 20 L90 55 M20 50 V85 H80 V50 M42 85 V62 H58 V85" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { tag: 'КАВ\'ЯРНЯ', title: 'Кава на винос за 2 хвилини', titleShort: 'Кава на винос', price: 'від 65 грн', btn: 'Замовити каву',
    media: 'linear-gradient(135deg,#3a2410,#B9772F 55%,#5c2e12)', accent: '#B9772F',
    font: 'var(--font-sans)', weight: '500', tracking: '0.01em',
    icon: '<svg viewBox="0 0 100 100"><path d="M20 35 H68 V63 A24 24 0 0 1 20 63 Z M68 40 H80 A9 9 0 0 1 80 58 H68 M34 20 Q34 27 39 29 M48 18 Q48 25 53 27" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
  { tag: 'БАРБЕРШОП', title: 'Стрижка та бритва разом', titleShort: 'Стрижка та бритва', price: 'від 450 грн', btn: 'Записатись',
    media: 'linear-gradient(135deg,#1a1a1f,#3E4C6B 55%,#0d0d10)', accent: '#3E4C6B',
    font: 'var(--font-display)', weight: '700', tracking: '-0.02em',
    icon: '<svg viewBox="0 0 100 100"><circle cx="24" cy="24" r="9"/><circle cx="24" cy="76" r="9"/><path d="M31 31 L88 88 M31 69 L88 12" stroke-linecap="round"/></svg>' },
  { tag: 'ЮРИДИЧНІ ПОСЛУГИ', title: 'Консультація протягом дня', titleShort: 'Консультація', price: 'від $40', btn: 'Отримати консультацію',
    media: 'linear-gradient(135deg,#0d2b2e,var(--accent) 55%,#0f3b52)', accent: '#127A46',
    font: 'var(--font-sans)', weight: '600', tracking: '0',
    icon: '<svg viewBox="0 0 100 100"><path d="M50 8 V88 M24 88 H76 M50 20 L18 42 M50 20 L82 42 M18 42 L8 58 A16 8 0 0 0 28 58 Z M82 42 L72 58 A16 8 0 0 0 92 58 Z" stroke-linecap="round" stroke-linejoin="round"/></svg>' },
];
let demoIndex = 0;
let demoEditedByUser = false;
const demoEls = {
  tag: document.getElementById('demoTag'), title: document.getElementById('demoTitle'), price: document.getElementById('demoPrice'), btn: document.getElementById('demoBtn'), media: document.getElementById('demoMedia'),
  tagP: document.getElementById('demoTagPhone'), titleP: document.getElementById('demoTitlePhone'), priceP: document.getElementById('demoPricePhone'), btnP: document.getElementById('demoBtnPhone'), mediaP: document.getElementById('demoMediaPhone'),
};
function applyDemoStyle(ex){
  // шрифт і колір змінюються під нішу, щоб кожен демо-сайт відчувався інакше
  [demoEls.title, demoEls.titleP].forEach(el => {
    if (!el) return;
    el.style.fontFamily = ex.font;
    el.style.fontWeight = ex.weight;
    el.style.letterSpacing = ex.tracking;
  });
  [demoEls.btn, demoEls.btnP].forEach(el => {
    if (!el) return;
    el.style.background = ex.accent;
  });
  [demoEls.media, demoEls.mediaP].forEach(el => {
    if (!el) return;
    const svg = el.querySelector('svg');
    if (svg) svg.remove();
    el.insertAdjacentHTML('beforeend', ex.icon);
  });
}
function swapDemo() {
  if (demoEditedByUser) return;
  demoIndex = (demoIndex + 1) % demoExamples.length;
  const ex = demoExamples[demoIndex];
  const screens = document.querySelectorAll('.demo-screen');
  const medias = [demoEls.media, demoEls.mediaP];
  // фаза виходу: поточний контент їде вправо і згасає
  screens.forEach(el => { el.style.transform = 'translateX(16px)'; el.style.opacity = '0'; });
  medias.forEach(el => { if (el) el.style.opacity = '0.35'; });
  setTimeout(() => {
    if (demoEls.tag) demoEls.tag.textContent = ex.tag;
    if (demoEls.title) demoEls.title.textContent = ex.title;
    if (demoEls.price) demoEls.price.textContent = ex.price;
    if (demoEls.btn) demoEls.btn.textContent = ex.btn;
    if (demoEls.tagP) demoEls.tagP.textContent = ex.tag;
    if (demoEls.titleP) demoEls.titleP.textContent = ex.titleShort;
    if (demoEls.priceP) demoEls.priceP.textContent = ex.price;
    if (demoEls.btnP) demoEls.btnP.textContent = ex.btn;
    if (demoEls.media) demoEls.media.style.background = ex.media;
    if (demoEls.mediaP) demoEls.mediaP.style.background = ex.media;
    applyDemoStyle(ex);
    // новий контент стартує ще правіше (без анімації), потім плавно заїжджає на місце – теж справа
    screens.forEach(el => el.classList.add('no-anim'));
    void document.body.offsetWidth;
    screens.forEach(el => {
      el.classList.remove('no-anim');
      el.style.transform = 'translateX(0)';
      el.style.opacity = '1';
    });
    medias.forEach(el => { if (el) el.style.opacity = '1'; });
  }, 300);
}
applyDemoStyle(demoExamples[0]);
const demoInterval = setInterval(swapDemo, 5800);
[demoEls.title, demoEls.price, demoEls.titleP, demoEls.priceP].forEach(el => {
  if (!el) return;
  el.addEventListener('focus', () => { demoEditedByUser = true; clearInterval(demoInterval); });
});

// hero mockup: легкий паралакс-нахил всієї композиції за рухом миші
const stage = document.querySelector('.mock-stage');
const tilt = document.querySelector('.mockup-wrap');
if (stage && tilt && window.matchMedia('(pointer:fine)').matches) {
  stage.addEventListener('mousemove', (e) => {
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    tilt.style.transform = `perspective(1400px) rotateY(${x * 4}deg) rotateX(${-y * 3}deg)`;
  });
  stage.addEventListener('mouseleave', () => { tilt.style.transform = 'perspective(1400px) rotateY(0) rotateX(0)'; });
}

// анімована лінія прогресу в блоці "Як проходить робота"
const processList = document.getElementById('processList');
const processFill = document.getElementById('processFill');
function updateProcessFill(){
  if (!processList || !processFill) return;
  const r = processList.getBoundingClientRect();
  const vh = window.innerHeight;
  // прогрес охоплює весь час, поки блок проходить крізь екран – від появи знизу до зникнення зверху
  let p = (vh - r.top) / (vh + r.height * 0.62);
  p = Math.max(0, Math.min(1, p));
  processFill.style.height = (p * 100) + '%';
}
window.addEventListener('scroll', updateProcessFill);

// розгортання деталей кроку процесу
function toggleProcessDetails(btn){
  const details = btn.nextElementSibling;
  const label = btn.querySelector('.process-more-label');
  const isOpen = btn.classList.contains('open');
  if (!isOpen){
    details.style.maxHeight = details.scrollHeight + 'px';
    btn.classList.add('open');
    if (label) label.textContent = 'Згорнути';
  } else {
    details.style.maxHeight = details.scrollHeight + 'px';
    void details.offsetHeight;
    details.style.maxHeight = '0px';
    btn.classList.remove('open');
    if (label) label.textContent = 'Детальніше';
  }
  // прогрес-лінія рахує висоту блоку динамічно – оновлюємо одразу і після завершення анімації
  updateProcessFill();
  setTimeout(updateProcessFill, 420);
}
window.addEventListener('resize', updateProcessFill);
updateProcessFill();
document.querySelectorAll('.faq-item').forEach(item => {
  const q = item.querySelector('.faq-q');
  const a = item.querySelector('.faq-a');
  q.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(o => { o.classList.remove('open'); o.querySelector('.faq-a').style.maxHeight = null; });
    if (!isOpen) { item.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; }
  });
});

function validateContact(value) {
  const v = value.trim();
  if (!v) return 'Вкажіть контакт для зв\'язку';

  const digitsCount = (v.match(/\d/g) || []).length;

  // Схоже на спробу ввести телефон (багато цифр, немає @) – дозволені лише цифри, +, дужки, пробіли, тире
  if (!v.includes('@') && digitsCount >= 5) {
    const nonPhoneChars = v.replace(/[\d\s()+\-]/g, '');
    if (nonPhoneChars.length > 0) {
      return 'Номер телефону має містити лише цифри';
    }
    return digitsCount < 10 ? 'Перевірте номер – здається, не вистачає цифр' : '';
  }

  // Містить @ – перевіряємо як email або telegram-юзернейм
  if (v.includes('@')) {
    const emailLike = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    const telegramLike = /^@[a-zA-Z0-9_]{4,}$/.test(v);
    if (emailLike || telegramLike) return '';
    return 'Перевірте контакт – здається, він неповний';
  }

  // Схоже на спробу ввести email без @ (є літери й крапка, немає жодної кирилиці типу звичайного тексту)
  if (/^[a-zA-Z0-9._-]+\.[a-zA-Z]{2,}$/.test(v)) {
    return 'Email має містити символ @';
  }

  return ''; // telegram-юзернейм без @, ім'я тощо – не блокуємо
}

function checkContactField() {
  const contact = document.getElementById('fContact');
  const err = document.getElementById('fContactError');
  const msg = validateContact(contact.value);
  contact.classList.toggle('err', !!msg);
  err.textContent = msg;
  return !msg;
}
document.getElementById('fContact').addEventListener('blur', checkContactField);
document.getElementById('fContact').addEventListener('input', () => {
  if (document.getElementById('fContact').classList.contains('err')) checkContactField();
});

document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => chip.classList.toggle('sel'));
});
const chipOtherEl = document.getElementById('chipOther');
const fNicheOtherEl = document.getElementById('fNicheOther');
if (chipOtherEl && fNicheOtherEl) {
  chipOtherEl.addEventListener('click', () => {
    fNicheOtherEl.style.display = chipOtherEl.classList.contains('sel') ? 'block' : 'none';
    if (chipOtherEl.classList.contains('sel')) fNicheOtherEl.focus();
  });
}

document.getElementById('leadForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('fName');
  if (!name.value.trim()) { name.reportValidity(); return; }
  if (!checkContactField()) { return; }
  const nameVal = name.value.trim();
  const contact = document.getElementById('fContact').value.trim();
  let biz = Array.from(document.querySelectorAll('.chip.sel')).map(c => c.id === 'chipOther' ? (fNicheOtherEl.value.trim() || 'Інше') : c.textContent).join(', ');
  const msg = '';

  // Записуємо заявку в Google-таблицю (кожна заявка – новий рядок, дату проставляє сам скрипт).
  if (GOOGLE_SHEET_URL && !GOOGLE_SHEET_URL.includes('ВСТАВТЕ_СЮДИ')) {
    fetch(GOOGLE_SHEET_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ name: nameVal, contact, business: biz, message: msg })
    }).catch(() => {});
  }

  // Готуємо посилання на Telegram з готовим повідомленням – користувач сам натискає кнопку,
  // без автовідкриття нової вкладки (це блокувалось браузером і показувало помилку).
  let text = `Нова заявка з сайту%0AІм'я: ${encodeURIComponent(nameVal)}%0AКонтакт: ${encodeURIComponent(contact)}`;
  if (biz) text += `%0AТип бізнесу: ${encodeURIComponent(biz)}`;
  if (msg) text += `%0AПро проєкт: ${encodeURIComponent(msg)}`;
  document.getElementById('thankTelegramBtn').href = `https://t.me/${TELEGRAM_USERNAME}?text=${text}`;

  document.getElementById('leadForm').style.display = 'none';
  document.getElementById('thankState').classList.add('active');
  launchConfetti();
  if (window.fbq) fbq('track', 'Lead');
  if (window.gtag) gtag('event', 'generate_lead');
});

// sticky bar – один спокійний тригер замість попапів
const stickyBar = document.getElementById('stickyBar');
let stickyDismissed = false;
window.addEventListener('scroll', () => {
  if (stickyDismissed || window.cookieBannerPending) return;
  const heroBottom = document.querySelector('.hero').offsetHeight + 200;
  const contactTop = document.getElementById('contact').offsetTop;
  const show = window.scrollY > heroBottom && window.scrollY < contactTop - 300;
  stickyBar.classList.toggle('show', show);
});
document.getElementById('stickyClose').addEventListener('click', () => {
  stickyDismissed = true;
  stickyBar.classList.remove('show');
});

// cookie consent – GA4 і Meta Pixel вантажаться ТІЛЬКИ після згоди, вибір запам'ятовується
window.cookieBannerPending = true;
(function initCookieConsent(){
  var KEY = 'cookieConsent';
  function getConsent(){ try { return localStorage.getItem(KEY); } catch(e){ return null; } }
  function setConsent(v){ try { localStorage.setItem(KEY, v); } catch(e){} }

  function loadGA4(){
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=G-HC06J6SL8W';
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function(){ window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', 'G-HC06J6SL8W');
  }

  function loadMetaPixel(){
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
    (window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', '4639720499582370');
    window.fbq('track', 'PageView');
  }

  function loadTrackers(){
    if (window.__trackersLoaded) return;
    window.__trackersLoaded = true;
    loadGA4();
    loadMetaPixel();
  }

  var bar = document.getElementById('cookieBar');
  var consent = getConsent();

  function resolve(){
    window.cookieBannerPending = false;
    bar.classList.remove('show');
  }

  if (consent === 'accepted') { loadTrackers(); window.cookieBannerPending = false; }
  else if (consent === 'declined') { window.cookieBannerPending = false; }
  else {
    setTimeout(function(){ bar.classList.add('show'); }, 600);
  }

  document.getElementById('cookieAccept').addEventListener('click', function(){
    setConsent('accepted');
    loadTrackers();
    resolve();
  });
  document.getElementById('cookieDecline').addEventListener('click', function(){
    setConsent('declined');
    resolve();
  });
  document.getElementById('cookiePolicyLink').addEventListener('click', function(e){
    e.preventDefault();
    document.getElementById('privacyModal').classList.add('show');
  });
})();

// privacy modal
const privacyModal = document.getElementById('privacyModal');
document.querySelectorAll('#privacyLink, #privacyLinkForm').forEach(el => {
  el.addEventListener('click', (e) => { e.preventDefault(); privacyModal.classList.add('show'); });
});
document.getElementById('closeModal').addEventListener('click', () => privacyModal.classList.remove('show'));
privacyModal.addEventListener('click', (e) => { if (e.target === privacyModal) privacyModal.classList.remove('show'); });

// telegram direct link
document.getElementById('telegramDirectLink').href = `https://t.me/${TELEGRAM_USERNAME}`;
document.getElementById('telegramDirectLink').textContent = `@${TELEGRAM_USERNAME}`;

// WOW-момент: конфеті при успішній відправці заявки
function launchConfetti() {
  const colors = ['#127A46', '#4FC98A', '#DAF0E2', '#F5F5F1', '#0d3c2a'];
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;';
  document.body.appendChild(container);
  const count = 60;
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('span');
    const size = 6 + Math.random() * 7;
    const isCircle = Math.random() > 0.5;
    const startX = 50 + (Math.random() * 30 - 15);
    const drift = (Math.random() * 220 - 110);
    const fall = 320 + Math.random() * 260;
    const rot = Math.random() * 720 - 360;
    const dur = 1500 + Math.random() * 900;
    const delay = Math.random() * 150;
    piece.style.cssText = `position:absolute;top:32%;left:${startX}%;width:${size}px;height:${size * (isCircle ? 1 : 0.5)}px;background:${colors[i % colors.length]};border-radius:${isCircle ? '50%' : '2px'};opacity:0;transform:translate(0,0) rotate(0deg);animation:confettiFall ${dur}ms cubic-bezier(.25,.65,.35,1) ${delay}ms forwards;`;
    piece.style.setProperty('--drift', drift + 'px');
    piece.style.setProperty('--fall', fall + 'px');
    piece.style.setProperty('--rot', rot + 'deg');
    container.appendChild(piece);
  }
  setTimeout(() => container.remove(), 3000);
}