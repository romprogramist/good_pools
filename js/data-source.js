// The single source of truth for catalog data.
// Data is loaded from the PostgreSQL-backed API.

(function () {
  var CATEGORIES_URL = '/api/categories';
  var MODELS_URL = '/api/models';
  var PORTFOLIO_URL = '/api/portfolio';

  var categoriesPromise = null;
  var modelsPromise = null;
  var portfolioPromise = null;

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

  function getPortfolio() {
    if (!portfolioPromise) {
      portfolioPromise = loadJson(PORTFOLIO_URL, 'portfolio').catch(function (err) {
        portfolioPromise = null;
        throw err;
      });
    }
    return portfolioPromise;
  }

  window.DataSource = {
    getCategories: getCategories,
    getModels: getModels,
    getPortfolio: getPortfolio
  };
})();
