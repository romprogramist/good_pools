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

  function render() {
    const dlg = document.getElementById(DIALOG_ID);
    if (!dlg) return;
    const body = dlg.querySelector('[data-quiz-body]');
    if (!body) return;
    const step = STEPS[state.step - 1];
    if (step.type === 'single')      body.innerHTML = renderSingle(step);
    else if (step.type === 'multi')  body.innerHTML = renderMulti(step);
    else body.innerHTML = `<p style="padding:24px 0;text-align:center;color:#888;">Шаг ${state.step} (тип ${step.type} — будет в следующих задачах)</p>`;
  }

  function onBodyClick(e) {
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
