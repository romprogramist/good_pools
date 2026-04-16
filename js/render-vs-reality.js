(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const section = document.getElementById('render-reality');
    if (!section) return;

    const toggle = section.querySelector('.rr-toggle');
    const tabs = section.querySelectorAll('.rr-tab');
    const stage = section.querySelector('.rr-stage');
    const track = section.querySelector('.rr-track');
    const slides = section.querySelectorAll('.rr-slide');
    const prev = section.querySelector('.rr-prev');
    const next = section.querySelector('.rr-next');
    const dotsHost = section.querySelector('.rr-dots');

    let index = 0;
    const total = slides.length;

    function setMode(mode) {
      stage.dataset.mode = mode;
      toggle.dataset.mode = mode;
      tabs.forEach((t) => {
        const active = t.dataset.mode === mode;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }

    function goTo(i) {
      index = (i + total) % total;
      track.style.transform = `translateX(-${index * 100}%)`;
      slides.forEach((s, k) => s.classList.toggle('is-active', k === index));
      dotsHost.querySelectorAll('.rr-dot').forEach((d, k) => d.classList.toggle('is-active', k === index));
      if (prev) prev.disabled = false;
      if (next) next.disabled = false;
    }

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => setMode(tab.dataset.mode));
    });

    if (prev) prev.addEventListener('click', () => goTo(index - 1));
    if (next) next.addEventListener('click', () => goTo(index + 1));

    for (let i = 0; i < total; i++) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'rr-dot' + (i === 0 ? ' is-active' : '');
      dot.setAttribute('aria-label', `Проект ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsHost.appendChild(dot);
    }

    let startX = 0;
    let dx = 0;
    let dragging = false;
    const viewport = section.querySelector('.rr-viewport');

    viewport.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true;
      startX = e.clientX;
      dx = 0;
      viewport.setPointerCapture(e.pointerId);
    });
    viewport.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      dx = e.clientX - startX;
    });
    viewport.addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false;
      if (Math.abs(dx) > 40) {
        goTo(index + (dx < 0 ? 1 : -1));
      }
    });
    viewport.addEventListener('pointercancel', () => { dragging = false; });

    section.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') goTo(index - 1);
      else if (e.key === 'ArrowRight') goTo(index + 1);
    });
  });
})();
