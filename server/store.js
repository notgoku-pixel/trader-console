import path from 'node:path';
import fs from 'node:fs';
import { DATA_ROOT, SAMPLE_ROOT, PROJECT_ROOT } from './runner.js';
import { CONFIG_DEFAULTS } from './skills.js';

export const DATA_FILES = [
  { path: 'trader/config.json', label: 'Config', kind: 'config' },
  { path: 'trader/universe.txt', label: 'Universe', kind: 'text' },
  { path: 'trader/watchlist.json', label: 'Watchlist', kind: 'json' },
  { path: 'trader/state/news.json', label: 'News state', kind: 'json' },
  { path: 'trader/metrics.json', label: 'Earnings metrics', kind: 'json' },
  { path: 'trader/entry.json', label: 'Entry signal', kind: 'json' },
  { path: 'trader/plan.json', label: 'Trade plan', kind: 'json' },
  { path: 'trader/timemachine.json', label: 'Simulation', kind: 'json' },
  { path: 'trader/prices.json', label: 'Prices', kind: 'json' },
  { path: 'trader/alerts.json', label: 'Alert rules', kind: 'json' },
  { path: 'trader/state/alerts.json', label: 'Alert state', kind: 'json' },
  { path: 'trader/orders.json', label: 'Proposed orders', kind: 'json' },
  { path: 'trader/state/risk.json', label: 'Risk verdict', kind: 'json' },
  { path: 'trader/state/broker.json', label: 'Broker log', kind: 'json' },
  { path: 'trader/portfolio.json', label: 'Portfolio', kind: 'json' },
  { path: 'trader/state/pelosi.json', label: 'Congress state', kind: 'json' },
];

function safeResolve(rel) {
  const abs = path.resolve(PROJECT_ROOT, rel);
  if (!abs.startsWith(PROJECT_ROOT + path.sep) && abs !== PROJECT_ROOT) {
    throw new Error('Path outside project is not allowed');
  }
  return abs;
}

function readMaybe(abs) {
  try {
    if (!fs.existsSync(abs)) return null;
    return fs.readFileSync(abs, 'utf8');
  } catch { return null; }
}

function statMaybe(abs) {
  try {
    const s = fs.statSync(abs);
    return { modified: s.mtime.toISOString(), size: s.size };
  } catch { return { modified: null, size: 0 }; }
}

export function ensureDirs() {
  for (const d of ['trader', 'trader/state', 'trader/state/ptr-pdfs', 'data/samples']) {
    fs.mkdirSync(path.join(PROJECT_ROOT, d), { recursive: true });
  }
  const configPath = path.join(DATA_ROOT, 'config.json');
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify(CONFIG_DEFAULTS, null, 2) + '\n', 'utf8');
  }
}

export function readData(rel, { preferSample = false } = {}) {
  const abs = safeResolve(rel);
  const live = readMaybe(abs);
  const sampleRel = rel.startsWith('trader/state/')
    ? path.join('state', path.basename(rel))
    : path.basename(rel);
  const sampleAbs = path.join(SAMPLE_ROOT, sampleRel);
  const sample = readMaybe(sampleAbs);
  const raw = (!preferSample && live !== null) ? live : sample;
  if (raw === null) return { path: rel, source: 'missing', raw: '', data: null, ...statMaybe(abs) };
  let data = null;
  if (rel.endsWith('.json')) {
    try { data = JSON.parse(raw); } catch { data = null; }
  }
  return {
    path: rel,
    source: (!preferSample && live !== null) ? 'live' : 'sample',
    raw,
    data,
    ...statMaybe(abs),
  };
}

export function listData() {
  return DATA_FILES.map((meta) => {
    const item = readData(meta.path);
    let summary = '';
    if (item.data && typeof item.data === 'object') {
      const keys = Object.keys(item.data);
      summary = keys.slice(0, 6).join(', ') + (keys.length > 6 ? ` (+${keys.length - 6})` : '');
    } else if (item.raw) {
      summary = `${item.raw.split(/\r?\n/).length} lines`;
    }
    return { ...meta, source: item.source, modified: item.modified, size: item.size, summary };
  });
}

export function getConfig() {
  const item = readData('trader/config.json');
  if (item.source === 'live' && item.data && typeof item.data === 'object') {
    return { ...CONFIG_DEFAULTS, ...item.data, _source: 'live' };
  }
  return { ...CONFIG_DEFAULTS, _source: 'default' };
}

export function saveConfig(values) {
  ensureDirs();
  const current = getConfig();
  const cleaned = { ...current };
  delete cleaned._source;
  for (const [key, value] of Object.entries(values || {})) {
    if (key.startsWith('_')) continue;
    if (value === '' || value === undefined || value === null) continue;
    if (typeof cleaned[key] === 'number' || typeof CONFIG_DEFAULTS[key] === 'number') {
      const n = Number(value);
      if (!Number.isNaN(n)) cleaned[key] = n;
    } else if (typeof CONFIG_DEFAULTS[key] === 'boolean') {
      cleaned[key] = value === true || value === 'true' || value === 'on' || value === 1;
    } else if (key === 'blocked') {
      cleaned[key] = Array.isArray(value) ? value : String(value).split(/[\s,]+/).filter(Boolean);
    } else {
      cleaned[key] = value;
    }
  }
  fs.writeFileSync(path.join(DATA_ROOT, 'config.json'), JSON.stringify(cleaned, null, 2) + '\n', 'utf8');
  return cleaned;
}

export function writeData(rel, text) {
  const abs = safeResolve(rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text, 'utf8');
  return abs;
}
