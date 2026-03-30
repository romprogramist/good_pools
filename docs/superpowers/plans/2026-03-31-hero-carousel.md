# Hero 3D Carousel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hero section in `index.html` with a 3D CSS carousel of 10 pool category cards, where selecting a card changes the full-screen background image.

**Architecture:** Single-file changes to `index.html`. New CSS styles for 3D carousel + background layer. New JS for carousel rotation, click handling, and touch swipe. Existing hero CSS (brand, pillars, categories, CTA) removed. Existing hero HTML (`.hero-inner` content) replaced.

**Tech Stack:** HTML, CSS (3D transforms), vanilla JS. No external dependencies.

**Spec:** `docs/superpowers/specs/2026-03-31-hero-carousel-design.md`

---

### File Map

- **Modify:** `index.html`
  - **CSS (lines 61-283):** Remove old hero content styles (`.hero-brand`, `.hero-pillars`, `.pillar`, `.hero-cta`, `.btn-calc`, `.cta-text`, `.categories-wrap`, `.categories-track`, `.cat-item`, `.cat-icon`, `.cat-label`, related media queries). Replace `.hero` background. Add new carousel CSS.
  - **HTML (lines 534-646):** Replace `.hero-inner` content (lines 549-624) with carousel HTML + background layer. Keep `.bubbles` and `.waves`.
  - **JS (lines 648-719):** Add carousel JS (rotation, click, swipe). Keep ripple and lightbox JS.

---

### Task 1: Remove old hero CSS and add carousel CSS

**Files:**
- Modify: `index.html` lines 61-283 (CSS section)

- [ ] **Step 1: Remove old hero content CSS**

Remove these CSS blocks (keep `.hero` base rule but change its background, keep `.hero::before`, `.hero::after` caustics, keep `@keyframes caustics/caustics2`):

Remove completely:
```css
/* Lines 101-150: hero-inner, hero-brand, hero-pillars, pillar, hero-cta, btn-calc, cta-text */
.hero-inner { ... }
.hero-brand { ... }
.hero-brand .line1 { ... }
.hero-brand .line2 { ... }
.hero-pillars { ... }
.pillar { ... }
.pillar::after { ... }
.hero-cta { ... }
.btn-calc { ... }
.btn-calc:hover { ... }
.cta-text { ... }
.cta-text strong { ... }

/* Lines 246-283: categories styles */
.categories-wrap { ... }
.categories-track { ... }
.categories-track::-webkit-scrollbar { ... }
.cat-item { ... }  (the hero one — NOT the catalog .cat-item if separate)
.cat-item:hover { ... }
.cat-icon { ... }
.cat-item:hover .cat-icon { ... }
.cat-icon svg { ... }
.cat-label { ... }
@media (max-width:768px) { .categories-wrap ... .cat-item ... .cat-icon ... .cat-label ... }
```

- [ ] **Step 2: Modify .hero base rule**

Change the `.hero` rule at line 62 — remove the static gradient background (it will come from background images now), keep everything else:

```css
.hero {
  position:relative; min-height:92vh; display:flex; align-items:center;
  justify-content:center; padding:80px 60px 140px; overflow:hidden;
  background:#0e1e30;
}
```

- [ ] **Step 3: Add carousel CSS**

Insert after the caustics `@keyframes` rules (after line 99), replacing the old `.hero-inner` block:

