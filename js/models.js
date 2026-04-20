// models.html catalog view. Data comes from DataSource; this module
// only renders and handles interactions.

(function () {
  function buildCategoryImageMap(categories) {
    const map = {};
    categories.forEach(function (c) { map[c.key] = c.image; });
    return map;
  }

  function renderFilter(container, categories) {
    const chips = [{ key: 'all', label: 'Все' }].concat(categories);
    container.innerHTML = chips.map(function (cat, i) {
      return '<button class="mchip' + (i === 0 ? ' active' : '') + '" data-category="' + cat.key + '">' + cat.label + '</button>';
    }).join('');
  }

  function renderGrid(container, models, categoryImage) {
    container.innerHTML = models.map(function (m) {
      return (
        '<article class="mcard" data-id="' + m.id + '" data-category="' + m.category + '" tabindex="0" role="button" aria-label="Открыть галерею: ' + m.name + '">' +
          '<div class="mcard-img">' +
            '<img src="' + (m.gallery && m.gallery.length ? m.gallery[0] : categoryImage[m.category]) + '" alt="' + m.name + '">' +
            (m.badge ? '<div class="mcard-badge">' + m.badge + '</div>' : '') +
            '<div class="mcard-size">' + m.specs + '</div>' +
          '</div>' +
          '<div class="mcard-info">' +
            '<div class="mcard-name">' + m.name + '</div>' +
            '<div class="mcard-series">' + m.series + '</div>' +
            '<div class="mcard-desc">' + m.desc + '</div>' +
            '<div class="mcard-price">' + m.price + '</div>' +
          '</div>' +
        '</article>'
      );
    }).join('');
  }

  function openModelInGallery(model, index, cardEl) {
    GalleryModal.open({
      title: model.name,
      infoLines: [
        model.series,
        model.desc,
        model.specs + ' · ' + model.price
      ],
      gallery: model.gallery && model.gallery.length ? model.gallery : [],
      triggerEl: cardEl
    });
  }

  function attachModelGallery(gridEl, models) {
    const tryOpen = function (card) {
      const id = card.dataset.id;
      const index = models.findIndex(function (m) { return m.id === id; });
      if (index === -1) return;
      openModelInGallery(models[index], index, card);
    };

    gridEl.addEventListener('click', function (e) {
      const card = e.target.closest('.mcard');
      if (card) tryOpen(card);
    });

    gridEl.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.mcard');
      if (!card) return;
      e.preventDefault();
      tryOpen(card);
    });
  }

  function applyCategoryFilter(gridEl, filterEl, key) {
    filterEl.querySelectorAll('.mchip').forEach(function (c) {
      c.classList.toggle('active', c.dataset.category === key);
    });
    gridEl.querySelectorAll('.mcard').forEach(function (card) {
      const match = key === 'all' || card.dataset.category === key;
      card.classList.toggle('hidden', !match);
    });
  }

  function attachFilter(filterEl, gridEl) {
    filterEl.addEventListener('click', function (e) {
      const chip = e.target.closest('.mchip');
      if (!chip) return;
      applyCategoryFilter(gridEl, filterEl, chip.dataset.category);
    });
  }

  function renderError(gridEl) {
    gridEl.innerHTML = '<div class="models-error">Не удалось загрузить каталог</div>';
  }

  function applyDeepLink(filterEl, gridEl, categories, models) {
    const params = new URLSearchParams(window.location.search);
    const categoryParam = params.get('category');
    const modelParam = params.get('model');

    if (categoryParam) {
      const known = categories.some(function (c) { return c.key === categoryParam; });
      if (known) {
        applyCategoryFilter(gridEl, filterEl, categoryParam);
      }
    }

    if (modelParam) {
      const target = gridEl.querySelector('.mcard[data-id="' + modelParam + '"]');
      if (target && !target.classList.contains('hidden')) {
        setTimeout(function () {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Open gallery for this model
          var model = models.find(function (m) { return m.id === modelParam; });
          if (model) {
            openModelInGallery(model, models.indexOf(model), target);
          }
        }, 100);
      }
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    const filterEl = document.querySelector('.models-filter');
    const gridEl = document.querySelector('.models-grid');
    if (!filterEl || !gridEl) return;

    Promise.all([DataSource.getCategories(), DataSource.getModels()])
      .then(function (results) {
        const categories = results[0];
        const models = results[1];
        const categoryImage = buildCategoryImageMap(categories);

        renderFilter(filterEl, categories);
        renderGrid(gridEl, models, categoryImage);
        attachFilter(filterEl, gridEl);
        attachModelGallery(gridEl, models);

        applyDeepLink(filterEl, gridEl, categories, models);
      })
      .catch(function (err) {
        console.error(err);
        renderError(gridEl);
      });
  });
})();
