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

// Static: uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// Static: frontend site (must be AFTER /api and /admin)
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, '0.0.0.0', function () {
  console.log('good-pools running on http://0.0.0.0:' + PORT);
});
