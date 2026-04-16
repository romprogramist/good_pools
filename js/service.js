(function () {
  const CONTACT_PHONE = '79613201050';
  const TG_URL = 'https://t.me/+79613201050';

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('serviceForm');
    if (!form) return;

    const tgLink = document.getElementById('serviceTgLink');
    const toast = document.getElementById('serviceToast');

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const result = readAndValidate(form);
      if (!result.ok) {
        result.firstInvalid && result.firstInvalid.focus();
        return;
      }
      const text = buildMessage(result.data);
      const url = `https://wa.me/${CONTACT_PHONE}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank', 'noopener');
      showToast(toast, 'Открываем WhatsApp…');
    });

    tgLink.addEventListener('click', async (e) => {
      e.preventDefault();
      const result = readAndValidate(form, { silent: true });
      if (result.ok) {
        const text = buildMessage(result.data);
        try {
          await navigator.clipboard.writeText(text);
          showToast(toast, 'Текст заявки скопирован — вставьте в Telegram');
        } catch {
          showToast(toast, 'Откройте Telegram и напишите нам');
        }
      }
      window.open(TG_URL, '_blank', 'noopener');
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
