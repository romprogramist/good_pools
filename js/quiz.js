(function () {
  'use strict';

  function normalizePhone(raw) {
    if (raw == null) return '';
    return String(raw).replace(/\D/g, '');
  }

  window.__quiz = { normalizePhone };
})();
