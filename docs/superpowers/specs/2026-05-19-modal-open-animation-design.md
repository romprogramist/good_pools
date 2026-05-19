# Плавное открытие модальных диалогов

**Дата:** 2026-05-19
**Статус:** approved

## Контекст

После прошлой итерации motion-полировки на сайте плавно появляются:
- `.pgal-modal` (галерея) — fade + scale через `.is-open`
- `.menu-overlay` (мобильное меню) — slide + stagger
- `.interest-toast` (тостер) — translateY + fade
- `.cookie-banner` — slide-up

Три нативных `<dialog>` остались мгновенными — они снепаются в видимое состояние через `dialog.showModal()` без CSS-анимации:
- `.quiz-modal` (квиз — `js/quiz.js`)
- `.consult-modal` (форма консультации — `js/consult.js`)
- `.interest-dialog` (поп-ап интереса — `js/interest-popup.js`)

Цель — привести их к тому же fade+scale, что уже работает у `.pgal-modal`, чтобы сайт ощущался единообразно.

## Решение

Класс-ориентированный паттерн `.is-open` (Approach A, ранее рассмотренный), зеркало уже работающего `.pgal-modal`. Альтернативы `@starting-style` (требует Chrome 117+/Safari 17.4+) и wrapper-div (правка HTML/render-функций) отвергнуты — текущий паттерн уже прижился в проекте и работает везде.

### Motion-значения

| Параметр | Значение | Источник |
|---|---|---|
| Длительность | `var(--motion-slow)` (280ms) | существующий токен в `:root` |
| Easing для opacity | `var(--ease-out)` | существующий |
| Easing для transform | `var(--ease-spring)` | существующий |
| Стартовое состояние | `opacity: 0; transform: scale(0.96);` | матчит `.pgal-modal` |
| Конечное состояние | `opacity: 1; transform: scale(1);` | |
| Backdrop | `opacity` 0 → 1 | то же время |

Никаких новых motion-токенов не вводим.

### CSS-паттерн

В каждом из трёх CSS-файлов (`consult.css`, `quiz.css`, `interest-popup.css`) добавляется блок:

```css
.consult-modal {
  opacity: 0;
  transform: scale(0.96);
  transition:
    opacity var(--motion-slow) var(--ease-out),
    transform var(--motion-slow) var(--ease-spring);
}
.consult-modal.is-open { opacity: 1; transform: scale(1); }

.consult-modal::backdrop {
  opacity: 0;
  transition: opacity var(--motion-slow) var(--ease-out);
}
.consult-modal.is-open::backdrop { opacity: 1; }
```

(Класс-селектор подменяется на `.quiz-modal` / `.interest-dialog` в соответствующих файлах.)

Существующие свойства dialog'а (background, padding, max-width, border-radius и т.д.) остаются без изменений — добавляются только новые CSS-свойства поверх.

### JS-обёртки (одинаковые в каждом из трёх файлов)

```js
function openWithAnim(dlg) {
  dlg.showModal();
  requestAnimationFrame(() => dlg.classList.add('is-open'));
}

function closeWithAnim(dlg) {
  if (!dlg || !dlg.open) return;
  if (!dlg.classList.contains('is-open')) { dlg.close(); return; }
  dlg.classList.remove('is-open');
  setTimeout(() => { if (dlg.open) dlg.close(); }, 280);
}
```

Магическое число `280` в `setTimeout` сознательно дублирует значение `--motion-slow` — если когда-нибудь токен поменяется, эти три места в JS надо синхронизировать руками. Альтернатива (читать значение через `getComputedStyle(root).getPropertyValue('--motion-slow')`) добавляет шум ради гипотетического изменения — не стоит.

**Точки замены:**
- Все прямые `dlg.showModal()` → `openWithAnim(dlg)`
- Все прямые `dlg.close()` → `closeWithAnim(dlg)`

**Перехват ESC** (обязательно — иначе нативный `<dialog>` закрывается мгновенно, минуя анимацию):

```js
dlg.addEventListener('cancel', (e) => {
  e.preventDefault();
  closeWithAnim(dlg);
});
```

Подписку добавлять один раз — там же, где сейчас навешиваются click/submit-листенеры на dialog.

### Edge cases

1. **Двойной клик по «×» во время анимации закрытия** — гард `if (!dlg.classList.contains('is-open'))` в начале `closeWithAnim` пропускает второй вызов в no-op ветку.

2. **Click по backdrop** — каждая модалка уже проверяет `e.target === dlg`. Меняем направление вызова на `closeWithAnim(dlg)`.

3. **`consult.js` сбрасывает state в `'close'` event handler** — событие `close` нативного dialog'а fired только после фактического `dlg.close()` внутри нашего `setTimeout`. Существующая логика не ломается.

4. **`quiz.js` рендерит большие шаги во время открытого состояния** — мы не трогаем `dialog.open`, в течение анимации он остаётся true, ввод/submits работают как раньше.

5. **`interest-popup.js` использует `interest-dialog`** + переопределяет close через свой code path — обернуть оба места (toast → dialog, кнопка close).

### Доступность

- `dialog.showModal()` нативно ловит focus и блокирует страницу — мы это не трогаем.
- `aria-modal` остаётся нативным (для `<dialog>` он implicit).
- `prefers-reduced-motion: reduce` уже схлопывает `--motion-slow` до `1ms` на уровне `:root` в `style.css`. Дополнительного CSS не пишем.
- Закрытие через ESC, click outside, X-кнопку — все три пути проходят через `closeWithAnim`, анимация одинаковая.

## Файлы

| Файл | Изменение | Примерный объём |
|---|---|---|
| `css/consult.css` | +CSS-блок для fade+scale | +12 строк |
| `css/quiz.css` | +CSS-блок | +12 строк |
| `css/interest-popup.css` | +CSS-блок | +12 строк |
| `js/consult.js` | wrap open/close, добавить cancel handler | ~15 строк |
| `js/quiz.js` | то же | ~15 строк |
| `js/interest-popup.js` | то же | ~15 строк |
| `index.html` | bump cache-buster до `motion10` для затронутых файлов | trivial |
| `models.html` | то же | trivial |
| `catalog.html` | то же | trivial |
| `portfolio.html` | то же | trivial |

**Хардлинки:** правки HTML могут разорвать NTFS-хардлинки между корнем и `public/`. После последнего Edit'а — restore через `New-Item -ItemType HardLink -Force`, рецепт в `CLAUDE.md`.

## Вне scope

- `.pgal-modal`, `.menu-overlay`, `.cookie-banner`, `.interest-toast` — уже плавные.
- Никаких новых motion-токенов.
- Никаких изменений в `js/motion.js` (паттерн локален для трёх dialog'ов — выносить в общий хелпер преждевременно).
- Никаких изменений в HTML-разметке модалок (никакого wrapper-div'а).
- Никакого `@starting-style` / `transition-behavior: allow-discrete`.

## Acceptance criteria

1. При открытии quiz/consult/interest dialog плавно проявляется (fade + scale 0.96 → 1) с backdrop'ом за 280ms.
2. При закрытии (любым способом: X, ESC, click outside, submit success) — обратная анимация 280ms, dialog исчезает только по её завершении.
3. На устройстве/в браузере с `prefers-reduced-motion: reduce` анимация отсутствует (мгновенно open/close), что верифицируется через DevTools → Rendering → Emulate CSS prefers-reduced-motion.
4. Двойной клик по «×» во время closing-анимации не вызывает JS-ошибок и не оставляет dialog в подвешенном состоянии.
5. Формы (quiz/consult) сохраняют существующее поведение submit'а и валидации.
