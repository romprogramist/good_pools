const WORK_CATEGORIES = [
  { key: 'all',       label: 'Все' },
  { key: 'composite', label: 'Композитные' },
  { key: 'custom',    label: 'Кастом' },
  { key: 'jacuzzi',   label: 'Джакузи-спа' },
  { key: 'furako',    label: 'Фурако' }
];

const CATEGORY_LABEL = {
  composite: 'Композитный',
  custom:    'Кастом',
  jacuzzi:   'Джакузи-спа',
  furako:    'Фурако'
};

const WORKS = [
  { id: 1,  title: 'Вилла в Подмосковье',            location: 'Московская область',   category: 'composite', size: '8.0 × 4.0 м',     year: 2024, image: 'images/portfolio/work-01.jpg', gallery: ['images/portfolio/work-01.jpg', 'images/portfolio/work-05.jpg', 'images/portfolio/work-08.jpg', 'images/portfolio/work-03.jpg'] },
  { id: 2,  title: 'Загородный дом в Сочи',          location: 'Краснодарский край',    category: 'composite', size: '7.0 × 3.5 м',     year: 2024, image: 'images/portfolio/work-02.jpg', gallery: ['images/portfolio/work-02.jpg', 'images/portfolio/work-06.jpg', 'images/portfolio/work-09.jpg', 'images/portfolio/work-04.jpg'] },
  { id: 3,  title: 'Коттедж в Краснодаре',           location: 'Краснодар',             category: 'composite', size: '6.5 × 3.2 м',     year: 2023, image: 'images/portfolio/work-03.jpg', gallery: ['images/portfolio/work-03.jpg', 'images/portfolio/work-07.jpg', 'images/portfolio/work-10.jpg', 'images/portfolio/work-05.jpg'] },
  { id: 4,  title: 'Особняк под Санкт-Петербургом',  location: 'Ленинградская область', category: 'composite', size: '9.0 × 4.5 м',     year: 2024, image: 'images/portfolio/work-04.jpg', gallery: ['images/portfolio/work-04.jpg', 'images/portfolio/work-08.jpg', 'images/portfolio/work-11.jpg', 'images/portfolio/work-06.jpg'] },
  { id: 5,  title: 'Резиденция в Казани',            location: 'Татарстан',             category: 'custom',    size: '12 × 5 м',        year: 2024, image: 'images/portfolio/work-05.jpg', gallery: ['images/portfolio/work-05.jpg', 'images/portfolio/work-09.jpg', 'images/portfolio/work-12.jpg', 'images/portfolio/work-07.jpg'] },
  { id: 6,  title: 'Дом в Ростове-на-Дону',          location: 'Ростовская область',    category: 'custom',    size: '10 × 4 м',        year: 2023, image: 'images/portfolio/work-06.jpg', gallery: ['images/portfolio/work-06.jpg', 'images/portfolio/work-10.jpg', 'images/portfolio/work-01.jpg', 'images/portfolio/work-08.jpg'] },
  { id: 7,  title: 'Вилла в Калининграде',           location: 'Калининградская обл.',  category: 'custom',    size: 'Лагуна 14 × 6 м', year: 2023, image: 'images/portfolio/work-07.jpg', gallery: ['images/portfolio/work-07.jpg', 'images/portfolio/work-11.jpg', 'images/portfolio/work-02.jpg', 'images/portfolio/work-09.jpg'] },
  { id: 8,  title: 'Пентхаус в Екатеринбурге',       location: 'Свердловская область',  category: 'jacuzzi',   size: 'SPA Family',      year: 2024, image: 'images/portfolio/work-08.jpg', gallery: ['images/portfolio/work-08.jpg', 'images/portfolio/work-12.jpg', 'images/portfolio/work-03.jpg', 'images/portfolio/work-10.jpg'] },
  { id: 9,  title: 'Коттедж в Новосибирске',         location: 'Новосибирская обл.',    category: 'jacuzzi',   size: 'SPA Premium',     year: 2024, image: 'images/portfolio/work-09.jpg', gallery: ['images/portfolio/work-09.jpg', 'images/portfolio/work-01.jpg', 'images/portfolio/work-04.jpg', 'images/portfolio/work-11.jpg'] },
  { id: 10, title: 'Дача под Владивостоком',         location: 'Приморский край',       category: 'jacuzzi',   size: 'SPA Duo',         year: 2023, image: 'images/portfolio/work-10.jpg', gallery: ['images/portfolio/work-10.jpg', 'images/portfolio/work-02.jpg', 'images/portfolio/work-05.jpg', 'images/portfolio/work-12.jpg'] },
  { id: 11, title: 'База отдыха в Карелии',          location: 'Республика Карелия',    category: 'furako',    size: 'Кедр Ø 2.2 м',    year: 2024, image: 'images/portfolio/work-11.jpg', gallery: ['images/portfolio/work-11.jpg', 'images/portfolio/work-03.jpg', 'images/portfolio/work-06.jpg', 'images/portfolio/work-01.jpg'] },
  { id: 12, title: 'Гостевой дом на Алтае',          location: 'Горный Алтай',          category: 'furako',    size: 'Кедр Ø 1.8 м',    year: 2023, image: 'images/portfolio/work-12.jpg', gallery: ['images/portfolio/work-12.jpg', 'images/portfolio/work-04.jpg', 'images/portfolio/work-07.jpg', 'images/portfolio/work-02.jpg'] }
];

