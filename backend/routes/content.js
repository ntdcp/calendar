const express = require('express');
const crypto = require('crypto');
const { readJSON, writeJSON } = require('../utils');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
}

// ---- Public: everything the site needs in one call ----
router.get('/site', (req, res) => {
  res.json({
    settings: readJSON('settings'),
    about: readJSON('about'),
    projects: readJSON('projects'),
    partners: readJSON('partners'),
    news: readJSON('news'),
    faqs: readJSON('faqs'),
    ui: readJSON('ui')
  });
});

// ---- Settings ----
router.get('/settings', (req, res) => res.json(readJSON('settings')));
router.put('/settings', requireAdmin, (req, res) => {
  res.json(writeJSON('settings', req.body));
});

// ---- About ----
router.get('/about', (req, res) => res.json(readJSON('about')));
router.put('/about', requireAdmin, (req, res) => {
  res.json(writeJSON('about', req.body));
});

// ---- Generic collection helper for projects / partners / news / faqs ----
function collectionRoutes(name, idPrefix) {
  router.get(`/${name}`, (req, res) => res.json(readJSON(name)));

  router.post(`/${name}`, requireAdmin, (req, res) => {
    const items = readJSON(name) || [];
    const item = { id: newId(idPrefix), ...req.body };
    items.unshift(item);
    writeJSON(name, items);
    res.status(201).json(item);
  });

  router.put(`/${name}/:id`, requireAdmin, (req, res) => {
    const items = readJSON(name) || [];
    const idx = items.findIndex((i) => i.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Item not found.' });
    items[idx] = { ...items[idx], ...req.body, id: items[idx].id };
    writeJSON(name, items);
    res.json(items[idx]);
  });

  router.delete(`/${name}/:id`, requireAdmin, (req, res) => {
    const items = readJSON(name) || [];
    const next = items.filter((i) => i.id !== req.params.id);
    if (next.length === items.length) return res.status(404).json({ error: 'Item not found.' });
    writeJSON(name, next);
    res.json({ ok: true });
  });
}

collectionRoutes('projects', 'proj');
collectionRoutes('partners', 'part');
collectionRoutes('news', 'news');
collectionRoutes('faqs', 'faq');

module.exports = router;
