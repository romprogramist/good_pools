// The single source of truth for catalog data.
// When the PostgreSQL backend ships, replace the URL constants with
// the real API endpoints — no UI module changes are needed.

(function () {
  const CATEGORIES_URL = 'data/categories.json';
  const MODELS_URL = 'data/models.json';

  let categoriesPromise = null;
  let modelsPromise = null;

  function loadJson(url, label) {
    return fetch(url).then(function (res) {
      if (!res.ok) {
        throw new Error('data-source: ' + label + ' load failed (' + res.status + ')');
      }
      return res.json();
    });
  }

  function getCategories() {
    if (!categoriesPromise) {
      categoriesPromise = loadJson(CATEGORIES_URL, 'categories').catch(function (err) {
        categoriesPromise = null;
        throw err;
      });
    }
    return categoriesPromise;
  }

  function getModels() {
    if (!modelsPromise) {
      modelsPromise = loadJson(MODELS_URL, 'models').catch(function (err) {
        modelsPromise = null;
        throw err;
      });
    }
    return modelsPromise;
  }

  window.DataSource = {
    getCategories: getCategories,
    getModels: getModels
  };
})();
