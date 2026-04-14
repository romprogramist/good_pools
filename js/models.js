const CATEGORIES = [
  { key: 'all',        label: 'Все' },
  { key: 'composite',  label: 'Композитные' },
  { key: 'custom',     label: 'Кастом' },
  { key: 'jacuzzi',    label: 'Джакузи-спа' },
  { key: 'inflatable', label: 'Надувные спа' },
  { key: 'furako',     label: 'Фурако' },
  { key: 'furniture',  label: 'Мебель' }
];

const CATEGORY_IMAGE = {
  composite:  'images/categories/composite-pool.svg',
  custom:     'images/categories/custom-pool.svg',
  jacuzzi:    'images/categories/jacuzzi-spa.svg',
  inflatable: 'images/categories/inflatable-spa.svg',
  furako:     'images/categories/furako.svg',
  furniture:  'images/categories/furniture.svg'
};

const MODELS = [
  // Композитные чаши
  { id: 'hiit',  name: 'HIIT',  category: 'composite', series: 'Спортивная серия',   desc: 'Увеличенная длина для активного плавания, обтекаемая форма, усиленное дно.', specs: '8.0 · 3.6 · 1.6 м', price: 'от 1 250 000 ₽', badge: 'Хит продаж' },
  { id: 'zen',   name: 'ZEN',   category: 'composite', series: 'Классическая серия', desc: 'Прямоугольная форма для ценителей чистых линий, компактная.',                 specs: '6.2 · 3.2 · 1.5 м', price: 'от 890 000 ₽' },
  { id: 'tetta', name: 'TETTA', category: 'composite', series: 'Семейная серия',     desc: 'Эргономичная форма со встроенными ступенями и зоной отдыха.',                 specs: '7.0 · 3.4 · 1.5 м', price: 'от 1 100 000 ₽' },

  // Кастом
  { id: 'custom-classic',  name: 'CUSTOM CLASSIC',  category: 'custom', series: 'Индивидуальный проект', desc: 'Прямые линии, ваши размеры. Делаем по чертежам участка.',                specs: 'Любой размер', price: 'По проекту' },
  { id: 'custom-infinity', name: 'CUSTOM INFINITY', category: 'custom', series: 'Инфинити-проект',       desc: 'Бассейн с переливом через край — эффект бесконечной воды.',              specs: 'Любой размер', price: 'По проекту', badge: 'Премиум' },
  { id: 'custom-lagoon',   name: 'CUSTOM LAGOON',   category: 'custom', series: 'Свободная форма',       desc: 'Органичные контуры в стиле природной лагуны, пляжный вход.',             specs: 'Любой размер', price: 'По проекту' },

  // Джакузи-спа
  { id: 'spa-duo',     name: 'SPA DUO',     category: 'jacuzzi', series: '2 места',  desc: 'Компактное спа для двоих, 20 гидромассажных форсунок, LED-подсветка.', specs: 'Ø 1.9 м · 85 см', price: 'от 420 000 ₽' },
  { id: 'spa-family',  name: 'SPA FAMILY',  category: 'jacuzzi', series: '6 мест',   desc: 'Семейное спа с зоной отдыха, 40 форсунок, встроенная акустика.',        specs: '2.2 × 2.2 × 0.9 м', price: 'от 780 000 ₽', badge: 'Хит продаж' },
  { id: 'spa-premium', name: 'SPA PREMIUM', category: 'jacuzzi', series: '8 мест',   desc: 'Топ-модель: 60 форсунок, хромотерапия, аромадиффузор, подогрев.',       specs: '2.4 × 2.4 × 0.95 м', price: 'от 1 150 000 ₽' },

  // Надувные спа
  { id: 'inflate-round',  name: 'INFLATE ROUND',  category: 'inflatable', series: '4 места',  desc: 'Круглое надувное спа с подогревом 40°C и массажными форсунками.',    specs: 'Ø 1.8 м · 65 см', price: 'от 89 000 ₽' },
  { id: 'inflate-square', name: 'INFLATE SQUARE', category: 'inflatable', series: '6 мест',   desc: 'Квадратная форма, большая вместимость, быстрый монтаж за 15 минут.', specs: '2.0 × 2.0 × 0.7 м', price: 'от 129 000 ₽' },
  { id: 'inflate-jet',    name: 'INFLATE JET',    category: 'inflatable', series: '4 места',  desc: 'Усиленный массаж 140 форсунок, хромотерапия, пульт ДУ.',             specs: 'Ø 1.9 м · 70 см', price: 'от 165 000 ₽', badge: 'Новинка' },

  // Фурако
  { id: 'furako-classic', name: 'FURAKO CLASSIC', category: 'furako', series: 'Кедр сибирский', desc: 'Классическая круглая купель из кедра, дровяная печь внутри.',         specs: 'Ø 1.8 м · 1.0 м', price: 'от 245 000 ₽' },
  { id: 'furako-oval',    name: 'FURAKO OVAL',    category: 'furako', series: 'Дуб',            desc: 'Овальная форма для двоих лёжа, печь снаружи, удобный вход.',           specs: '2.0 × 1.5 × 1.0 м', price: 'от 310 000 ₽' },
  { id: 'furako-xl',      name: 'FURAKO XL',      category: 'furako', series: 'Кедр премиум',   desc: 'Большая купель до 8 человек, встроенные лавки, лестница из нержавейки.', specs: 'Ø 2.2 м · 1.2 м', price: 'от 420 000 ₽', badge: 'Хит продаж' },

  // Мебель
  { id: 'lounge-chair', name: 'LOUNGE CHAIR', category: 'furniture', series: 'Шезлонг',          desc: 'Влагостойкий алюминий + ткань Textilene, регулировка спинки.',   specs: '195 × 70 × 40 см', price: 'от 28 000 ₽' },
  { id: 'lounge-sofa',  name: 'LOUNGE SOFA',  category: 'furniture', series: 'Диван для террасы', desc: 'Модульный диван из ротанга, водоотталкивающие подушки.',        specs: '220 × 85 × 75 см', price: 'от 95 000 ₽' },
  { id: 'lounge-bar',   name: 'LOUNGE BAR',   category: 'furniture', series: 'Барная зона',      desc: 'Барная стойка + 2 стула, тик + нержавейка, для зоны у бассейна.', specs: '140 × 55 × 110 см', price: 'от 142 000 ₽' }
];

