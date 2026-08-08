const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

function dataPath(name) {
  return path.join(DATA_DIR, `${name}.json`);
}

function readJSON(name) {
  const file = dataPath(name);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function writeJSON(name, value) {
  fs.writeFileSync(dataPath(name), JSON.stringify(value, null, 2), 'utf-8');
  return value;
}

module.exports = { DATA_DIR, dataPath, readJSON, writeJSON };
