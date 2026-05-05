// Interest popup UI. Listens to interest:trigger from interest-tracker.js,
// shows a toast → on click expands to a <dialog> with the lead form.
// Submit goes to console.log + UI "Спасибо" (no backend in phase 1).
// See docs/superpowers/specs/2026-05-04-interest-popup-design.md.

(function () {
  'use strict';

  const TOAST_ID = 'interestToast';
  const DIALOG_ID = 'interestDialog';

  let state = {
    id: null,
    name: '',
    submitted: false,
    form: { name: '', phone: '', location: '' }
  };

  document.addEventListener('interest:trigger', function (e) {
    const detail = e.detail || {};
    if (!detail.id) return;
    state.id = detail.id;
    state.name = detail.name || '';
    state.submitted = false;
    state.form = { name: '', phone: '', location: '' };
    showToast();
  });

  document.addEventListener('gallery:close', function () {
    const toast = document.getElementById(TOAST_ID);
    if (toast && !state.submitted) {
      if (window.InterestTracker) window.InterestTracker.markDismissed(state.id);
      removeToast();
    }
    const dlg = document.getElementById(DIALOG_ID);
    if (dlg && dlg.open && !state.submitted) {
      if (window.InterestTracker) window.InterestTracker.markDismissed(state.id);
      dlg.close();
    }
  });

  function showToast() {
    let toast = document.getElementById(TOAST_ID);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = TOAST_ID;
      toast.className = 'interest-toast';
      toast.setAttribute('role', 'dialog');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.innerHTML =
      '<button type="button" class="interest-toast__close" aria-label="Закрыть" data-itoast-close>×</button>' +
      '<div class="interest-toast__body" data-itoast-expand>' +
        '<div class="interest-toast__title">Понравилась ' + escapeHtml(state.name) + '?</div>' +
        '<div class="interest-toast__text">Расскажем, как примерить её на ваш участок — без обязательств.</div>' +
        '<div class="interest-toast__cta">→</div>' +
      '</div>';
    toast.classList.remove('interest-toast--leave');
    requestAnimationFrame(function () { toast.classList.add('interest-toast--enter'); });

    toast.querySelector('[data-itoast-close]').addEventListener('click', function (e) {
      e.stopPropagation();
      if (window.InterestTracker) window.InterestTracker.markDismissed(state.id);
      removeToast();
    });
    toast.querySelector('[data-itoast-expand]').addEventListener('click', function () {
      removeToast();
      openDialog();
    });
  }

  function removeToast() {
    const toast = document.getElementById(TOAST_ID);
    if (!toast) return;
    toast.classList.remove('interest-toast--enter');
    toast.classList.add('interest-toast--leave');
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 220);
  }

  function openDialog() {
    let dlg = document.getElementById(DIALOG_ID);
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = DIALOG_ID;
      dlg.className = 'interest-dialog';
      document.body.appendChild(dlg);
      dlg.addEventListener('click', function (e) {
        if (e.target === dlg) closeDialog();
        if (e.target.closest('[data-idlg-close]')) closeDialog();
      });
      dlg.addEventListener('input', onInput);
      dlg.addEventListener('submit', onSubmit);
    }
    dlg.innerHTML = renderForm();
    if (window.ConsentHelper) {
      const form = dlg.querySelector('[data-idlg-form]');
      const submitBtn = dlg.querySelector('.interest-dialog__submit');
      if (form && submitBtn) window.ConsentHelper.attach(form, submitBtn);
    }
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
    setTimeout(function () {
      const nameInput = dlg.querySelector('[data-idlg-name]');
      if (nameInput) nameInput.focus();
    }, 50);
  }

  function closeDialog() {
    const dlg = document.getElementById(DIALOG_ID);
    if (!dlg || !dlg.open) return;
    if (!state.submitted) {
      if (window.InterestTracker) window.InterestTracker.markDismissed(state.id);
    }
    dlg.close();
  }

  function renderForm() {
    return (
      '<button type="button" class="interest-dialog__close" aria-label="Закрыть" data-idlg-close>×</button>' +
      '<div class="interest-dialog__body">' +
        '<h2 class="interest-dialog__title">Примерим ' + escapeHtml(state.name) + ' у вас на участке</h2>' +
        '<p class="interest-dialog__lead">Менеджер свяжется в течение дня, расскажет про монтаж и подготовит расчёт под ваш участок.</p>' +
        '<form class="interest-dialog__form" data-idlg-form novalidate>' +
          '<label class="interest-dialog__field">' +
            '<input type="text" name="name" class="interest-dialog__input" placeholder="Имя" autocomplete="name" data-idlg-name>' +
          '</label>' +
          '<label class="interest-dialog__field">' +
            '<input type="tel" name="phone" class="interest-dialog__input" placeholder="+7 (000) 000-00-00" autocomplete="tel" inputmode="tel" data-idlg-phone>' +
          '</label>' +
          '<details class="interest-dialog__details">' +
            '<summary class="interest-dialog__summary">Указать участок (необязательно)</summary>' +
            '<label class="interest-dialog__field">' +
              '<input type="text" name="location" class="interest-dialog__input" placeholder="Адрес или размер участка" data-idlg-location>' +
            '</label>' +
          '</details>' +
          '<p class="interest-dialog__error" data-idlg-error hidden></p>' +
          '<label class="consent">' +
            '<input type="checkbox" name="consent" required>' +
            '<span>Я согласен с <a href="/privacy.html" target="_blank">Политикой обработки персональных данных</a></span>' +
          '</label>' +
          '<label class="consent consent--marketing">' +
            '<input type="checkbox" name="marketing">' +
            '<span>Согласен получать рекламные сообщения и информацию об акциях</span>' +
          '</label>' +
          '<button type="submit" class="interest-dialog__submit">Отправить заявку</button>' +
        '</form>' +
      '</div>'
    );
  }

  function renderThanks() {
    return (
      '<button type="button" class="interest-dialog__close" aria-label="Закрыть" data-idlg-close>×</button>' +
      '<div class="interest-dialog__body interest-dialog__thanks">' +
        '<h2 class="interest-dialog__title">Спасибо!</h2>' +
        '<p class="interest-dialog__lead">Менеджер свяжется в ближайшее время.</p>' +
        '<button type="button" class="interest-dialog__submit" data-idlg-close>Закрыть</button>' +
      '</div>'
    );
  }

  function onInput(e) {
    const t = e.target;
    if (!t) return;
    if (t.matches('[data-idlg-phone]')) {
      const formatted = formatPhoneMask(t.value);
      if (formatted !== t.value) t.value = formatted;
      state.form.phone = normalizePhone(t.value);
    } else if (t.matches('[data-idlg-name]')) {
      state.form.name = t.value;
    } else if (t.matches('[data-idlg-location]')) {
      state.form.location = t.value;
    }
  }

  function onSubmit(e) {
    if (!e.target.matches('[data-idlg-form]')) return;
    e.preventDefault();
    const err = validate();
    const errEl = e.target.querySelector('[data-idlg-error]');
    if (err) {
      errEl.textContent = err;
      errEl.hidden = false;
      return;
    }
    errEl.hidden = true;

    const consentState = window.ConsentHelper
      ? window.ConsentHelper.read(e.target)
      : { consent: true, marketing: false };
    if (!consentState.consent) return;

    const snap = window.InterestTracker
      ? window.InterestTracker.getSnapshot(state.id)
      : { score: null, opens: null, photosViewed: null, activeSeconds: null, triggeredAt: null };

    fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'interest-popup',
        name: state.form.name.trim(),
        phone: state.form.phone,
        payload: {
          model_id: state.id,
          model_name: state.name,
          location: state.form.location.trim(),
          score: snap.score,
          signals: {
            activeSeconds: snap.activeSeconds,
            photosViewed: snap.photosViewed,
            opens: snap.opens
          },
          triggeredAt: snap.triggeredAt
        },
        consent: true,
        marketing: consentState.marketing
      })
    }).catch((err) => console.error('[interest-popup] /api/leads failed', err));

    state.submitted = true;
    if (window.InterestTracker) window.InterestTracker.markSubmitted(state.id);

    const dlg = document.getElementById(DIALOG_ID);
    if (dlg) dlg.innerHTML = renderThanks();
  }

  function validate() {
    if (!state.form.name.trim()) return 'Укажите имя';
    if (state.form.phone.length < 11) return 'Введите телефон полностью';
    return null;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  // Copies of formatPhoneMask / normalizePhone from js/consult.js — kept
  // local on purpose to keep modules independent (same approach as
  // consult.js vs quiz.js).
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
})();
