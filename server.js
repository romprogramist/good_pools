require('dotenv').config();
const express = require('express');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const path = require('path');
const pool = require('./db/pool');

const app = express();
const PORT = process.env.PORT || 3050;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parsing
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Sessions stored in PostgreSQL
app.use(session({
  store: new PgSession({ pool, tableName: 'session' }),
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));

// Make session data available in all EJS views
app.use(function (req, res, next) {
  res.locals.user = req.session.user || null;
  res.locals.success = req.session.success || null;
  res.locals.error = req.session.error || null;
  delete req.session.success;
  delete req.session.error;
  next();
});

// Static: uploaded files (webp first if browser accepts it)
const webpMiddleware = require('./middleware/webp');
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', webpMiddleware(uploadsDir));
app.use('/uploads', express.static(uploadsDir, { maxAge: '1y' }));

// Routes
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// Privacy policy lives in data/ so that the existing rsync ('css js images data')
// already deploys it. Surfaced at /privacy.html via this route.
app.get('/privacy.html', function (_req, res) {
  res.sendFile(path.join(__dirname, 'public', 'data', 'privacy.html'));
});

// Static: frontend site (must be AFTER /api and /admin)
const publicDir = path.join(__dirname, 'public');
app.use(webpMiddleware(publicDir));
app.use(express.static(publicDir, { maxAge: '1y' }));

app.listen(PORT, '0.0.0.0', function () {
  console.log('good-pools running on http://0.0.0.0:' + PORT);
});
