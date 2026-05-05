// Общий helper для форм с чекбоксом согласия на обработку ПД (152-ФЗ).
// Использование:
//   ConsentHelper.attach(formElement, submitButtonElement);
//   const { consent, marketing } = ConsentHelper.read(formElement);
(function () {
  'use strict';

  const ConsentHelper = {
    attach(form, submitBtn) {
      if (!form || !submitBtn) return;
      const required = form.querySelector('input[name="consent"]');
      if (!required) return;
      const sync = () => {
        const ok = required.checked;
        submitBtn.disabled = !ok;
        submitBtn.classList.toggle('consent-blocked', !ok);
      };
      required.addEventListener('change', sync);
      sync();
    },
    read(form) {
      const required = form.querySelector('input[name="consent"]');
      const marketing = form.querySelector('input[name="marketing"]');
      return {
        consent: !!(required && required.checked),
        marketing: !!(marketing && marketing.checked)
      };
    }
  };

  window.ConsentHelper = ConsentHelper;
})();
