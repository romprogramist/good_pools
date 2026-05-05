(function () {
  const CONTACT_PHONE = '79613201050';

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('serviceForm');
    if (!form) return;

    const toast = document.getElementById('serviceToast');
    const submitBtn = form.querySelector('.service-submit');
    if (window.ConsentHelper && submitBtn) window.ConsentHelper.attach(form, submitBtn);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const result = readAndValidate(form);
      if (!result.ok) {
        result.firstInvalid && result.firstInvalid.focus();
        return;
      }

      const consentState = window.ConsentHelper
        ? window.ConsentHelper.read(form)
        : { consent: true, marketing: false };
      if (!consentState.consent) return;

      const text = buildMessage(result.data);
      const url = `https://wa.me/${CONTACT_PHONE}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank', 'noopener');
      showToast(toast, 'Отправляем заявку…');

      fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'service',
          name: result.data.name,
          phone: result.data.phone,
          payload: {
            size: result.data.size,
            year: result.data.year,
            automation: result.data.automation,
            comment: result.data.comment
          },
          consent: true,
          marketing: consentState.marketing
        })
      }).catch((err) => console.error('[service] /api/leads failed', err));
    });

    form.querySelectorAll('input, textarea').forEach((el) => {
      el.addEventListener('input', () => {
        const name = el.name;
        if (!name || name === 'automation') return;
        const errorId = 'sf' + name.charAt(0).toUpperCase() + name.slice(1) + 'Error';
        clearError(el, errorId);
      });
    });
    form.querySelectorAll('input[name="automation"]').forEach((el) => {
      el.addEventListener('change', () => {
        clearError(form.querySelector('.service-radio-group'), 'sfAutomationError');
      });
    });
  });

  function readAndValidate(form, opts = {}) {
    const silent = !!opts.silent;
    const data = {
      name: form.elements.name.value.trim(),
      phone: form.elements.phone.value.trim(),
      size: form.elements.size.value.trim(),
      year: form.elements.year.value.trim(),
      automation: (form.querySelector('input[name="automation"]:checked') || {}).value || '',
      comment: form.elements.comment.value.trim(),
    };

    let firstInvalid = null;
    const phoneOk = /^[0-9+\-\s()]{10,}$/.test(data.phone);
    const yearNum = parseInt(data.year, 10);
    const yearOk = !Number.isNaN(yearNum) && yearNum >= 1990 && yearNum <= 2026;

    const checks = [
      [form.elements.name, data.name.length >= 2, 'Введите имя (мин. 2 символа)', 'sfNameError'],
      [form.elements.phone, phoneOk, 'Введите корректный телефон', 'sfPhoneError'],
      [form.elements.size, data.size.length > 0, 'Укажите размер бассейна', 'sfSizeError'],
      [form.elements.year, yearOk, 'Год от 1990 до 2026', 'sfYearError'],
      [form.querySelector('.service-radio-group'), data.automation.length > 0, 'Выберите вариант', 'sfAutomationError'],
    ];

    for (const [el, valid, message, errorId] of checks) {
      if (valid) {
        if (!silent) clearError(el, errorId);
      } else {
        if (!silent) setError(el, message, errorId);
        if (!firstInvalid) firstInvalid = el;
      }
    }

    return { ok: !firstInvalid, firstInvalid, data };
  }

  function setError(el, message, errorId) {
    el.setAttribute('aria-invalid', 'true');
    const err = document.getElementById(errorId);
    if (err) err.textContent = message;
  }

  function clearError(el, errorId) {
    el.removeAttribute('aria-invalid');
    if (errorId) {
      const err = document.getElementById(errorId);
      if (err) err.textContent = '';
    }
  }

  function buildMessage(d) {
    return [
      'Заявка на сервисное обслуживание',
      '',
      `Имя: ${d.name}`,
      `Телефон: ${d.phone}`,
      `Размер бассейна: ${d.size}`,
      `Год постройки: ${d.year}`,
      `Автоматика химии: ${d.automation}`,
      `Комментарий: ${d.comment || '—'}`,
    ].join('\n');
  }

  let toastTimer = null;
  function showToast(el, message) {
    if (!el) return;
    el.textContent = message;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.textContent = ''; }, 3500);
  }
})();
