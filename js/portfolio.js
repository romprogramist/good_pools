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
  { id: 1,  title: 'Вилла в Подмосковье',       location: 'Московская область',  category: 'composite', size: '8.0 × 4.0 м', year: 2024, image: 'images/portfolio/work-01.jpg' },
  { id: 2,  title: 'Загородный дом в Сочи',     location: 'Краснодарский край',  category: 'composite', size: '7.0 × 3.5 м', year: 2024, image: 'images/portfolio/work-02.jpg' },
  { id: 3,  title: 'Коттедж в Краснодаре',      location: 'Краснодар',           category: 'composite', size: '6.5 × 3.2 м', year: 2023, image: 'images/portfolio/work-03.jpg' },
  { id: 4,  title: 'Особняк под Санкт-Петербургом', location: 'Ленинградская область', category: 'composite', size: '9.0 × 4.5 м', year: 2024, image: 'images/portfolio/work-04.jpg' },
  { id: 5,  title: 'Резиденция в Казани',       location: 'Татарстан',           category: 'custom',    size: '12 × 5 м',    year: 2024, image: 'images/portfolio/work-05.jpg' },
  { id: 6,  title: 'Дом в Ростове-на-Дону',     location: 'Ростовская область',  category: 'custom',    size: '10 × 4 м',    year: 2023, image: 'images/portfolio/work-06.jpg' },
  { id: 7,  title: 'Вилла в Калининграде',      location: 'Калининградская обл.', category: 'custom',    size: 'Лагуна 14 × 6 м', year: 2023, image: 'images/portfolio/work-07.jpg' },
  { id: 8,  title: 'Пентхаус в Екатеринбурге',  location: 'Свердловская область', category: 'jacuzzi',   size: 'SPA Family', year: 2024, image: 'images/portfolio/work-08.jpg' },
  { id: 9,  title: 'Коттедж в Новосибирске',    location: 'Новосибирская обл.',  category: 'jacuzzi',   size: 'SPA Premium', year: 2024, image: 'images/portfolio/work-09.jpg' },
  { id: 10, title: 'Дача под Владивостоком',    location: 'Приморский край',     category: 'jacuzzi',   size: 'SPA Duo',    year: 2023, image: 'images/portfolio/work-10.jpg' },
  { id: 11, title: 'База отдыха в Карелии',     location: 'Республика Карелия',  category: 'furako',    size: 'Кедр Ø 2.2 м', year: 2024, image: 'images/portfolio/work-11.jpg' },
  { id: 12, title: 'Гостевой дом на Алтае',     location: 'Горный Алтай',        category: 'furako',    size: 'Кедр Ø 1.8 м', year: 2023, image: 'images/portfolio/work-12.jpg' }
];

function cardHtml(work, modifier = '') {
  const cls = `work-card${modifier ? ' ' + modifier : ''}`;
  return `
    <article class="${cls}" data-category="${work.category}">
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
  }
});
