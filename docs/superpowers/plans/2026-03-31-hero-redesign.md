# Hero Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite index.html from scratch with a fixed header and full-screen dark hero section containing category carousel, matching the provided prototype exactly.

**Architecture:** Single-page static HTML with external CSS and JS. Header is fixed top bar (light gray). Hero is 100vh black section split into left typography (40%) and right horizontal carousel (60%). Carousel uses CSS scroll-snap + vanilla JS for navigation.

**Tech Stack:** HTML5, CSS3 (Montserrat via Google Fonts, Flexbox, scroll-snap), Vanilla JS, SVG icons inline

---

### Task 1: Create directory structure and CSS foundation

**Files:**
- Create: `css/style.css`

- [ ] **Step 1: Create css directory and base styles**

```css
/* css/style.css */
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@200;300;400;600;700;800;900&display=swap');

*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Montserrat', 'Segoe UI', sans-serif;
  background: #111;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

/* ===== HEADER ===== */
.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 40px;
  height: 60px;
  background: #f5f5f5;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.hamburger {
  display: flex;
  flex-direction: column;
  gap: 5px;
  cursor: pointer;
  padding: 8px;
  background: none;
  border: none;
}

.hamburger span {
  display: block;
  width: 22px;
  height: 2px;
  background: #333;
  transition: all 0.3s;
}

.header-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
  background: none;
  border: none;
}

.header-icon:hover {
  background: rgba(0, 0, 0, 0.08);
}

.header-icon svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: #333;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ===== HERO ===== */
.hero {
  min-height: 100vh;
  background: #111;
  display: flex;
  align-items: center;
  padding-top: 60px; /* offset for fixed header */
}

.hero-left {
  width: 40%;
  padding-left: 60px;
  flex-shrink: 0;
}

.hero-title-bold {
  font-size: clamp(70px, 8vw, 110px);
  font-weight: 900;
  color: #fff;
  line-height: 0.95;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.hero-title-thin {
  font-size: clamp(70px, 8vw, 110px);
  font-weight: 200;
  color: #fff;
  line-height: 1.0;
  text-transform: uppercase;
  letter-spacing: 4px;
}

/* ===== CAROUSEL ===== */
.hero-right {
  width: 60%;
  position: relative;
  overflow: hidden;
  padding-right: 0;
}

.carousel-container {
  position: relative;
}

.carousel-track {
  display: flex;
  gap: 30px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-behavior: smooth;
  padding: 40px 40px 40px 20px;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.carousel-track::-webkit-scrollbar {
  display: none;
}

/* ===== CATEGORY CARD ===== */
.category-card {
  flex: 0 0 230px;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: transform 0.3s;
}

.category-card:hover {
  transform: translateY(-8px);
}

.card-image {
  width: 230px;
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.card-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.4));
}

.card-title {
  text-align: center;
  margin-bottom: 16px;
}

.card-title-bold {
  font-size: 16px;
  font-weight: 800;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 2px;
  line-height: 1.3;
}

.card-title-thin {
  font-size: 15px;
  font-weight: 300;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.card-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #555;
  transition: background 0.3s;
}

.category-card:hover .card-dot {
  background: #999;
}

/* ===== CAROUSEL ARROW ===== */
.carousel-arrow {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  z-index: 10;
  backdrop-filter: blur(4px);
}

.carousel-arrow:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
}

.carousel-arrow svg {
  width: 20px;
  height: 20px;
  stroke: #fff;
  stroke-width: 2;
  fill: none;
}

/* ===== MOBILE ===== */
@media (max-width: 768px) {
  .header {
    padding: 0 20px;
  }

  .hero {
    flex-direction: column;
    min-height: auto;
    padding-top: 80px;
    padding-bottom: 40px;
  }

  .hero-left {
    width: 100%;
    padding: 40px 24px;
    text-align: left;
  }

  .hero-title-bold,
  .hero-title-thin {
    font-size: clamp(48px, 12vw, 80px);
  }

  .hero-right {
    width: 100%;
  }

  .carousel-track {
    padding: 20px 24px;
    gap: 20px;
  }

  .category-card {
    flex: 0 0 180px;
  }

  .card-image {
    width: 180px;
    height: 170px;
  }

  .carousel-arrow {
    display: none;
  }
}
```

- [ ] **Step 2: Verify file created**