function cardHtml(work, modifier = '') {
  const cls = `work-card${modifier ? ' ' + modifier : ''}`;
  return `
    <article class="${cls}" data-category="${work.category}" data-work-id="${work.id}" tabindex="0" role="button" aria-label="Открыть галерею проекта: ${work.title}">
      <div class="work-card-img">
        <img src="${work.image}" alt="${work.title}" loading="lazy">
        <span class="work-tag">${CATEGORY_LABEL[work.category]}</span>
        <span class="work-year">${work.year}</span>
      </div>
      <div class="work-card-info">
        <div class="work-title">${work.title}</div>
        <div class="work-location">${work.location}</div>
        <div class="work-meta">${CATEGORY_LABEL[work.category]} &middot; ${work.size}</div>
      </div>
    </article>
  `;
}

function renderHomeFeatured() {
  const container = document.querySelector('.port-featured');
  if (!container) return;

  const big = WORKS[0];
  const small1 = WORKS[1];
  const small2 = WORKS[4];

  container.innerHTML = `
    ${cardHtml(big, 'work-card--big')}
    <div class="port-featured-col">
      ${cardHtml(small1)}
      ${cardHtml(small2)}
    </div>
  `;
}

function renderPortfolioFilter() {
  const container = document.querySelector('.models-filter');
  if (!container) return;
  container.innerHTML = WORK_CATEGORIES.map((cat, i) => `
    <button class="mchip${i === 0 ? ' active' : ''}" data-category="${cat.key}">
      ${cat.label}
    </button>
  `).join('');
}

function renderPortfolioGrid() {
  const container = document.querySelector('.works-grid');
  if (!container) return;
  container.innerHTML = WORKS.map(w => cardHtml(w)).join('');
}

