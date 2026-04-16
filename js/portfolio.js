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

function openWorkInGallery(work, cardEl) {
  GalleryModal.open({
    title: work.title,
    infoLines: [
      work.location,
      `${CATEGORY_LABEL[work.category]} · ${work.size} · ${work.year}`
    ],
    gallery: work.gallery || [work.image],
    triggerEl: cardEl
  });
}

function attachPortfolioGallery() {
  const grid = document.querySelector('.works-grid');
  if (!grid) return;

  const tryOpen = (card) => {
    const id = Number(card.dataset.workId);
    const work = WORKS.find(w => w.id === id);
    if (work) openWorkInGallery(work, card);
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

document.addEventListener('DOMContentLoaded', () => {
  renderHomeFeatured();

  if (document.querySelector('.works-grid')) {
    renderPortfolioFilter();
    renderPortfolioGrid();
    attachPortfolioFilter();
    attachPortfolioGallery();
  }
});
