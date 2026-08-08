const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// API
app.use('/api/auth', authRoutes);
app.use('/api', contentRoutes);

// Static frontend (multi-page site + admin dashboard)
app.use(express.static(FRONTEND_DIR));

// Friendly clean URLs for the main pages (so /about works, not just /about.html)
const pageMap = {
  '/': 'index.html',
  '/about': 'about.html',
  '/projects': 'projects.html',
  '/partners': 'partners.html',
  '/news': 'news.html',
  '/faqs': 'faqs.html',
  '/admin': 'admin/login.html',
  '/admin/dashboard': 'admin/dashboard.html'
};

Object.entries(pageMap).forEach(([route, file]) => {
  app.get(route, (req, res) => res.sendFile(path.join(FRONTEND_DIR, file)));
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(FRONTEND_DIR, '404.html'));
});

app.listen(PORT, () => {
  console.log(`RANA Company website running at http://localhost:${PORT}`);
  console.log(`Admin dashboard at        http://localhost:${PORT}/admin`);
});