function attachPortfolioFilter() {
  const filterEl = document.querySelector('.models-filter');
  const gridEl = document.querySelector('.works-grid');
  if (!filterEl || !gridEl) return;

  filterEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.mchip');
    if (!chip) return;

    filterEl.querySelectorAll('.mchip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    const selected = chip.dataset.category;
    gridEl.querySelectorAll('.work-card').forEach(card => {
      const match = selected === 'all' || card.dataset.category === selected;
      card.classList.toggle('hidden', !match);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderHomeFeatured();

  if (document.querySelector('.works-grid')) {
    renderPortfolioFilter();
    renderPortfolioGrid();
    attachPortfolioFilter();
    PortfolioGallery.attach();
  }
});

// ===== Portfolio gallery modal =====
const PortfolioGallery = (() => {
  let modalEl = null;
  let imgEl = null;
  let titleEl = null;
  let locationEl = null;
  let metaEl = null;
  let counterEl = null;
  let closeBtn = null;
  let prevBtn = null;
  let nextBtn = null;
  let currentWork = null;
  let currentIndex = 0;
  let triggerCard = null;
  let prevBodyOverflow = '';

  function getGallery(work) {
    return (work && work.gallery && work.gallery.length) ? work.gallery : [work.image];
  }

  function buildModal() {
    const root = document.createElement('div');
    root.className = 'pgal-modal';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'pgal-title');
    root.hidden = true;
    root.innerHTML = `
      <button class="pgal-btn pgal-close" aria-label="Закрыть">×</button>
      <div class="pgal-stage">
        <div class="pgal-image-wrap">
          <button class="pgal-btn pgal-nav pgal-nav--prev" aria-label="Предыдущее фото">‹</button>
          <img class="pgal-image" alt="" />
          <button class="pgal-btn pgal-nav pgal-nav--next" aria-label="Следующее фото">›</button>
        </div>
        <div class="pgal-info">
          <h2 class="pgal-title" id="pgal-title"></h2>
          <div class="pgal-location"></div>
          <div class="pgal-meta"></div>
          <div class="pgal-counter" aria-live="polite"></div>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    let touchStartX = null;
    let touchStartY = null;
    const SWIPE_THRESHOLD = 50;

    root.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) { touchStartX = null; return; }
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    root.addEventListener('touchend', (e) => {
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

  function render() {
    if (!currentWork) return;
    const gallery = getGallery(currentWork);
    const src = gallery[currentIndex];
    const multi = gallery.length > 1;

    imgEl.src = src;
    imgEl.alt = `${currentWork.title} — фото ${currentIndex + 1}`;
    titleEl.textContent = currentWork.title;
    locationEl.textContent = currentWork.location;
    metaEl.textContent = `${CATEGORY_LABEL[currentWork.category]} · ${currentWork.size} · ${currentWork.year}`;
    counterEl.textContent = multi ? `${currentIndex + 1} / ${gallery.length}` : '';
    prevBtn.hidden = !multi;
    nextBtn.hidden = !multi;
  }

  function open(work, cardEl) {
    if (!modalEl) {
      modalEl = buildModal();
      imgEl = modalEl.querySelector('.pgal-image');
      titleEl = modalEl.querySelector('.pgal-title');
      locationEl = modalEl.querySelector('.pgal-location');
      metaEl = modalEl.querySelector('.pgal-meta');
      counterEl = modalEl.querySelector('.pgal-counter');
      closeBtn = modalEl.querySelector('.pgal-close');
      prevBtn = modalEl.querySelector('.pgal-nav--prev');
      nextBtn = modalEl.querySelector('.pgal-nav--next');

      closeBtn.addEventListener('click', close);
      prevBtn.addEventListener('click', () => go(-1));
      nextBtn.addEventListener('click', () => go(1));
      modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) close();
      });
      document.addEventListener('keydown', onKey);
    }

    currentWork = work;
    currentIndex = 0;
    triggerCard = cardEl;
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
    if (triggerCard && typeof triggerCard.focus === 'function') {
      triggerCard.focus();
    }
    currentWork = null;
    triggerCard = null;
  }

  function go(delta) {
    if (!currentWork) return;
    const gallery = getGallery(currentWork);
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

  function attach() {
    const grid = document.querySelector('.works-grid');
    if (!grid) return;

    const tryOpen = (card) => {
      const id = Number(card.dataset.workId);
      const work = WORKS.find(w => w.id === id);
      if (work) open(work, card);
    };

    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.work-card');
      if (card) tryOpen(card);
    });

    grid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.work-card');
      if (!card) return;
      e.preventDefault();
      tryOpen(card);
    });
  }

  return { attach };
})();
