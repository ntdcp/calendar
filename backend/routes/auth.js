const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { readJSON, writeJSON } = require('../utils');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'rana';

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function ensureAdminSeeded() {
  let admin = readJSON('admin');
  if (!admin) {
    const salt = crypto.randomBytes(16).toString('hex');
    admin = {
      username: DEFAULT_USERNAME,
      salt,
      hash: hashPassword(DEFAULT_PASSWORD, salt)
    };
    writeJSON('admin', admin);
  }
  return admin;
}

// Runs once when this module first loads (server startup).
ensureAdminSeeded();

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const admin = readJSON('admin');
  if (!admin || username !== admin.username) {
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }

  const candidate = hashPassword(password, admin.salt);
  const match = crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(admin.hash, 'hex'));
  if (!match) {
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }

  const token = jwt.sign({ username: admin.username, role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, username: admin.username });
});

// Change the admin password once signed in.
router.post('/change-password', (req, res) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Sign in required.' });

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }

  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: 'Provide the current password and a new password of at least 4 characters.' });
  }

  const admin = readJSON('admin');
  const candidate = hashPassword(currentPassword, admin.salt);
  const match = crypto.timingSafeEqual(Buffer.from(candidate, 'hex'), Buffer.from(admin.hash, 'hex'));
  if (!match) return res.status(401).json({ error: 'Current password is incorrect.' });

  const salt = crypto.randomBytes(16).toString('hex');
  writeJSON('admin', { username: admin.username, salt, hash: hashPassword(newPassword, salt) });
  res.json({ ok: true });
});

module.exports = router;
