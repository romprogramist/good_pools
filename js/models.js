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
        '<article class="mcard" data-id="' + m.id + '" data-category="' + m.category + '">' +
          '<div class="mcard-img">' +
            '<img src="' + categoryImage[m.category] + '" alt="' + m.name + '">' +
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
        // Defer so smooth scroll starts after layout settles.
        setTimeout(function () {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.classList.add('highlight');
          setTimeout(function () { target.classList.remove('highlight'); }, 2000);
        }, 50);
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

        applyDeepLink(filterEl, gridEl, categories, models);
      })
      .catch(function (err) {
        console.error(err);
        renderError(gridEl);
      });
  });
})();
