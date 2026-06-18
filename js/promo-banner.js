(function () {
  'use strict';

  var STORAGE_KEY = 'promoClosed';
  var YM_ID = 100792239;
  var REVEAL_DELAY = 600;   // не «бить по глазам» на загрузке
  var REMOVE_FALLBACK = 800; // подстраховка, если transitionend не сработал

  // Чистая логика: показывать ли баннер при данном storage-объекте.
  function shouldShow(storage) {
    try {
      return !storage || storage.getItem(STORAGE_KEY) !== '1';
    } catch (_) {
      return true; // storage недоступен → показываем
    }
  }

  // Открыть доступную форму заявки. На index/catalog/models/portfolio — квиз,
  // на /pool — консультация. Возвращает true, если форма открыта.
  function openLeadForm() {
    if (typeof window.openQuiz === 'function') { window.openQuiz(); return true; }
    if (typeof window.openConsult === 'function') { window.openConsult(); return true; }
    return false;
  }

  function buildBar() {
    var bar = document.createElement('div');
    bar.className = 'promo-bar';
    bar.setAttribute('role', 'button');
    bar.setAttribute('tabindex', '0');
    bar.setAttribute('aria-label', 'Оставить заявку и получить скидку 10% на строительство бассейна');
    bar.innerHTML =
      '<span class="promo-bar__text">' +
        '<span class="promo-bar__emoji" aria-hidden="true">🎁</span>' +
        'Оставьте заявку на сайте — скидка <b>10%</b> на строительство бассейна' +
      '</span>' +
      '<button type="button" class="promo-bar__close" aria-label="Закрыть">&times;</button>';
    return bar;
  }

  function init() {
    var storage;
    try { storage = window.sessionStorage; } catch (_) { storage = null; }
    if (!shouldShow(storage)) return;

    var root = document.documentElement;
    var bar = buildBar();
    document.body.appendChild(bar);

    var height = bar.offsetHeight; // измеряем до показа (узел скрыт через transform)

    function activate() {
      if (openLeadForm() && typeof window.ym === 'function') {
        try { window.ym(YM_ID, 'reachGoal', 'promo_click'); } catch (_) {}
      }
    }

    bar.addEventListener('click', function (e) {
      if (e.target.closest('.promo-bar__close')) return;
      activate();
    });

    bar.addEventListener('keydown', function (e) {
      if (e.target.closest('.promo-bar__close')) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        activate();
      }
    });

    bar.querySelector('.promo-bar__close').addEventListener('click', function (e) {
      e.stopPropagation();
      try { if (storage) storage.setItem(STORAGE_KEY, '1'); } catch (_) {}
      bar.classList.remove('is-visible');
      root.style.setProperty('--promo-h', '0px'); // контент уезжает обратно вверх
      var removed = false;
      function remove() { if (removed) return; removed = true; bar.remove(); }
      bar.addEventListener('transitionend', remove, { once: true });
      setTimeout(remove, REMOVE_FALLBACK);
    });

    // Показ: одновременно резервируем место (--promo-h) и проявляем (is-visible).
    setTimeout(function () {
      root.style.setProperty('--promo-h', height + 'px');
      bar.classList.add('is-visible');
    }, REVEAL_DELAY);
  }

  // экспорт для тестов (как window.__quiz)
  window.__promo = { shouldShow: shouldShow };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
