// Shared gallery modal used by portfolio.html and models.html.
// Usage: GalleryModal.open({ title, infoLines, gallery, triggerEl }).

(function () {
  let modalEl = null;
  let imgEl = null;
  let titleEl = null;
  let linesEl = null;
  let counterEl = null;
  let closeBtn = null;
  let prevBtn = null;
  let nextBtn = null;
  let currentItem = null;
  let currentIndex = 0;
  let triggerEl = null;
  let prevBodyOverflow = '';

  function buildModal() {
    const root = document.createElement('div');
    root.className = 'pgal-modal';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'pgal-title');
    root.hidden = true;
    root.innerHTML =
      '<button class="pgal-btn pgal-close" aria-label="Закрыть">×</button>' +
      '<div class="pgal-stage">' +
        '<div class="pgal-image-wrap">' +
          '<button class="pgal-btn pgal-nav pgal-nav--prev" aria-label="Предыдущее фото">‹</button>' +
          '<img class="pgal-image" alt="" />' +
          '<button class="pgal-btn pgal-nav pgal-nav--next" aria-label="Следующее фото">›</button>' +
        '</div>' +
        '<div class="pgal-info">' +
          '<h2 class="pgal-title" id="pgal-title"></h2>' +
          '<div class="pgal-lines"></div>' +
          '<div class="pgal-counter" aria-live="polite"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);

    let touchStartX = null;
    let touchStartY = null;
    const SWIPE_THRESHOLD = 50;

    root.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) { touchStartX = null; return; }
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    root.addEventListener('touchend', function (e) {
      if (touchStartX === null) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      touchStartX = null;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
      if (Math.abs(dy) > Math.abs(dx)) return;
      go(dx < 0 ? 1 : -1);
    });

    return root;
  }

  function preloadNeighbors() {
    if (!currentItem) return;
    const gallery = currentItem.gallery;
    if (!gallery || gallery.length < 2) return;
    const nextIdx = (currentIndex + 1) % gallery.length;
    const prevIdx = (currentIndex - 1 + gallery.length) % gallery.length;
    [nextIdx, prevIdx].forEach(function (i) {
      const img = new Image();
      img.src = gallery[i];
    });
  }

  function render() {
    if (!currentItem) return;
    const gallery = currentItem.gallery || [];
    const src = gallery[currentIndex];
    const multi = gallery.length > 1;

    imgEl.src = src || '';
    imgEl.alt = currentItem.title + ' — фото ' + (currentIndex + 1);
    imgEl.style.display = '';
    titleEl.textContent = currentItem.title || '';

    linesEl.innerHTML = '';
    (currentItem.infoLines || []).forEach(function (text, i) {
      const div = document.createElement('div');
      div.className = 'pgal-line pgal-line--' + (i === 0 ? 'primary' : 'secondary');
      div.textContent = text;
      linesEl.appendChild(div);
    });

    counterEl.textContent = multi ? ((currentIndex + 1) + ' / ' + gallery.length) : '';
    prevBtn.hidden = !multi;
    nextBtn.hidden = !multi;

    const leftover = modalEl.querySelector('.pgal-image-placeholder');
    if (leftover) leftover.remove();

    preloadNeighbors();
  }

  function ensureMounted() {
    if (modalEl) return;
    modalEl = buildModal();
    imgEl = modalEl.querySelector('.pgal-image');
    titleEl = modalEl.querySelector('.pgal-title');
    linesEl = modalEl.querySelector('.pgal-lines');
    counterEl = modalEl.querySelector('.pgal-counter');
    closeBtn = modalEl.querySelector('.pgal-close');
    prevBtn = modalEl.querySelector('.pgal-nav--prev');
    nextBtn = modalEl.querySelector('.pgal-nav--next');

    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', function () { go(-1); });
    nextBtn.addEventListener('click', function () { go(1); });
    modalEl.addEventListener('click', function (e) {
      if (e.target === modalEl) close();
    });
    document.addEventListener('keydown', onKey);

    imgEl.addEventListener('error', function () {
      imgEl.style.display = 'none';
      const wrap = modalEl.querySelector('.pgal-image-wrap');
      if (!wrap.querySelector('.pgal-image-placeholder')) {
        const ph = document.createElement('div');
        ph.className = 'pgal-image-placeholder';
        ph.textContent = 'Фото недоступно';
        wrap.insertBefore(ph, nextBtn);
      }
    });
  }

  function open(item) {
    ensureMounted();
    currentItem = item;
    currentIndex = 0;
    triggerEl = item.triggerEl || null;
    prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    render();
    modalEl.hidden = false;
    closeBtn.focus();
  }

  function close() {
    if (!modalEl || modalEl.hidden) return;
    modalEl.hidden = true;
    document.body.style.overflow = prevBodyOverflow;
    if (triggerEl && typeof triggerEl.focus === 'function') {
      triggerEl.focus();
    }
    currentItem = null;
    triggerEl = null;
  }

  function go(delta) {
    if (!currentItem) return;
    const gallery = currentItem.gallery || [];
    if (gallery.length < 2) return;
    currentIndex = (currentIndex + delta + gallery.length) % gallery.length;
    render();
  }

  function getFocusables() {
    const list = [closeBtn];
    if (prevBtn && !prevBtn.hidden) list.push(prevBtn);
    if (nextBtn && !nextBtn.hidden) list.push(nextBtn);
    return list;
  }

  function onKey(e) {
    if (!modalEl || modalEl.hidden) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(1);
    } else if (e.key === 'Tab') {
      const focusables = getFocusables();
      if (focusables.length === 0) return;
      const active = document.activeElement;
      const idx = focusables.indexOf(active);
      e.preventDefault();
      let nextIdx;
      if (e.shiftKey) {
        nextIdx = idx <= 0 ? focusables.length - 1 : idx - 1;
      } else {
        nextIdx = idx === -1 || idx === focusables.length - 1 ? 0 : idx + 1;
      }
      focusables[nextIdx].focus();
    }
  }

  window.GalleryModal = { open: open, close: close };
})();
