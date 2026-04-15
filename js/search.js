// Header search dropdown. Self-mounts on pages that include the shared
// header search button. Data loading, filtering, and navigation are
// layered on top in subsequent tasks.

(function () {
  let panel = null;
  let button = null;
  let inputEl = null;
  let resultsEl = null;
  let isOpen = false;

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

  function open() {
    if (isOpen) return;
    panel.classList.add('open');
    isOpen = true;
    inputEl.focus();
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
