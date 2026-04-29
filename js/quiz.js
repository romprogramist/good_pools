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