```css
/* ===== HERO BACKGROUND IMAGES ===== */
.hero-bg-layer {
  position:absolute; top:0; left:0; right:0; bottom:0; z-index:0;
}
.hero-bg-layer img {
  position:absolute; top:0; left:0; width:100%; height:100%;
  object-fit:cover; opacity:0; transition:opacity 0.8s ease;
}
.hero-bg-layer img.active { opacity:1; }
.hero-overlay {
  position:absolute; top:0; left:0; right:0; bottom:0; z-index:1;
  background:linear-gradient(
    to bottom,
    rgba(14,30,48,0.6) 0%,
    rgba(14,30,48,0.3) 40%,
    rgba(14,30,48,0.5) 70%,
    rgba(14,30,48,0.8) 100%
  );
}

/* ===== HERO CONTENT ===== */
.hero-inner {
  position:relative; z-index:5; width:100%; max-width:1400px;
  display:flex; flex-direction:column; align-items:center; text-align:center;
}

/* ===== 3D CAROUSEL ===== */
.carousel-scene {
  width:350px; height:450px; perspective:1000px;
  position:relative; margin:0 auto 40px;
}
.carousel-rotor {
  width:100%; height:100%; position:relative;
  transform-style:preserve-3d;
  transition:transform 0.6s cubic-bezier(0.25,0.46,0.45,0.94);
}
.carousel-card {
  position:absolute; top:0; left:0; width:100%; height:100%;
  backface-visibility:hidden;
  border-radius:20px; overflow:hidden;
  box-shadow:0 10px 40px rgba(0,0,0,0.4);
  cursor:pointer;
  transition:filter 0.6s ease, opacity 0.6s ease;
}
.carousel-card img {
  width:100%; height:100%; object-fit:cover;
}
.carousel-card .card-label {
  position:absolute; bottom:0; left:0; right:0;
  padding:40px 20px 20px;
  background:linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%);
  color:#fff; font-size:18px; font-weight:700; letter-spacing:1px;
  text-transform:uppercase;
}
.carousel-card.active {
  filter:brightness(1);
  z-index:10;
}
.carousel-card.neighbor {
  filter:brightness(0.6);
}
.carousel-card.far {
  filter:brightness(0.4);
}
.carousel-card.hidden {
  opacity:0; pointer-events:none;
}

/* ===== CTA BUTTON ===== */
.hero-section-btn {
  display:inline-block; padding:18px 44px;
  font-family:inherit; font-size:15px; font-weight:700;
  text-transform:uppercase; letter-spacing:3px;
  color:#e0f2fe; background:rgba(14,165,233,0.15);
  border:2px solid rgba(14,165,233,0.4); border-radius:14px;
  cursor:pointer; text-decoration:none;
  transition:all 0.3s; backdrop-filter:blur(10px);
}
.hero-section-btn:hover {
  background:rgba(14,165,233,0.25); border-color:#38bdf8;
  box-shadow:0 8px 30px rgba(14,165,233,0.2);
}

/* ===== CAROUSEL RESPONSIVE ===== */
@media (max-width:768px) {
  .carousel-scene {
    width:250px; height:320px; perspective:600px;
  }
  .carousel-card .card-label {
    font-size:14px; padding:30px 14px 14px;
  }
  .hero-section-btn {
    padding:14px 32px; font-size:13px;
  }
}
```

- [ ] **Step 4: Verify in browser**

Open http://localhost:8000 — the page should load without errors. The hero section will look broken (no HTML content yet) but no CSS errors in console.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "refactor: replace hero CSS with 3D carousel styles"
```

---

### Task 2: Replace hero HTML content

**Files:**
- Modify: `index.html` lines 534-646 (HTML section)

- [ ] **Step 1: Add background image layer**

Insert immediately after `<div class="hero" id="heroSection">` (line 534), before the `<!-- Bubbles -->` comment:

```html
  <!-- Background images -->
  <div class="hero-bg-layer" id="heroBg">
    <img src="https://images.unsplash.com/photo-1572331165267-854da2b021b1?w=1920&q=80" alt="" class="active">
    <img src="https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?w=1920&q=80" alt="">
    <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&q=80" alt="">
    <img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1920&q=80" alt="">
    <img src="https://images.unsplash.com/photo-1504309092620-4d0ec726efa4?w=1920&q=80" alt="">
    <img src="https://images.unsplash.com/photo-1499793983394-e58e3a9b999a?w=1920&q=80" alt="">
    <img src="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1920&q=80" alt="">
    <img src="https://images.unsplash.com/photo-1563855072100-a8873a6eb5f3?w=1920&q=80" alt="">
    <img src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=1920&q=80" alt="">
    <img src="https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1920&q=80" alt="">
  </div>
  <div class="hero-overlay"></div>
