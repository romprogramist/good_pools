(function () {
  'use strict';

  const STEPS = [
    { id: 'size', title: 'Размер бассейна', type: 'single', options: [
      { value: '3x5',    label: '3 × 5 м' },
      { value: '3x6',    label: '3 × 6 м' },
      { value: '3x7',    label: '3 × 7 м' },
      { value: '4x8',    label: '4 × 8 м' },
      { value: '5x10',   label: '5 × 10 м' },
      { value: 'custom', label: 'Мне нужен индивидуальный размер' }
    ]},
    { id: 'finish', title: 'Тип отделки', type: 'single', options: [
      { value: 'composite', label: 'Композитный' },
      { value: 'concrete',  label: 'Бетонный' },
      { value: 'consult',   label: 'Не знаю, нужна консультация' }
    ]},
    { id: 'filtration', title: 'Фильтрация воды', type: 'single', options: [
      { value: 'yes',     label: 'Да' },
      { value: 'consult', label: 'Нет, нужна консультация' }
    ]},
    { id: 'options', title: 'Дополнительные опции', type: 'multi', options: [
      { value: 'heating',      label: 'Подогрев воды' },
      { value: 'lighting',     label: 'Подсветка' },
      { value: 'autodose',     label: 'Автодозирование химии' },
      { value: 'uv',           label: 'УФ лампа' },
      { value: 'chlorinefree', label: 'Безхлорная система' },
      { value: 'hydromassage', label: 'Гидромассаж / Аэромассаж' },
      { value: 'waterfall',    label: 'Водопад' }
    ]},
    { id: 'budget', title: 'Бюджет', type: 'single', options: [
      { value: '1-2', label: '1–2 млн руб' },
      { value: '2-3', label: '2–3 млн руб' },
      { value: '3-4', label: '3–4 млн руб' }
    ]},
    { id: 'timing', title: 'Сроки', type: 'single', options: [
      { value: 'soon',     label: 'В ближайшее время' },
      { value: 'season',   label: 'В тёплый сезон' },
      { value: 'browsing', label: 'Пока просто прицениваюсь' }
    ]},
    { id: 'contacts', title: 'Контакты', type: 'contacts' }
  ];

  const TOTAL_STEPS = STEPS.length;

  function makeInitialState() {
    return {
      step: 1,
      answers: {
        size: null,
        finish: null,
        filtration: null,
        options: [],
        budget: null,
        timing: null,
        name: '',
        phone: ''
      }
    };
  }

  let state = makeInitialState();

  const DIALOG_ID = 'quizModal';

  function ensureDialog() {
    let dlg = document.getElementById(DIALOG_ID);
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.id = DIALOG_ID;
    dlg.className = 'quiz-modal';
    dlg.innerHTML = `
      <button type="button" class="quiz-close" aria-label="Закрыть" data-quiz-close>×</button>
      <div class="quiz-header">
        <h2 class="quiz-title">РАССЧИТАТЬ СТОИМОСТЬ</h2>
        <ul class="quiz-bait">
          <li>до 10% выгоды в смете при заключении договора этим летом</li>
          <li>3 месяца обслуживание бассейна бесплатно</li>
        </ul>
      </div>
      <div class="quiz-body" data-quiz-body></div>
    `;
    document.body.appendChild(dlg);
    dlg.querySelector('[data-quiz-body]').addEventListener('click', onBodyClick);
    dlg.querySelector('[data-quiz-body]').addEventListener('input', onBodyInput);

    // Закрытие по клику на бэкдроп (target === сам dialog)
    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) closeQuiz();
    });
    // Кнопка ×
    dlg.addEventListener('click', (e) => {
      if (e.target.closest('[data-quiz-close]')) closeQuiz();
    });
    // Сброс state при закрытии (в т.ч. ESC и close-метод)
    dlg.addEventListener('close', () => { state = makeInitialState(); });

    return dlg;
  }

  function openQuiz() {
    const dlg = ensureDialog();
    state = makeInitialState();
    render();
    try { dlg.showModal(); }
    catch (err) {
      console.error('[quiz] showModal failed', err);
      alert('Ваш браузер не поддерживает эту форму, обновите его.');
    }
  }

  function closeQuiz() {
    const dlg = document.getElementById(DIALOG_ID);
    if (dlg && dlg.open) dlg.close();
  }

  function renderSingle(step) {
    const selected = state.answers[step.id];
    return `
      <h3 class="quiz-step-title">${step.title}</h3>
      <div class="quiz-error" data-quiz-error></div>
      <div class="quiz-options">
        ${step.options.map(opt => `
          <button type="button"
                  class="quiz-option ${selected === opt.value ? 'is-active' : ''}"
                  data-quiz-pick="${opt.value}">${opt.label}</button>
        `).join('')}
      </div>
    `;
  }

  function renderMulti(step) {
    const selected = state.answers[step.id] || [];
    return `
      <h3 class="quiz-step-title">${step.title}</h3>
      <div class="quiz-error" data-quiz-error></div>
      <div class="quiz-options">
        ${step.options.map(opt => `
          <button type="button"
                  class="quiz-option ${selected.includes(opt.value) ? 'is-active' : ''}"
                  data-quiz-toggle="${opt.value}">${opt.label}</button>
        `).join('')}
      </div>
    `;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderContacts(step) {
    return `
      <h3 class="quiz-step-title">${step.title}</h3>
      <div class="quiz-error" data-quiz-error></div>
      <div class="quiz-fields">
        <input type="text" class="quiz-input"
               data-quiz-field="name"
               placeholder="Имя"
               value="${escapeHtml(state.answers.name)}"
               autocomplete="given-name">
        <input type="tel" class="quiz-input"
               data-quiz-field="phone"
               placeholder="+7 (___) ___-__-__"
               value="${escapeHtml(formatPhoneMask(state.answers.phone))}"
               autocomplete="tel">
      </div>
      <label class="consent">
        <input type="checkbox" name="consent" required>
        <span>Я согласен с <a href="/privacy.html" target="_blank">Политикой обработки персональных данных</a></span>
      </label>
      <label class="consent consent--marketing">
        <input type="checkbox" name="marketing">
        <span>Согласен получать рекламные сообщения и информацию об акциях</span>
      </label>
    `;
  }

  function renderNav() {
    const isLast = state.step === TOTAL_STEPS;
    const showBack = state.step > 1;
    const nextLabel = isLast ? 'ПОЛУЧИТЬ ПРЕДЛОЖЕНИЕ' : 'ДАЛЕЕ →';
    const nextAttr  = isLast ? 'data-quiz-submit' : 'data-quiz-next';
    return `
      <div class="quiz-nav">
        <button type="button" class="quiz-btn quiz-btn--back" data-quiz-back ${showBack ? '' : 'hidden'}>← НАЗАД</button>
        <button type="button" class="quiz-btn quiz-btn--next" ${nextAttr}>${nextLabel}</button>
      </div>
    `;
  }

  function showError(msg) {
    const el = document.querySelector('[data-quiz-error]');
    if (el) el.textContent = msg;
  }

  function handleSubmit() {
    const v = validateStep(state.step, state.answers);
    if (!v.ok) { showError(v.message); return; }

    const dlg = document.getElementById(DIALOG_ID);
    const body = dlg && dlg.querySelector('[data-quiz-body]');
    const consentState = window.ConsentHelper && body
      ? window.ConsentHelper.read(body)
      : { consent: true, marketing: false };
    if (!consentState.consent) return;

    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'quiz',
        name: String(state.answers.name || '').trim(),
        phone: state.answers.phone || '',
        payload: {
          size: state.answers.size,
          finish: state.answers.finish,
          filtration: state.answers.filtration,
          options: state.answers.options,
          budget: state.answers.budget,
          timing: state.answers.timing
        },
        consent: true,
        marketing: consentState.marketing
      })
    }).catch((err) => console.error('[quiz] /api/leads failed', err));

    showThankYou();
  }

  function showThankYou() {
    const dlg = document.getElementById(DIALOG_ID);
    if (!dlg) return;
    const body = dlg.querySelector('[data-quiz-body]');
    if (!body) return;
    body.innerHTML = `
      <div class="quiz-thanks">
        <h3 class="quiz-thanks-title">Спасибо! Заявка принята</h3>
        <p class="quiz-thanks-text">Менеджер свяжется с вами в течение 10 минут</p>
        <button type="button" class="quiz-btn quiz-btn--next" data-quiz-close>Закрыть</button>
      </div>
    `;
  }

  function render() {
    const dlg = document.getElementById(DIALOG_ID);
    if (!dlg) return;
    const body = dlg.querySelector('[data-quiz-body]');
    if (!body) return;
    const step = STEPS[state.step - 1];
    let inner = '';
    if (step.type === 'single')        inner = renderSingle(step);
    else if (step.type === 'multi')    inner = renderMulti(step);
    else if (step.type === 'contacts') inner = renderContacts(step);
    body.innerHTML = inner + renderNav();

    if (step.type === 'contacts' && window.ConsentHelper) {
      const submitBtn = body.querySelector('[data-quiz-submit]');
      if (submitBtn) window.ConsentHelper.attach(body, submitBtn);
    }
  }

  function onBodyClick(e) {
    if (e.target.closest('[data-quiz-back]')) {
      if (state.step > 1) { state.step--; render(); }
      return;
    }
    if (e.target.closest('[data-quiz-next]')) {
      const v = validateStep(state.step, state.answers);
      if (!v.ok) { showError(v.message); return; }
      state.step++;
      render();
      return;
    }
    if (e.target.closest('[data-quiz-submit]')) {
      handleSubmit();
      return;
    }

    const pick = e.target.closest('[data-quiz-pick]');
    if (pick) {
      const step = STEPS[state.step - 1];
      if (step.type === 'single') {
        state.answers[step.id] = pick.getAttribute('data-quiz-pick');
        render();
      }
      return;
    }
    const toggle = e.target.closest('[data-quiz-toggle]');
    if (toggle) {
      const step = STEPS[state.step - 1];
      const value = toggle.getAttribute('data-quiz-toggle');
      const arr = state.answers[step.id];
      const idx = arr.indexOf(value);
      if (idx >= 0) arr.splice(idx, 1); else arr.push(value);
      render();
      return;
    }
  }

  function onBodyInput(e) {
    const target = e.target;
    if (!target || !target.getAttribute) return;
    const field = target.getAttribute('data-quiz-field');
    if (!field) return;
    if (field === 'phone') {
      const formatted = formatPhoneMask(target.value);
      target.value = formatted;
      target.setSelectionRange(formatted.length, formatted.length);
      state.answers.phone = formatted;
    } else {
      state.answers[field] = target.value;
    }
    showError('');
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-quiz-open]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        openQuiz();
      });
    });
  });

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

  window.__quiz = {
    normalizePhone,
    validateStep,
    _dev: {
      state: () => state,
      gotoStep: (n) => { state.step = n; render(); },
      open: openQuiz,
      close: closeQuiz
    }
  };
})();
