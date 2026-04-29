(function () {
  'use strict';

  function normalizePhone(raw) {
    if (raw == null) return '';
    return String(raw).replace(/\D/g, '');
  }

  function validateStep(step, answers) {
    switch (step) {
      case 1:
        if (!answers.size) return { ok: false, message: 'Выберите размер' };
        return { ok: true };
      case 2:
        if (!answers.finish) return { ok: false, message: 'Выберите тип отделки' };
        return { ok: true };
      case 3:
        if (!answers.filtration) return { ok: false, message: 'Выберите вариант' };
        return { ok: true };
      case 4:
        return { ok: true };
      case 5:
        if (!answers.budget) return { ok: false, message: 'Выберите диапазон' };
        return { ok: true };
      case 6:
        if (!answers.timing) return { ok: false, message: 'Выберите срок' };
        return { ok: true };
      case 7: {
        const name = String(answers.name || '').trim();
        if (name.length < 2) return { ok: false, message: 'Введите имя' };
        const digits = normalizePhone(answers.phone);
        if (digits.length < 10) return { ok: false, message: 'Введите телефон' };
        return { ok: true };
      }
      default:
        return { ok: false, message: 'Unknown step' };
    }
  }

  window.__quiz = { normalizePhone, validateStep };
})();