```

Note: image URLs are placeholders from Unsplash — each matches a pool category theme:
1. Композитные чаши — composite pool bowl
2. Композитные бассейны — composite pool
3. Строительство бассейнов — pool construction
4. Сервисное обслуживание — pool service/maintenance
5. Оборудование — pool equipment
6. Павильоны — pool pavilion/enclosure
7. Отделка бассейнов — pool tiling/finishing
8. Химия для бассейнов — pool chemistry
9. Подогрев воды — heated pool/steam
10. Освещение — pool lighting

- [ ] **Step 2: Replace .hero-inner content**

Replace everything inside `<div class="hero-inner">` (from `<!-- Categories inside hero -->` through `</div>` of `.hero-cta`) with the carousel:

```html
  <!-- Content -->
  <div class="hero-inner">
    <div class="carousel-scene" id="carouselScene">
      <div class="carousel-rotor" id="carouselRotor">
        <div class="carousel-card" data-index="0">
          <img src="https://images.unsplash.com/photo-1572331165267-854da2b021b1?w=600&q=80" alt="Композитные чаши">
          <div class="card-label">Композитные чаши</div>
        </div>
        <div class="carousel-card" data-index="1">
          <img src="https://images.unsplash.com/photo-1575429198097-0414ec08e8cd?w=600&q=80" alt="Композитные бассейны">
          <div class="card-label">Композитные бассейны</div>
        </div>
        <div class="carousel-card" data-index="2">
          <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80" alt="Строительство бассейнов">
          <div class="card-label">Строительство бассейнов</div>
        </div>
        <div class="carousel-card" data-index="3">
          <img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80" alt="Сервисное обслуживание">
          <div class="card-label">Сервисное обслуживание</div>
        </div>
        <div class="carousel-card" data-index="4">
          <img src="https://images.unsplash.com/photo-1504309092620-4d0ec726efa4?w=600&q=80" alt="Оборудование">
          <div class="card-label">Оборудование</div>
        </div>
        <div class="carousel-card" data-index="5">
          <img src="https://images.unsplash.com/photo-1499793983394-e58e3a9b999a?w=600&q=80" alt="Павильоны">
          <div class="card-label">Павильоны</div>
        </div>
        <div class="carousel-card" data-index="6">
          <img src="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&q=80" alt="Отделка бассейнов">
          <div class="card-label">Отделка бассейнов</div>
        </div>
        <div class="carousel-card" data-index="7">
          <img src="https://images.unsplash.com/photo-1563855072100-a8873a6eb5f3?w=600&q=80" alt="Химия для бассейнов">
          <div class="card-label">Химия для бассейнов</div>
        </div>
        <div class="carousel-card" data-index="8">
          <img src="https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600&q=80" alt="Подогрев воды">
          <div class="card-label">Подогрев воды</div>
        </div>
        <div class="carousel-card" data-index="9">
          <img src="https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80" alt="Освещение">
          <div class="card-label">Освещение</div>
        </div>
      </div>
    </div>

    <a href="#" class="hero-section-btn" id="heroBtn">Перейти в раздел</a>
  </div>
```

- [ ] **Step 3: Verify HTML structure**

Open http://localhost:8000 — cards should be visible (stacked on top of each other since JS hasn't positioned them yet). Background image should show. No console errors.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add hero carousel HTML with background images"
```

---

### Task 3: Add carousel JavaScript

**Files:**
- Modify: `index.html` — add JS inside existing `<script>` block (line 648), before the `const sliderImages` line

- [ ] **Step 1: Add carousel initialization and rotation JS**

Insert at the beginning of the `<script>` tag (after `<script>` on line 648, before the heroSection click listener):

```javascript
// ===== 3D CAROUSEL =====
(function() {
  const rotor = document.getElementById('carouselRotor');
  const cards = Array.from(rotor.querySelectorAll('.carousel-card'));
  const bgImages = Array.from(document.getElementById('heroBg').querySelectorAll('img'));
  const heroBtn = document.getElementById('heroBtn');
  const scene = document.getElementById('carouselScene');
  const total = cards.length;
  const angleStep = 360 / total; // 36 degrees
  let currentIndex = 0;

  // Determine translateZ based on viewport
  function getRadius() {
    return window.innerWidth <= 768 ? 250 : 450;
  }

  // Position all cards in 3D space
  function layoutCards() {
    const radius = getRadius();
    cards.forEach(function(card, i) {
      card.style.transform = 'rotateY(' + (i * angleStep) + 'deg) translateZ(' + radius + 'px)';
    });
  }

  // Rotate to show card at given index
  function goTo(index) {
    // Wrap around for infinite loop
    currentIndex = ((index % total) + total) % total;
    var radius = getRadius();
    rotor.style.transform = 'translateZ(-' + radius + 'px) rotateY(' + (-currentIndex * angleStep) + 'deg)';

    // Update card classes for visibility/dimming
    cards.forEach(function(card, i) {
      var diff = Math.abs(currentIndex - i);
      // Handle wrap-around distance
      if (diff > total / 2) diff = total - diff;

      card.classList.remove('active', 'neighbor', 'far', 'hidden');
      if (diff === 0) {
        card.classList.add('active');
      } else if (diff === 1) {
        card.classList.add('neighbor');
      } else if (diff === 2) {
        card.classList.add('far');
      } else {
        card.classList.add('hidden');
      }
    });

    // Crossfade background
    bgImages.forEach(function(img, i) {
      img.classList.toggle('active', i === currentIndex);
    });
  }

  // Click on card to select it
  cards.forEach(function(card) {
    card.addEventListener('click', function() {
      var idx = parseInt(card.getAttribute('data-index'), 10);
      goTo(idx);
    });
  });

  // Touch swipe support
  var touchStartX = 0;
  var touchStartY = 0;
  var isSwiping = false;

  scene.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isSwiping = false;
  }, { passive: true });

  scene.addEventListener('touchmove', function(e) {
    if (!isSwiping) {
      var dx = Math.abs(e.touches[0].clientX - touchStartX);
      var dy = Math.abs(e.touches[0].clientY - touchStartY);
      if (dx > dy && dx > 10) {
        isSwiping = true;
      }
    }
  }, { passive: true });

  scene.addEventListener('touchend', function(e) {
    if (!isSwiping) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) {
      goTo(currentIndex + (dx < 0 ? 1 : -1));
    }
  });

  // Mouse drag support for desktop
  var mouseStartX = 0;
  var mouseDragging = false;

  scene.addEventListener('mousedown', function(e) {
    mouseStartX = e.clientX;
    mouseDragging = true;
    e.preventDefault();
  });

  document.addEventListener('mousemove', function(e) {
    if (!mouseDragging) return;
  });

  document.addEventListener('mouseup', function(e) {
    if (!mouseDragging) return;
    mouseDragging = false;
    var dx = e.clientX - mouseStartX;
    if (Math.abs(dx) > 40) {
      goTo(currentIndex + (dx < 0 ? 1 : -1));
    }
  });

  // Recalculate on resize
  window.addEventListener('resize', function() {
    layoutCards();
    goTo(currentIndex);
  });

  // Initialize
  layoutCards();
  goTo(0);
})();
```

