const fs = require('node:fs');
const path = require('node:path');

const appPath = path.join(__dirname, 'src', 'App.jsx');
const apiBaseUrl = String(process.env.VITE_CFLOW_API_URL || '').trim().replace(/\/$/, '');

if (!apiBaseUrl) {
  throw new Error('VITE_CFLOW_API_URL is required for a production C·FLOW build.');
}

const source = fs.readFileSync(appPath, 'utf8');
const target = 'http://localhost:5000/api/analyze';
const replacement = `${apiBaseUrl}/api/analyze`;

if (!source.includes(target)) {
  if (source.includes('/api/analyze')) {
    console.log('C·FLOW analyzer URL already configured; leaving source unchanged.');
    process.exit(0);
  }
  throw new Error('Could not locate the C·FLOW analyzer URL in src/App.jsx.');
}

const next = source.replaceAll(target, replacement);
fs.writeFileSync(appPath, next, 'utf8');
console.log(`Configured C·FLOW analyzer endpoint: ${replacement}`);
