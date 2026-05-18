// good_pools motion utilities — IntersectionObserver reveal, smooth scroll,
// header hide-on-scroll, image fade-in, public observeNew API. No dependencies.
(function () {
  'use strict';

  // ---------- 1. Reveal on scroll ----------
  function initReveal() {
    if (!('IntersectionObserver' in window)) {
      // Fallback: показать всё сразу
      document.querySelectorAll('[data-reveal]').forEach(function (el) {
        el.classList.add('is-revealed');
      });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        if (el.hasAttribute('data-reveal-stagger')) {
          Array.prototype.forEach.call(el.children, function (child, i) {
            child.style.setProperty('--stagger-i', i);
            child.classList.add('is-revealed');
          });
        }
        el.classList.add('is-revealed');
        observer.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      var delay = el.getAttribute('data-reveal-delay');
      if (delay) el.style.setProperty('--reveal-delay', delay + 'ms');
      observer.observe(el);
    });
  }

  // ---------- 2. Hero stagger reveal on DOMContentLoaded ----------
  function initHeroReveal() {
    var heroItems = document.querySelectorAll('[data-reveal-hero]');
    heroItems.forEach(function (el, i) {
      el.style.setProperty('--stagger-i', i);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { el.classList.add('is-revealed'); });
      });
    });
  }

  // ---------- 3. Smooth scroll by anchor with header compensation ----------
  function initSmoothScroll() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var hash = a.getAttribute('href');
      if (!hash || hash.length < 2) return;
      var target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      var header = document.querySelector('.header');
      var offset = (header && !document.body.classList.contains('header-hidden'))
        ? header.getBoundingClientRect().height + 8
        : 8;
      var top = target.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top: top, behavior: 'smooth' });
      if (history.pushState) history.pushState(null, '', hash);
    });
  }

  // ---------- 4. Header hide on scroll down, show on scroll up ----------
  function initHeaderScroll() {
    var lastY = window.scrollY;
    var ticking = false;
    function update() {
      var y = window.scrollY;
      var dy = y - lastY;
      if (dy > 8 && y > 100) document.body.classList.add('header-hidden');
      else if (dy < -4) document.body.classList.remove('header-hidden');
      lastY = y;
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
  }

  // ---------- 5. Image fade-in on load ----------
  function initImageFade() {
    document.querySelectorAll('img[data-fade]').forEach(function (img) {
      if (img.complete && img.naturalWidth > 0) {
        img.classList.add('img-loaded');
        return;
      }
      img.addEventListener('load', function () { img.classList.add('img-loaded'); }, { once: true });
      img.addEventListener('error', function () { img.classList.add('img-loaded'); }, { once: true });
    });
  }

  // ---------- Public API: re-observe newly-added DOM (used by dynamic card renderers) ----------
  window.Motion = {
    observeNew: function (root) {
      if (!('IntersectionObserver' in window)) {
        (root || document).querySelectorAll('[data-reveal]:not(.is-revealed)').forEach(function (el) {
          el.classList.add('is-revealed');
        });
        return;
      }
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-revealed');
          obs.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
      (root || document).querySelectorAll('[data-reveal]:not(.is-revealed)').forEach(function (el) {
        obs.observe(el);
      });
    }
  };

  function init() {
    initReveal();
    initHeroReveal();
    initSmoothScroll();
    initHeaderScroll();
    initImageFade();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