function renderFilter(container) {
  container.innerHTML = CATEGORIES.map((cat, i) => `
    <button class="mchip${i === 0 ? ' active' : ''}" data-category="${cat.key}">
      ${cat.label}
    </button>
  `).join('');
}

function renderGrid(container) {
  container.innerHTML = MODELS.map(m => `
    <article class="mcard" data-category="${m.category}">
      <div class="mcard-img">
        <img src="${CATEGORY_IMAGE[m.category]}" alt="${m.name}">
        ${m.badge ? `<div class="mcard-badge">${m.badge}</div>` : ''}
        <div class="mcard-size">${m.specs}</div>
      </div>
      <div class="mcard-info">
        <div class="mcard-name">${m.name}</div>
        <div class="mcard-series">${m.series}</div>
        <div class="mcard-desc">${m.desc}</div>
        <div class="mcard-price">${m.price}</div>
      </div>
    </article>
  `).join('');
}

function attachFilter(filterEl, gridEl) {
  filterEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.mchip');
    if (!chip) return;

    filterEl.querySelectorAll('.mchip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    const selected = chip.dataset.category;
    gridEl.querySelectorAll('.mcard').forEach(card => {
      const match = selected === 'all' || card.dataset.category === selected;
      card.classList.toggle('hidden', !match);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const filterEl = document.querySelector('.models-filter');
  const gridEl = document.querySelector('.models-grid');
  if (!filterEl || !gridEl) return;

  renderFilter(filterEl);
  renderGrid(gridEl);
  attachFilter(filterEl, gridEl);
});
