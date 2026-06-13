/* Переключатель темы оформления для посетителей.
   Тема хранится в localStorage и применяется на всех страницах.
   - по умолчанию: тема «Бассейн» (новая, продающая) — атрибут data-theme не нужен;
   - «Классическая» (как было) включается data-theme="classic".
   Раннее применение (анти-мигание) делает inline-скрипт в <head> каждой страницы. */
(function () {
  'use strict';

  var STORAGE_KEY = 'gp-theme';
  var CLASSIC = 'classic';
  var POOL = 'pool';

  function current() {
    return document.documentElement.getAttribute('data-theme') === POOL ? POOL : CLASSIC;
  }

  function apply(theme) {
    if (theme === POOL) {
      document.documentElement.setAttribute('data-theme', POOL);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) { /* приватный режим — игнор */ }
  }

  function label(theme) {
    return theme === CLASSIC ? 'Тема: Классическая' : 'Тема: Бассейн';
  }

  function render(btn) {
    var theme = current();
    btn.setAttribute('aria-label', label(theme) + ' — нажмите, чтобы переключить');
    btn.querySelector('.theme-toggle__text').textContent = label(theme);
  }

  function build() {
    var host = document.querySelector('.footer-bottom');
    if (!host || host.querySelector('.theme-toggle')) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle';
    btn.innerHTML = '<span class="theme-toggle__dot"></span><span class="theme-toggle__text"></span>';
    render(btn);

    btn.addEventListener('click', function () {
      apply(current() === CLASSIC ? POOL : CLASSIC);
      render(btn);
    });

    host.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
