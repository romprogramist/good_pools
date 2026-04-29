(function () {
  'use strict';

  const DIALOG_ID = 'consultModal';
  let state = { name: '', phone: '', submitted: false };

  function ensureDialog() {
    let dlg = document.getElementById(DIALOG_ID);
    if (dlg) return dlg;
    dlg = document.createElement('dialog');
    dlg.id = DIALOG_ID;
    dlg.className = 'consult-modal';
    dlg.innerHTML = renderForm();
    document.body.appendChild(dlg);

    dlg.addEventListener('click', (e) => {
      if (e.target === dlg) closeConsult();
      if (e.target.closest('[data-consult-close]')) closeConsult();
    });
    dlg.addEventListener('input', onInput);
    dlg.addEventListener('submit', onSubmit);
    dlg.addEventListener('close', () => {
      state = { name: '', phone: '', submitted: false };
    });

    return dlg;
  }

  function renderForm() {
    return `
      <button type="button" class="consult-close" aria-label="Закрыть" data-consult-close>×</button>
      <div class="consult-body" data-consult-body>
        <h2 class="consult-title">
          Давайте начнём
          <span class="consult-title-accent">с бесплатной консультации?</span>
        </h2>
        <p class="consult-lead">Оставьте заявку и наш менеджер свяжется с вами и расскажет о возможных вариантах строительства.</p>
        <form class="consult-form" data-consult-form novalidate>
          <label class="consult-field">
            <input type="text" name="name" class="consult-input" placeholder="Имя" autocomplete="name" data-consult-name>
          </label>
          <label class="consult-field">
            <input type="tel" name="phone" class="consult-input" placeholder="+7 (000) 000-00-00" autocomplete="tel" inputmode="tel" data-consult-phone>
          </label>
          <p class="consult-error" data-consult-error hidden></p>
          <button type="submit" class="consult-submit">Получить консультацию</button>
          <p class="consult-disclaimer">Нажимая на кнопку вы соглашаетесь на обработку данных</p>
        </form>
      </div>
    `;
  }

  function renderThanks() {
    return `
      <button type="button" class="consult-close" aria-label="Закрыть" data-consult-close>×</button>
      <div class="consult-body consult-thanks">
        <h2 class="consult-title">Спасибо!</h2>
        <p class="consult-lead">Менеджер свяжется с вами в ближайшее время.</p>
        <button type="button" class="consult-submit" data-consult-close>Закрыть</button>
      </div>
    `;
  }

  function openConsult() {
    const dlg = ensureDialog();
    if (state.submitted) dlg.innerHTML = renderForm();
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
    const nameInput = dlg.querySelector('[data-consult-name]');
    if (nameInput) setTimeout(() => nameInput.focus(), 50);
  }

  function closeConsult() {
    const dlg = document.getElementById(DIALOG_ID);
    if (dlg && dlg.open) dlg.close();
  }

  function onInput(e) {
    const t = e.target;
    if (t && t.matches('[data-consult-phone]')) {
      const formatted = formatPhoneMask(t.value);
      if (formatted !== t.value) t.value = formatted;
      state.phone = normalizePhone(t.value);
    } else if (t && t.matches('[data-consult-name]')) {
      state.name = t.value;
    }
  }

  function onSubmit(e) {
    if (!e.target.matches('[data-consult-form]')) return;
    e.preventDefault();
    const err = validate();
    const errEl = e.target.querySelector('[data-consult-error]');
    if (err) {
      errEl.textContent = err;
      errEl.hidden = false;
      return;
    }
    errEl.hidden = true;

    console.log('[consult] submit', { name: state.name.trim(), phone: state.phone });
    // TODO: replace with POST /api/leads when backend is ready

    state.submitted = true;
    const dlg = document.getElementById(DIALOG_ID);
    if (dlg) dlg.innerHTML = renderThanks();
  }

  function validate() {
    if (!state.name.trim()) return 'Укажите имя';
    if (state.phone.length < 11) return 'Введите телефон полностью';
    return null;
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

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.btn-consult').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        openConsult();
      });
    });
  });
})();
