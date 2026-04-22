// Header search dropdown. Self-mounts on pages that include the shared
// header search button. Data loading, filtering, and navigation are
// layered on top in subsequent tasks.

(function () {
  let panel = null;
  let button = null;
  let inputEl = null;
  let resultsEl = null;
  let isOpen = false;
  let categories = null;
  let models = null;
  let loadPromise = null;

  function buildPanel() {
    const el = document.createElement('div');
    el.className = 'search-panel';
    el.innerHTML =
      '<div class="search-panel-input-wrap">' +
        '<input type="search" class="search-panel-input" placeholder="Поиск по сайту" aria-label="Поиск по сайту">' +
      '</div>' +
      '<div class="search-panel-results"></div>';
    document.body.appendChild(el);
    return el;
  }

  function ensureData() {
    if (categories && models) return Promise.resolve();
    if (loadPromise) return loadPromise;
    loadPromise = Promise.all([DataSource.getCategories(), DataSource.getModels()])
      .then(function (results) {
        categories = results[0];
        models = results[1];
      })
      .catch(function (err) {
        console.error(err);
        loadPromise = null;
        throw err;
      });
    return loadPromise;
  }

  function renderError() {
    resultsEl.innerHTML = '<div class="search-panel-error">Не удалось загрузить данные</div>';
  }

  function renderEmptyState() {
    if (!categories) {
      resultsEl.innerHTML = '';
      return;
    }
    const chips = categories.map(function (c) {
      return '<button class="search-panel-chip" data-category="' + c.key + '">' + c.label + '</button>';
    }).join('');
    resultsEl.innerHTML =
      '<div class="search-panel-group-title">Категории</div>' +
      '<div class="search-panel-chips">' + chips + '</div>';
  }

  function normalise(s) {
    return (s || '').toString().toLowerCase();
  }

  function filterCategories(query) {
    if (!categories) return [];
    return categories.filter(function (c) {
      return normalise(c.label).indexOf(query) !== -1;
    }).slice(0, 5);
  }

  function filterModels(query) {
    if (!models) return [];
    return models.filter(function (m) {
      const hay = normalise(m.name) + ' ' + normalise(m.series) + ' ' + normalise(m.desc) + ' ' + normalise(m.specs);
      return hay.indexOf(query) !== -1;
    }).slice(0, 5);
  }

  function renderResults(catResults, modelResults) {
    if (catResults.length === 0 && modelResults.length === 0) {
      resultsEl.innerHTML = '<div class="search-panel-empty">Ничего не найдено</div>';
      return;
    }

    let html = '';

    if (catResults.length > 0) {
      const chips = catResults.map(function (c) {
        return '<button class="search-panel-chip" data-category="' + c.key + '">' + c.label + '</button>';
      }).join('');
      html +=
        '<div class="search-panel-group-title">Категории</div>' +
        '<div class="search-panel-chips">' + chips + '</div>';
    }

    if (modelResults.length > 0) {
      const rows = modelResults.map(function (m) {
        return (
          '<button class="search-panel-model" data-model="' + m.id + '">' +
            '<div class="search-panel-model-name">' + m.name + '</div>' +
            '<div class="search-panel-model-meta">' + m.series + ' · ' + m.specs + '</div>' +
          '</button>'
        );
      }).join('');
      html +=
        '<div class="search-panel-group-title">Модели</div>' +
        rows;
    }

    resultsEl.innerHTML = html;
  }

  function navigateToCategory(key) {
    window.location.href = 'models.html?category=' + encodeURIComponent(key);
  }

  function navigateToModel(id) {
    window.location.href = 'models.html?model=' + encodeURIComponent(id);
  }

  function onResultsClick(e) {
    const chip = e.target.closest('.search-panel-chip');
    if (chip) {
      navigateToCategory(chip.dataset.category);
      return;
    }
    const modelBtn = e.target.closest('.search-panel-model');
    if (modelBtn) {
      navigateToModel(modelBtn.dataset.model);
    }
  }

  function updateResults() {
    if (!categories || !models) return;
    const q = normalise(inputEl.value).trim();
    if (q === '') {
      renderEmptyState();
      return;
    }
    renderResults(filterCategories(q), filterModels(q));
  }

  function open() {
    if (isOpen) return;
    panel.classList.add('open');
    isOpen = true;
    inputEl.focus();

    ensureData()
      .then(function () { updateResults(); })
      .catch(function () { renderError(); });
  }

  function close() {
    if (!isOpen) return;
    panel.classList.remove('open');
    isOpen = false;
    inputEl.value = '';
    button.focus();
  }

  function toggle() {
    if (isOpen) close(); else open();
  }

  function onDocumentClick(e) {
    if (!isOpen) return;
    if (panel.contains(e.target)) return;
    if (button.contains(e.target)) return;
    // Outside click: close without clearing input (spec: preserve state),
    // but still return focus to the search button (spec: focus returns on both Esc and outside-click).
    panel.classList.remove('open');
    isOpen = false;
    button.focus();
  }

  function onKeydown(e) {
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      close();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    button = document.querySelector('.header button[aria-label="Поиск"]');
    if (!button) return;

    panel = buildPanel();
    inputEl = panel.querySelector('.search-panel-input');
    resultsEl = panel.querySelector('.search-panel-results');

    button.addEventListener('click', function (e) {
      e.preventDefault();
      toggle();
    });
    inputEl.addEventListener('input', function () {
      updateResults();
    });
    resultsEl.addEventListener('click', onResultsClick);

    inputEl.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (!categories || !models) return;
      const q = normalise(inputEl.value).trim();
      if (q === '') return;
      const modelHits = filterModels(q);
      if (modelHits.length > 0) {
        navigateToModel(modelHits[0].id);
        return;
      }
      const catHits = filterCategories(q);
      if (catHits.length > 0) {
        navigateToCategory(catHits[0].key);
      }
    });
    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onKeydown);
  });
})();
