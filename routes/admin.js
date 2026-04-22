const router = require('express').Router();
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const pool = require('../db/pool');
const requireAuth = require('../middleware/auth');
const { processUpload, deleteFile } = require('../middleware/upload');

// Helper: render an EJS view inside the admin layout
function renderAdmin(res, view, locals) {
  // Merge res.locals (user, success, error) into the locals for the inner template
  var merged = Object.assign({}, res.locals, locals);
  res.app.render(view, merged, function (err, body) {
    if (err) { console.error(err); return res.status(500).send('Render error: ' + err.message); }
    locals.body = body;
    res.render('layout', locals);
  });
}

// ---------- Login / Logout ----------

router.get('/login', function (req, res) {
  if (req.session.user) return res.redirect('/admin');
  res.render('login', { error: null });
});

router.post('/login', async function (req, res) {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.render('login', { error: 'Неверный логин или пароль' });
    }
    req.session.user = { id: user.id, username: user.username };
    res.redirect('/admin');
  } catch (err) {
    console.error('Login error:', err);
    res.render('login', { error: 'Ошибка сервера' });
  }
});

router.get('/logout', function (req, res) {
  req.session.destroy(function () {
    res.redirect('/admin/login');
  });
});

// ---------- All routes below require auth ----------
router.use(requireAuth);

// ---------- Dashboard ----------