- [ ] **Step 2: Verify in browser**

Open http://localhost:8000:
- 3D carousel should be visible with cards arranged in a circle
- Active card (index 0) should be front and bright
- Neighboring cards should be dimmed
- Clicking a visible card should rotate carousel to it
- Background should crossfade when switching cards
- Swiping on mobile (use Chrome DevTools mobile emulator) should switch cards
- "Перейти в раздел" button should be visible below carousel

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add 3D carousel JavaScript with click and swipe"
```

---

### Task 4: Visual polish and responsive tuning

**Files:**
- Modify: `index.html` (CSS section)

- [ ] **Step 1: Test and adjust desktop layout**

Open http://localhost:8000 at full width. Check:
1. Are 5 cards visible (active + 2 neighbors + 2 far)?
2. Is the perspective/radius correct (cards not overlapping too much or too spread)?
3. Does the background crossfade smoothly?
4. Does clicking work?

If `translateZ(450px)` makes cards too spread or too tight, adjust the `getRadius()` return value and `.carousel-scene` perspective in CSS. Common adjustments:
- If cards overlap too much: increase radius (e.g., 500px) and scene width
- If cards are too far apart: decrease radius (e.g., 400px)
- If 3D effect is too extreme: increase perspective (e.g., 1200px)

- [ ] **Step 2: Test and adjust mobile layout**

Open Chrome DevTools, toggle device toolbar (Ctrl+Shift+M), select iPhone 12/13 Pro. Check:
1. Are 3 cards visible?
2. Does swipe work?
3. Is card size appropriate (250x320)?
4. Does the "Перейти в раздел" button fit?

- [ ] **Step 3: Fix any visual issues found**

Apply fixes directly in the CSS. Common fixes:
- Card overlap: adjust `translateZ` in JS `getRadius()`
- Text readability: adjust `.hero-overlay` gradient opacity
- Card label cut off: adjust `.card-label` padding

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "fix: tune carousel layout and responsive breakpoints"
```

---

### Task 5: Clean up removed code

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Remove orphaned CSS**

Check for any remaining CSS rules that reference removed HTML elements:
- `.hero-brand`, `.hero-pillars`, `.pillar`, `.hero-cta`, `.btn-calc`, `.cta-text`
- `.categories-wrap`, `.categories-track`, `.cat-item` (the hero version), `.cat-icon`, `.cat-label`

Search the file for these selectors and remove any that remain.

- [ ] **Step 2: Verify nothing is broken**

Open http://localhost:8000:
- Hero carousel works as before
- Catalog section below still renders correctly (it uses `.cat-header`, `.cat-grid`, `.pcard` — these must NOT be removed)
- Lightbox still works (click pool cards in catalog)
- No console errors

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "chore: remove orphaned hero CSS from old layout"
```
