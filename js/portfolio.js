var WORKS = [];
var WORK_CATEGORIES = [{ key: 'all', label: 'Все' }];
var CATEGORY_LABEL = {};

function cardHtml(work, modifier) {
  modifier = modifier || '';
  var cls = 'work-card' + (modifier ? ' ' + modifier : '');
  return (
    '<article class="' + cls + '" data-category="' + work.category + '" data-work-id="' + work.id + '" tabindex="0" role="button" aria-label="Открыть галерею проекта: ' + work.title + '">' +
      '<div class="work-card-img">' +
        '<img src="' + (work.image || '') + '" alt="' + work.title + '" loading="lazy">' +
        '<span class="work-tag">' + (CATEGORY_LABEL[work.category] || work.category) + '</span>' +
        '<span class="work-year">' + (work.year || '') + '</span>' +
      '</div>' +
      '<div class="work-card-info">' +
        '<div class="work-title">' + work.title + '</div>' +
        '<div class="work-location">' + (work.location || '') + '</div>' +
        '<div class="work-meta">' + (CATEGORY_LABEL[work.category] || work.category) + ' &middot; ' + (work.size || '') + '</div>' +
      '</div>' +
    '</article>'
  );
}

function renderHomeFeatured() {
  var container = document.querySelector('.port-featured');
  if (!container) return;
  if (WORKS.length < 3) return;

  var big = WORKS[0];
  var small1 = WORKS[1];
  var small2 = WORKS.length > 4 ? WORKS[4] : WORKS[2];

  container.innerHTML =
    cardHtml(big, 'work-card--big') +
    '<div class="port-featured-col">' +
      cardHtml(small1) +
      cardHtml(small2) +
    '</div>';
}

function renderPortfolioFilter() {
  var container = document.querySelector('.models-filter');
  if (!container) return;
  container.innerHTML = WORK_CATEGORIES.map(function (cat, i) {
    return '<button class="mchip' + (i === 0 ? ' active' : '') + '" data-category="' + cat.key + '">' + cat.label + '</button>';
  }).join('');
}

function renderPortfolioGrid() {
  var container = document.querySelector('.works-grid');
  if (!container) return;
  container.innerHTML = WORKS.map(function (w) { return cardHtml(w); }).join('');
}

function attachPortfolioFilter() {
  var filterEl = document.querySelector('.models-filter');
  var gridEl = document.querySelector('.works-grid');
  if (!filterEl || !gridEl) return;

  filterEl.addEventListener('click', function (e) {
    var chip = e.target.closest('.mchip');
    if (!chip) return;

    filterEl.querySelectorAll('.mchip').forEach(function (c) { c.classList.remove('active'); });
    chip.classList.add('active');

    var selected = chip.dataset.category;
    gridEl.querySelectorAll('.work-card').forEach(function (card) {
      var match = selected === 'all' || card.dataset.category === selected;
      card.classList.toggle('hidden', !match);
    });
  });
}

function openWorkInGallery(work, cardEl) {
  GalleryModal.open({
    title: work.title,
    infoLines: [
      work.location,
      (CATEGORY_LABEL[work.category] || work.category) + ' · ' + (work.size || '') + ' · ' + (work.year || '')
    ],
    gallery: work.gallery && work.gallery.length ? work.gallery : (work.image ? [work.image] : []),
    triggerEl: cardEl
  });
}

function attachPortfolioGallery() {
  var grid = document.querySelector('.works-grid');
  if (!grid) return;

  var tryOpen = function (card) {
    var id = Number(card.dataset.workId);
    var work = WORKS.find(function (w) { return w.id === id; });
    if (work) openWorkInGallery(work, card);
  };

  grid.addEventListener('click', function (e) {
    var card = e.target.closest('.work-card');
    if (card) tryOpen(card);
  });

  grid.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var card = e.target.closest('.work-card');
    if (!card) return;
    e.preventDefault();
    tryOpen(card);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  Promise.all([DataSource.getCategories(), DataSource.getPortfolio()])
    .then(function (results) {
      var categories = results[0];
      WORKS = results[1];

      categories.forEach(function (cat) {
        CATEGORY_LABEL[cat.key] = cat.label;
      });
      WORK_CATEGORIES = [{ key: 'all', label: 'Все' }].concat(
        categories.filter(function (cat) {
          return WORKS.some(function (w) { return w.category === cat.key; });
        })
      );

      renderHomeFeatured();

      if (document.querySelector('.works-grid')) {
        renderPortfolioFilter();
        renderPortfolioGrid();
        attachPortfolioFilter();
        attachPortfolioGallery();
      }
    })
    .catch(function (err) {
      console.error('Portfolio data load failed:', err);
    });
});