router.get('/', async function (req, res) {
  try {
    const [c, m, p] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS n FROM categories'),
      pool.query('SELECT COUNT(*)::int AS n FROM models'),
      pool.query('SELECT COUNT(*)::int AS n FROM portfolio')
    ]);
    renderAdmin(res, 'dashboard', {
      pageTitle: 'Дашборд',
      active: 'dashboard',
      counts: { categories: c.rows[0].n, models: m.rows[0].n, portfolio: p.rows[0].n }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// ---------- Categories ----------

router.get('/categories', async function (req, res) {
  try {
    const result = await pool.query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM models WHERE category_id = c.id) AS model_count,
        (SELECT COUNT(*) FROM portfolio WHERE category_id = c.id) AS portfolio_count
      FROM categories c ORDER BY c.sort_order, c.id
    `);
    renderAdmin(res, 'categories/index', { pageTitle: 'Категории', active: 'categories', categories: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.get('/categories/new', function (req, res) {
  renderAdmin(res, 'categories/form', { pageTitle: 'Новая категория', active: 'categories', item: null });
});

router.post('/categories', ...processUpload('categories').single('image'), async function (req, res) {
  const { key, label, sort_order } = req.body;
  const image = req.file ? 'uploads/categories/' + req.file.filename : null;
  try {
    await pool.query(
      'INSERT INTO categories (key, label, image, sort_order) VALUES ($1, $2, $3, $4)',
      [key, label, image, parseInt(sort_order) || 0]
    );
    req.session.success = 'Категория добавлена';
    res.redirect('/admin/categories');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка сохранения: ' + err.message;
    res.redirect('/admin/categories/new');
  }
});

router.get('/categories/:id/edit', async function (req, res) {
  try {
    const result = await pool.query('SELECT * FROM categories WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.redirect('/admin/categories');
    renderAdmin(res, 'categories/form', { pageTitle: 'Редактировать категорию', active: 'categories', item: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/categories');
  }
});

router.post('/categories/:id', ...processUpload('categories').single('image'), async function (req, res) {
  const { key, label, sort_order } = req.body;
  try {
    if (req.file) {
      const old = await pool.query('SELECT image FROM categories WHERE id = $1', [req.params.id]);
      if (old.rows[0] && old.rows[0].image) deleteFile(old.rows[0].image);
      await pool.query(
        'UPDATE categories SET key=$1, label=$2, image=$3, sort_order=$4 WHERE id=$5',
        [key, label, 'uploads/categories/' + req.file.filename, parseInt(sort_order) || 0, req.params.id]
      );
    } else {
      await pool.query(
        'UPDATE categories SET key=$1, label=$2, sort_order=$3 WHERE id=$4',
        [key, label, parseInt(sort_order) || 0, req.params.id]
      );
    }
    req.session.success = 'Категория обновлена';
    res.redirect('/admin/categories');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка: ' + err.message;
    res.redirect('/admin/categories/' + req.params.id + '/edit');
  }
});

router.post('/categories/:id/delete', async function (req, res) {
  try {
    const deps = await pool.query(
      'SELECT (SELECT COUNT(*) FROM models WHERE category_id=$1) + (SELECT COUNT(*) FROM portfolio WHERE category_id=$1) AS n',
      [req.params.id]
    );
    if (parseInt(deps.rows[0].n) > 0) {
      req.session.error = 'Нельзя удалить: есть привязанные модели или работы';
      return res.redirect('/admin/categories');
    }
    const old = await pool.query('SELECT image FROM categories WHERE id = $1', [req.params.id]);
    await pool.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    if (old.rows[0] && old.rows[0].image) deleteFile(old.rows[0].image);
    req.session.success = 'Категория удалена';
    res.redirect('/admin/categories');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка удаления';
    res.redirect('/admin/categories');
  }
});

// ---------- Models ----------

router.get('/models', async function (req, res) {
  try {
    const catFilter = req.query.category;
    let query = `
      SELECT m.*, c.label AS category_label,
        (SELECT image_path FROM model_images WHERE model_id = m.id AND is_cover = true LIMIT 1) AS cover_image
      FROM models m
      JOIN categories c ON c.id = m.category_id
    `;
    const params = [];
    if (catFilter) {
      query += ' WHERE m.category_id = $1';
      params.push(catFilter);
    }
    query += ' ORDER BY m.sort_order, m.id';
    const [models, categories] = await Promise.all([
      pool.query(query, params),
      pool.query('SELECT * FROM categories ORDER BY sort_order, id')
    ]);
    renderAdmin(res, 'models/index', {
      pageTitle: 'Модели',
      active: 'models',
      models: models.rows,
      categories: categories.rows,
      currentCategory: catFilter || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.get('/models/new', async function (req, res) {
  const categories = await pool.query('SELECT * FROM categories ORDER BY sort_order, id');
  renderAdmin(res, 'models/form', { pageTitle: 'Новая модель', active: 'models', item: null, images: [], categories: categories.rows });
});

router.post('/models', async function (req, res) {
  const { slug, category_id, name, series, description, length_m, width_m, depth_m, specs_label, price, badge, sort_order } = req.body;
  try {
    await pool.query(
      `INSERT INTO models (slug, category_id, name, series, description, length_m, width_m, depth_m, specs_label, price, badge, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [slug, category_id, name, series || null, description || null,
       length_m || null, width_m || null, depth_m || null, specs_label || null,
       price || null, badge || null, parseInt(sort_order) || 0]
    );
    req.session.success = 'Модель добавлена';
    res.redirect('/admin/models');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка: ' + err.message;
    res.redirect('/admin/models/new');
  }
});

router.get('/models/:id/edit', async function (req, res) {
  try {
    const [model, images, categories] = await Promise.all([
      pool.query('SELECT * FROM models WHERE id = $1', [req.params.id]),
      pool.query('SELECT * FROM model_images WHERE model_id = $1 ORDER BY sort_order, id', [req.params.id]),
      pool.query('SELECT * FROM categories ORDER BY sort_order, id')
    ]);
    if (!model.rows.length) return res.redirect('/admin/models');
    renderAdmin(res, 'models/form', {
      pageTitle: 'Редактировать модель',
      active: 'models',
      item: model.rows[0],
      images: images.rows,
      categories: categories.rows
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/models');
  }
});

router.post('/models/:id', async function (req, res) {
  const { slug, category_id, name, series, description, length_m, width_m, depth_m, specs_label, price, badge, sort_order } = req.body;
  try {
    await pool.query(
      `UPDATE models SET slug=$1, category_id=$2, name=$3, series=$4, description=$5,
       length_m=$6, width_m=$7, depth_m=$8, specs_label=$9, price=$10, badge=$11, sort_order=$12
       WHERE id=$13`,
      [slug, category_id, name, series || null, description || null,
       length_m || null, width_m || null, depth_m || null, specs_label || null,
       price || null, badge || null, parseInt(sort_order) || 0, req.params.id]
    );
    req.session.success = 'Модель обновлена';
    res.redirect('/admin/models/' + req.params.id + '/edit');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка: ' + err.message;
    res.redirect('/admin/models/' + req.params.id + '/edit');
  }
});

router.post('/models/:id/delete', async function (req, res) {
  try {
    const imgs = await pool.query('SELECT image_path FROM model_images WHERE model_id = $1', [req.params.id]);
    await pool.query('DELETE FROM models WHERE id = $1', [req.params.id]);
    imgs.rows.forEach(function (img) { deleteFile(img.image_path); });
    req.session.success = 'Модель удалена';
    res.redirect('/admin/models');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка удаления';
    res.redirect('/admin/models');
  }
});

// Model images
router.post('/models/:id/images', ...processUpload('models').array('images', 10), async function (req, res) {
  try {
    for (const file of (req.files || [])) {
      await pool.query(
        'INSERT INTO model_images (model_id, image_path, sort_order) VALUES ($1, $2, (SELECT COALESCE(MAX(sort_order),0)+1 FROM model_images WHERE model_id=$1))',
        [req.params.id, 'uploads/models/' + file.filename]
      );
    }
    req.session.success = 'Фото загружены';
    res.redirect('/admin/models/' + req.params.id + '/edit');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка загрузки';
    res.redirect('/admin/models/' + req.params.id + '/edit');
  }
});

router.post('/models/:id/images/:imgId/cover', async function (req, res) {
  try {
    await pool.query('UPDATE model_images SET is_cover = false WHERE model_id = $1', [req.params.id]);
    await pool.query('UPDATE model_images SET is_cover = true WHERE id = $1 AND model_id = $2', [req.params.imgId, req.params.id]);
    res.redirect('/admin/models/' + req.params.id + '/edit');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/models/' + req.params.id + '/edit');
  }
});

router.post('/models/:id/images/:imgId/delete', async function (req, res) {
  try {
    const result = await pool.query('DELETE FROM model_images WHERE id = $1 AND model_id = $2 RETURNING image_path', [req.params.imgId, req.params.id]);
    if (result.rows.length) deleteFile(result.rows[0].image_path);
    res.redirect('/admin/models/' + req.params.id + '/edit');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/models/' + req.params.id + '/edit');
  }
});

// ---------- Portfolio ----------

router.get('/portfolio', async function (req, res) {
  try {
    const catFilter = req.query.category;
    let query = `
      SELECT p.*, c.label AS category_label,
        (SELECT image_path FROM portfolio_images WHERE portfolio_id = p.id AND is_cover = true LIMIT 1) AS cover_image
      FROM portfolio p
      JOIN categories c ON c.id = p.category_id
    `;
    const params = [];
    if (catFilter) {
      query += ' WHERE p.category_id = $1';
      params.push(catFilter);
    }
    query += ' ORDER BY p.sort_order, p.id';
    const [works, categories] = await Promise.all([
      pool.query(query, params),
      pool.query('SELECT * FROM categories ORDER BY sort_order, id')
    ]);
    renderAdmin(res, 'portfolio/index', {
      pageTitle: 'Портфолио',
      active: 'portfolio',
      works: works.rows,
      categories: categories.rows,
      currentCategory: catFilter || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.get('/portfolio/new', async function (req, res) {
  const categories = await pool.query('SELECT * FROM categories ORDER BY sort_order, id');
  renderAdmin(res, 'portfolio/form', { pageTitle: 'Новая работа', active: 'portfolio', item: null, images: [], categories: categories.rows });
});

router.post('/portfolio', async function (req, res) {
  const { category_id, title, location, size, year, sort_order } = req.body;
  try {
    await pool.query(
      'INSERT INTO portfolio (category_id, title, location, size, year, sort_order) VALUES ($1,$2,$3,$4,$5,$6)',
      [category_id, title, location || null, size || null, year || null, parseInt(sort_order) || 0]
    );
    req.session.success = 'Работа добавлена';
    res.redirect('/admin/portfolio');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка: ' + err.message;
    res.redirect('/admin/portfolio/new');
  }
});

router.get('/portfolio/:id/edit', async function (req, res) {
  try {
    const [work, images, categories] = await Promise.all([
      pool.query('SELECT * FROM portfolio WHERE id = $1', [req.params.id]),
      pool.query('SELECT * FROM portfolio_images WHERE portfolio_id = $1 ORDER BY sort_order, id', [req.params.id]),
      pool.query('SELECT * FROM categories ORDER BY sort_order, id')
    ]);
    if (!work.rows.length) return res.redirect('/admin/portfolio');
    renderAdmin(res, 'portfolio/form', {
      pageTitle: 'Редактировать работу',
      active: 'portfolio',
      item: work.rows[0],
      images: images.rows,
      categories: categories.rows
    });
  } catch (err) {
    console.error(err);
    res.redirect('/admin/portfolio');
  }
});

router.post('/portfolio/:id', async function (req, res) {
  const { category_id, title, location, size, year, sort_order } = req.body;
  try {
    await pool.query(
      'UPDATE portfolio SET category_id=$1, title=$2, location=$3, size=$4, year=$5, sort_order=$6 WHERE id=$7',
      [category_id, title, location || null, size || null, year || null, parseInt(sort_order) || 0, req.params.id]
    );
    req.session.success = 'Работа обновлена';
    res.redirect('/admin/portfolio/' + req.params.id + '/edit');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка: ' + err.message;
    res.redirect('/admin/portfolio/' + req.params.id + '/edit');
  }
});

router.post('/portfolio/:id/delete', async function (req, res) {
  try {
    const imgs = await pool.query('SELECT image_path FROM portfolio_images WHERE portfolio_id = $1', [req.params.id]);
    await pool.query('DELETE FROM portfolio WHERE id = $1', [req.params.id]);
    imgs.rows.forEach(function (img) { deleteFile(img.image_path); });
    req.session.success = 'Работа удалена';
    res.redirect('/admin/portfolio');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка удаления';
    res.redirect('/admin/portfolio');
  }
});

// Portfolio images
router.post('/portfolio/:id/images', ...processUpload('portfolio').array('images', 10), async function (req, res) {
  try {
    for (const file of (req.files || [])) {
      await pool.query(
        'INSERT INTO portfolio_images (portfolio_id, image_path, sort_order) VALUES ($1, $2, (SELECT COALESCE(MAX(sort_order),0)+1 FROM portfolio_images WHERE portfolio_id=$1))',
        [req.params.id, 'uploads/portfolio/' + file.filename]
      );
    }
    req.session.success = 'Фото загружены';
    res.redirect('/admin/portfolio/' + req.params.id + '/edit');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка загрузки';
    res.redirect('/admin/portfolio/' + req.params.id + '/edit');
  }
});

router.post('/portfolio/:id/images/:imgId/cover', async function (req, res) {
  try {
    await pool.query('UPDATE portfolio_images SET is_cover = false WHERE portfolio_id = $1', [req.params.id]);
    await pool.query('UPDATE portfolio_images SET is_cover = true WHERE id = $1 AND portfolio_id = $2', [req.params.imgId, req.params.id]);
    res.redirect('/admin/portfolio/' + req.params.id + '/edit');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/portfolio/' + req.params.id + '/edit');
  }
});

router.post('/portfolio/:id/images/:imgId/delete', async function (req, res) {
  try {
    const result = await pool.query('DELETE FROM portfolio_images WHERE id = $1 AND portfolio_id = $2 RETURNING image_path', [req.params.imgId, req.params.id]);
    if (result.rows.length) deleteFile(result.rows[0].image_path);
    res.redirect('/admin/portfolio/' + req.params.id + '/edit');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/portfolio/' + req.params.id + '/edit');
  }
});

// ---------- Showroom ----------

router.get('/showroom', async function (req, res) {
  try {
    var result = await pool.query('SELECT * FROM showroom LIMIT 1');
    var item = result.rows[0] || null;
    var images = [];
    if (item) {
      var imgResult = await pool.query('SELECT * FROM showroom_images WHERE showroom_id = $1 ORDER BY sort_order, id', [item.id]);
      images = imgResult.rows;
    }
    renderAdmin(res, 'showroom/form', { pageTitle: 'Выставочная площадка', active: 'showroom', item: item, images: images });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.post('/showroom', async function (req, res) {
  var { title, description, address } = req.body;
  try {
    var existing = await pool.query('SELECT id FROM showroom LIMIT 1');
    if (existing.rows.length) {
      await pool.query('UPDATE showroom SET title=$1, description=$2, address=$3 WHERE id=$4',
        [title, description || null, address || null, existing.rows[0].id]);
    } else {
      await pool.query('INSERT INTO showroom (title, description, address) VALUES ($1,$2,$3)',
        [title, description || null, address || null]);
    }
    req.session.success = 'Сохранено';
    res.redirect('/admin/showroom');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка: ' + err.message;
    res.redirect('/admin/showroom');
  }
});

router.post('/showroom/images', ...processUpload('showroom').array('images', 10), async function (req, res) {
  try {
    var sr = await pool.query('SELECT id FROM showroom LIMIT 1');
    if (!sr.rows.length) { res.redirect('/admin/showroom'); return; }
    var sid = sr.rows[0].id;
    for (var file of (req.files || [])) {
      await pool.query(
        'INSERT INTO showroom_images (showroom_id, image_path, sort_order) VALUES ($1, $2, (SELECT COALESCE(MAX(sort_order),0)+1 FROM showroom_images WHERE showroom_id=$1))',
        [sid, 'uploads/showroom/' + file.filename]
      );
    }
    req.session.success = 'Фото загружены';
    res.redirect('/admin/showroom');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка загрузки';
    res.redirect('/admin/showroom');
  }
});

router.post('/showroom/images/:imgId/cover', async function (req, res) {
  try {
    var sr = await pool.query('SELECT id FROM showroom LIMIT 1');
    if (sr.rows.length) {
      await pool.query('UPDATE showroom_images SET is_cover = false WHERE showroom_id = $1', [sr.rows[0].id]);
      await pool.query('UPDATE showroom_images SET is_cover = true WHERE id = $1', [req.params.imgId]);
    }
    res.redirect('/admin/showroom');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/showroom');
  }
});

router.post('/showroom/images/:imgId/delete', async function (req, res) {
  try {
    var result = await pool.query('DELETE FROM showroom_images WHERE id = $1 RETURNING image_path', [req.params.imgId]);
    if (result.rows.length) deleteFile(result.rows[0].image_path);
    res.redirect('/admin/showroom');
  } catch (err) {
    console.error(err);
    res.redirect('/admin/showroom');
  }
});

// ---------- Render vs Reality ----------

router.get('/render-reality', async function (req, res) {
  try {
    var section = await pool.query('SELECT * FROM rr_section LIMIT 1');
    var slides = await pool.query('SELECT * FROM rr_slides ORDER BY sort_order, id');
    renderAdmin(res, 'render-reality/form', {
      pageTitle: 'От рендера до реальности',
      active: 'render-reality',
      item: section.rows[0] || null,
      slides: slides.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.post('/render-reality', async function (req, res) {
  var { title, subtitle } = req.body;
  try {
    var existing = await pool.query('SELECT id FROM rr_section LIMIT 1');
    if (existing.rows.length) {
      await pool.query('UPDATE rr_section SET title=$1, subtitle=$2 WHERE id=$3',
        [title, subtitle || null, existing.rows[0].id]);
    } else {
      await pool.query('INSERT INTO rr_section (title, subtitle) VALUES ($1,$2)',
        [title, subtitle || null]);
    }
    req.session.success = 'Сохранено';
    res.redirect('/admin/render-reality');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка: ' + err.message;
    res.redirect('/admin/render-reality');
  }
});

// Создать слайд — оба файла обязательны
router.post('/render-reality/slides', ...processUpload('rr').fields([
  { name: 'render_image', maxCount: 1 },
  { name: 'real_image',   maxCount: 1 }
]), async function (req, res) {
  try {
    var { caption_title, caption_meta, sort_order } = req.body;
    var render = req.files && req.files.render_image && req.files.render_image[0];
    var real   = req.files && req.files.real_image   && req.files.real_image[0];
    if (!render || !real) {
      req.session.error = 'Нужны обе картинки: render и real';
      return res.redirect('/admin/render-reality');
    }
    await pool.query(
      'INSERT INTO rr_slides (caption_title, caption_meta, render_image, real_image, sort_order) VALUES ($1,$2,$3,$4,$5)',
      [caption_title, caption_meta || null, 'uploads/rr/' + render.filename, 'uploads/rr/' + real.filename, parseInt(sort_order) || 0]
    );
    req.session.success = 'Слайд добавлен';
    res.redirect('/admin/render-reality');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка: ' + err.message;
    res.redirect('/admin/render-reality');
  }
});

// Обновить слайд — картинки опциональны
router.post('/render-reality/slides/:id', ...processUpload('rr').fields([
  { name: 'render_image', maxCount: 1 },
  { name: 'real_image',   maxCount: 1 }
]), async function (req, res) {
  try {
    var { caption_title, caption_meta, sort_order } = req.body;
    var existing = await pool.query('SELECT render_image, real_image FROM rr_slides WHERE id=$1', [req.params.id]);
    if (!existing.rows.length) {
      req.session.error = 'Слайд не найден';
      return res.redirect('/admin/render-reality');
    }
    var old = existing.rows[0];
    var newRender = req.files && req.files.render_image && req.files.render_image[0];
    var newReal   = req.files && req.files.real_image   && req.files.real_image[0];

    var renderPath = old.render_image;
    var realPath   = old.real_image;

    if (newRender) {
      deleteFile(old.render_image);
      renderPath = 'uploads/rr/' + newRender.filename;
    }
    if (newReal) {
      deleteFile(old.real_image);
      realPath = 'uploads/rr/' + newReal.filename;
    }

    await pool.query(
      'UPDATE rr_slides SET caption_title=$1, caption_meta=$2, render_image=$3, real_image=$4, sort_order=$5 WHERE id=$6',
      [caption_title, caption_meta || null, renderPath, realPath, parseInt(sort_order) || 0, req.params.id]
    );
    req.session.success = 'Слайд обновлён';
    res.redirect('/admin/render-reality');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка: ' + err.message;
    res.redirect('/admin/render-reality');
  }
});

router.post('/render-reality/slides/:id/delete', async function (req, res) {
  try {
    var result = await pool.query('DELETE FROM rr_slides WHERE id=$1 RETURNING render_image, real_image', [req.params.id]);
    if (result.rows.length) {
      deleteFile(result.rows[0].render_image);
      deleteFile(result.rows[0].real_image);
    }
    req.session.success = 'Слайд удалён';
    res.redirect('/admin/render-reality');
  } catch (err) {
    console.error(err);
    req.session.error = 'Ошибка удаления';
    res.redirect('/admin/render-reality');
  }
});

module.exports = router;
