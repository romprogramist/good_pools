(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var section = document.getElementById('render-reality');
    if (!section) return;

    init(section).catch(function (err) { console.error('RR init failed:', err); section.hidden = true; });
  });

  async function init(section) {
    var data = null;
    try {
      var res = await fetch('/api/render-reality');
      if (res.ok) data = await res.json();
    } catch (e) { /* noop */ }

    if (!data || !data.slides || !data.slides.length) {
      section.hidden = true;
      return;
    }

    renderHead(section, data);
    renderSlides(section, data.slides);
    initCarousel(section);
  }

  function renderHead(section, data) {
    var titleEl = section.querySelector('.rr-title');
    var subEl   = section.querySelector('.rr-sub');

    var lines = (data.title || '').split('\n');
    var boldPart = lines[0] || '';
    var thinPart = lines.slice(1).join(' ');

    titleEl.innerHTML = '';
    var bold = document.createElement('span');
    bold.className = 'bold';
    bold.textContent = boldPart;
    titleEl.appendChild(bold);
    if (thinPart) {
      titleEl.appendChild(document.createElement('br'));
      var thin = document.createElement('span');
      thin.className = 'thin';
      thin.textContent = thinPart;
      titleEl.appendChild(thin);
    }

    subEl.textContent = data.subtitle || '';
  }

  function renderSlides(section, slides) {
    var track = section.querySelector('.rr-track');
    track.innerHTML = '';

    slides.forEach(function (s, i) {
      var slide = document.createElement('div');
      slide.className = 'rr-slide' + (i === 0 ? ' is-active' : '');
      slide.dataset.index = String(i);

      var frame = document.createElement('div');
      frame.className = 'rr-frame';

      var imgR = document.createElement('img');
      imgR.className = 'rr-img rr-img-render';
      imgR.src = s.render;
      imgR.alt = '3D-визуализация: ' + (s.title || '');
      if (i !== 0) imgR.loading = 'lazy';

      var imgReal = document.createElement('img');
      imgReal.className = 'rr-img rr-img-real';
      imgReal.src = s.real;
      imgReal.alt = 'Реальная фотография: ' + (s.title || '');
      imgReal.loading = 'lazy';

      var badgeR = document.createElement('span');
      badgeR.className = 'rr-badge rr-badge-render';
      badgeR.textContent = 'Рендер';
      var badgeReal = document.createElement('span');
      badgeReal.className = 'rr-badge rr-badge-real';
      badgeReal.textContent = 'Реальность';

      frame.appendChild(imgR);
      frame.appendChild(imgReal);
      frame.appendChild(badgeR);
      frame.appendChild(badgeReal);

      var caption = document.createElement('div');
      caption.className = 'rr-caption';
      var capTitle = document.createElement('div');
      capTitle.className = 'rr-caption-title';
      capTitle.textContent = s.title || '';
      caption.appendChild(capTitle);
      if (s.meta) {
        var capMeta = document.createElement('div');
        capMeta.className = 'rr-caption-meta';
        capMeta.textContent = s.meta;
        caption.appendChild(capMeta);
      }

      slide.appendChild(frame);
      slide.appendChild(caption);
      track.appendChild(slide);
    });
  }

  function initCarousel(section) {
    var toggle   = section.querySelector('.rr-toggle');
    var tabs     = section.querySelectorAll('.rr-tab');
    var stage    = section.querySelector('.rr-stage');
    var track    = section.querySelector('.rr-track');
    var slides   = section.querySelectorAll('.rr-slide');
    var prev     = section.querySelector('.rr-prev');
    var next     = section.querySelector('.rr-next');
    var dotsHost = section.querySelector('.rr-dots');
    var viewport = section.querySelector('.rr-viewport');

    var index = 0;
    var total = slides.length;

    function setMode(mode) {
      stage.dataset.mode = mode;
      toggle.dataset.mode = mode;
      tabs.forEach(function (t) {
        var active = t.dataset.mode === mode;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }

    function goTo(i) {
      index = (i + total) % total;
      track.style.transform = 'translateX(-' + (index * 100) + '%)';
      slides.forEach(function (s, k) { s.classList.toggle('is-active', k === index); });
      dotsHost.querySelectorAll('.rr-dot').forEach(function (d, k) { d.classList.toggle('is-active', k === index); });
      if (prev) prev.disabled = false;
      if (next) next.disabled = false;
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () { setMode(tab.dataset.mode); });
    });

    if (prev) prev.addEventListener('click', function () { goTo(index - 1); });
    if (next) next.addEventListener('click', function () { goTo(index + 1); });

    dotsHost.innerHTML = '';
    for (var i = 0; i < total; i++) {
      (function (idx) {
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'rr-dot' + (idx === 0 ? ' is-active' : '');
        dot.setAttribute('aria-label', 'Проект ' + (idx + 1));
        dot.addEventListener('click', function () { goTo(idx); });
        dotsHost.appendChild(dot);
      })(i);
    }

    var startX = 0, dx = 0, dragging = false;

    viewport.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true;
      startX = e.clientX;
      dx = 0;
      viewport.setPointerCapture(e.pointerId);
    });
    viewport.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      dx = e.clientX - startX;
    });
    viewport.addEventListener('pointerup', function () {
      if (!dragging) return;
      dragging = false;
      if (Math.abs(dx) > 40) {
        goTo(index + (dx < 0 ? 1 : -1));
      }
    });
    viewport.addEventListener('pointercancel', function () { dragging = false; });

    section.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') goTo(index - 1);
      else if (e.key === 'ArrowRight') goTo(index + 1);
    });
  }
})();
