(function () {
  'use strict';

  const STORAGE_KEY = 'cookieAccepted';

  function init() {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
    } catch (_) { /* localStorage unavailable — show anyway */ }

    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Согласие на cookies');
    banner.innerHTML =
      '<div class="cookie-banner__text">' +
        'Продолжая использовать сайт, вы соглашаетесь на обработку файлов cookie. ' +
        'Подробнее в <a href="/privacy.html">Политике конфиденциальности</a>.' +
      '</div>' +
      '<button type="button" class="cookie-banner__btn">Принять</button>';

    document.body.appendChild(banner);

    // Delay 800ms before slide-in so it doesn't punch the user in the face on load
    setTimeout(function () {
      banner.classList.add('is-visible');
      // Пока баннер виден — резервируем место снизу (CSS поднимает hero-CTA над баннером)
      // и прячем плавающую кнопку, иначе на мобильных баннер перехватывает тапы по кнопкам заявки.
      document.body.classList.add('cookie-visible');
    }, 800);

    banner.querySelector('.cookie-banner__btn').addEventListener('click', function () {
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch (_) { /* ignore */ }
      banner.classList.remove('is-visible');
      banner.classList.add('is-leaving');
      document.body.classList.remove('cookie-visible');
      setTimeout(function () { banner.remove(); }, 320); // = --motion-base + buffer
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
