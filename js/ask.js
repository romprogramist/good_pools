(function () {
  'use strict';

  let state = { question: '', name: '', phone: '' };

  function init() {
    const form = document.querySelector('[data-ask-form]');
    if (!form) return;

    form.addEventListener('input', onInput);
    form.addEventListener('submit', onSubmit);
  }

  function onInput(e) {
    const t = e.target;
    if (!t) return;
    if (t.matches('[data-ask-phone]')) {
      const formatted = formatPhoneMask(t.value);
      if (formatted !== t.value) t.value = formatted;
      state.phone = normalizePhone(t.value);
    } else if (t.matches('[data-ask-name]')) {
      state.name = t.value;
    } else if (t.matches('[data-ask-question]')) {
      state.question = t.value;
    }
    t.classList.remove('is-invalid');
    const errEl = document.querySelector('[data-ask-error]');
    if (errEl) errEl.hidden = true;
  }

  function onSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const errEl = form.querySelector('[data-ask-error]');

    const err = validate();
    if (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
      const field = form.querySelector(err.selector);
      if (field) field.classList.add('is-invalid');
      return;
    }

    console.log('[ask] submit', {
      question: state.question.trim(),
      name: state.name.trim(),
      phone: state.phone
    });
    // TODO: replace with POST /api/leads when backend is ready

    showThanks();
  }

  function validate() {
    if (state.question.trim().length < 3) {
      return { selector: '[data-ask-question]', message: 'Напишите вопрос (минимум 3 символа)' };
    }
    if (!state.name.trim()) {
      return { selector: '[data-ask-name]', message: 'Укажите имя' };
    }
    if (state.phone.length < 11) {
      return { selector: '[data-ask-phone]', message: 'Введите телефон полностью' };
    }
    return null;
  }

  function showThanks() {
    const section = document.querySelector('.ask');
    if (!section) return;
    const inner = section.querySelector('.ask-inner');
    if (!inner) return;
    inner.classList.add('ask-inner--thanks');
    inner.innerHTML = `
      <h2 class="ask-title"><strong>Спасибо!</strong></h2>
      <p class="ask-lead">Менеджер ответит вам в течение 10 минут.</p>
    `;
  }

  function normalizePhone(raw) {
    if (raw == null) return '';
    return String(raw).replace(/\D/g, '');
  }

  function formatPhoneMask(raw) {
    const digits = String(raw == null ? '' : raw).replace(/\D/g, '');
    if (digits.length === 0) return '';
    let core = digits;
    if (core.charAt(0) === '7' || core.charAt(0) === '8') core = core.slice(1);
    core = core.slice(0, 10);
    if (core.length === 0) return '+7 ';
    let s = '+7 (' + core.slice(0, 3);
    if (core.length > 3) s += ') ' + core.slice(3, 6);
    if (core.length > 6) s += '-' + core.slice(6, 8);
    if (core.length > 8) s += '-' + core.slice(8, 10);
    return s;
  }

  document.addEventListener('DOMContentLoaded', init);
})();
