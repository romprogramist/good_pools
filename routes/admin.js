const router = require('express').Router();
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');
const requireAuth = require('../middleware/auth');

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

// Dashboard placeholder (will be replaced in Task 5)
router.get('/', function (req, res) {
  res.send('Dashboard — coming in Task 5');
});

module.exports = router;
