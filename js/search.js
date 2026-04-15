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
        '<input type="search" class="search-panel-input" placeholder="Поиск по каталогу" aria-label="Поиск по каталогу">' +
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

  function open() {
    if (isOpen) return;
    panel.classList.add('open');
    isOpen = true;
    inputEl.focus();

    ensureData()
      .then(function () { renderEmptyState(); })
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
    document.addEventListener('click', onDocumentClick);
    document.addEventListener('keydown', onKeydown);
  });
})();