Run: `ls -la css/style.css`
Expected: File exists with non-zero size

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat: add CSS foundation for hero redesign"
```

---

### Task 2: Create index.html with header and hero structure

**Files:**
- Create (overwrite): `index.html`

- [ ] **Step 1: Write the complete index.html**

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Хорошие Бассейны</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>

  <!-- HEADER -->
  <header class="header">
    <div class="header-left">
      <button class="hamburger" aria-label="Меню">
        <span></span>
        <span></span>
        <span></span>
      </button>
      <span class="header-title">Мы строим</span>
    </div>
    <div class="header-right">
      <!-- Chat -->
      <button class="header-icon" aria-label="Чат">
        <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </button>
      <!-- Telegram -->
      <button class="header-icon" aria-label="Telegram">
        <svg viewBox="0 0 24 24"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
      </button>
      <!-- WhatsApp -->
      <button class="header-icon" aria-label="WhatsApp">
        <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
      </button>
      <!-- Search -->
      <button class="header-icon" aria-label="Поиск">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      </button>
      <!-- Profile -->
      <button class="header-icon" aria-label="Профиль">
        <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </button>
    </div>
  </header>

  <!-- HERO -->
  <section class="hero">
    <div class="hero-left">
      <div class="hero-title-bold">Хорошие</div>
      <div class="hero-title-thin">Бассейны</div>
    </div>

    <div class="hero-right">
      <div class="carousel-container">
        <div class="carousel-track">

          <div class="category-card">
            <div class="card-image">
              <img src="images/categories/composite-pool.png" alt="Композитные бассейны">
            </div>
            <div class="card-title">
              <div class="card-title-bold">Композитные</div>
              <div class="card-title-thin">бассейны</div>
            </div>
            <div class="card-dot"></div>
          </div>

          <div class="category-card">
            <div class="card-image">
              <img src="images/categories/custom-pool.png" alt="Бассейны кастом">
            </div>
            <div class="card-title">
              <div class="card-title-bold">Бассейны</div>
              <div class="card-title-thin">кастом</div>
            </div>
            <div class="card-dot"></div>
          </div>

          <div class="category-card">
            <div class="card-image">
              <img src="images/categories/jacuzzi-spa.png" alt="Гидромассажные джакузи спа">
            </div>
            <div class="card-title">
              <div class="card-title-bold">Джакузи</div>
              <div class="card-title-thin">спа</div>
            </div>
            <div class="card-dot"></div>
          </div>

          <div class="category-card">
            <div class="card-image">
              <img src="images/categories/inflatable-spa.png" alt="Надувные спа">
            </div>
            <div class="card-title">
              <div class="card-title-bold">Надувные</div>
              <div class="card-title-thin">спа</div>
            </div>
            <div class="card-dot"></div>
          </div>

          <div class="category-card">
            <div class="card-image">
              <img src="images/categories/furako.png" alt="Купель фурако">
            </div>
            <div class="card-title">
              <div class="card-title-bold">Купель</div>
              <div class="card-title-thin">фурако</div>
            </div>
            <div class="card-dot"></div>
          </div>

          <div class="category-card">
            <div class="card-image">
              <img src="images/categories/furniture.png" alt="Мебель для бассейна">
            </div>
            <div class="card-title">
              <div class="card-title-bold">Мебель</div>
              <div class="card-title-thin">для бассейна</div>
            </div>
            <div class="card-dot"></div>
          </div>

        </div>

        <button class="carousel-arrow" aria-label="Следующий">
          <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>
  </section>

  <script src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify file created**

Run: `ls -la index.html`
Expected: File exists, size ~3-4KB (not 644KB)

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: rewrite index.html with header and hero carousel structure"
```

---

### Task 3: Add carousel JavaScript

**Files:**
- Create: `js/main.js`

- [ ] **Step 1: Write carousel and interaction JS**

```javascript
// js/main.js

document.addEventListener('DOMContentLoaded', () => {
  const track = document.querySelector('.carousel-track');
  const arrow = document.querySelector('.carousel-arrow');

  if (!track || !arrow) return;

  const scrollAmount = 260; // card width + gap

  arrow.addEventListener('click', () => {
    const maxScroll = track.scrollWidth - track.clientWidth;
    if (track.scrollLeft >= maxScroll - 10) {
      track.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  });
});
```

- [ ] **Step 2: Verify file created**

Run: `ls -la js/main.js`
Expected: File exists

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat: add carousel navigation JS"
```

---

### Task 4: Download and add category images

**Files:**
- Create: `images/categories/composite-pool.png`
- Create: `images/categories/custom-pool.png`
- Create: `images/categories/jacuzzi-spa.png`
- Create: `images/categories/inflatable-spa.png`
- Create: `images/categories/furako.png`
- Create: `images/categories/furniture.png`

- [ ] **Step 1: Create images directory**

```bash
mkdir -p images/categories
```

- [ ] **Step 2: Download temporary placeholder images**

Search for and download 6 PNG images with transparent or clean backgrounds representing each category. Use free image sources (Unsplash, Pexels, or free PNG sites). Save to `images/categories/` with the filenames referenced in index.html.

If suitable transparent PNGs are not found, create SVG placeholder illustrations for each category that render well on dark backgrounds.

- [ ] **Step 3: Verify all 6 images exist**

Run: `ls -la images/categories/`
Expected: 6 image files (composite-pool.png, custom-pool.png, jacuzzi-spa.png, inflatable-spa.png, furako.png, furniture.png)

- [ ] **Step 4: Commit**

```bash
git add images/categories/
git commit -m "feat: add temporary category images"
```

---

### Task 5: Visual verification and deploy

**Files:**
- Possibly modify: `css/style.css` (tweaks)

- [ ] **Step 1: Start local server and verify visually**

```bash
cd /c/Users/Roman/good_pools && npx serve . -p 3333
```

Open http://localhost:3333 and verify:
- Fixed header with hamburger + "МЫ СТРОИМ" left, 5 icons right
- Black hero section fills viewport
- Left: large "ХОРОШИЕ" bold + "БАССЕЙНЫ" thin in white
- Right: carousel with ~3.5 visible cards, last one cut off
- Arrow button on right edge
- Cards show images + two-line category names + dot
- Arrow click scrolls carousel
- Mobile: stacks vertically at <768px

- [ ] **Step 2: Fix any visual issues found**

Tweak CSS as needed to match prototype exactly (spacing, font sizes, alignment).

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: visual tweaks to match prototype"
```

- [ ] **Step 4: Deploy to Vercel**

```bash
cd /c/Users/Roman/good_pools && npx vercel --yes --prod
```

Expected: Deployment successful, site live at goodpools.vercel.app

- [ ] **Step 5: Final commit with all changes**

```bash
git add -A
git commit -m "feat: complete hero redesign with category carousel"
```
