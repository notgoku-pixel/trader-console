import { runScript, logRun } from './runner.js';
import { SKILL_BY_ID, buildArgv, defaultsFor } from './skills.js';
import { readData } from './store.js';

// The documented hand-off order of the skills. Steps marked optional can be
// switched off from the dashboard without breaking the chain.
export const PIPELINE_STEPS = [
  { key: 'universe', label: 'Build stock universe', skill: 'scanner', action: 'universe',
    optional: 'includeUniverse', soft: true, timeoutMs: 5 * 60 * 1000,
    values: () => ({ pause: 0.3 }) },
  { key: 'scan', label: 'Scan charts for setups', skill: 'scanner', action: 'daily',
    timeoutMs: 20 * 60 * 1000,
    values: (o) => ({ limit: o.limit || 120, min_price: 5, min_volume: 1000000, show: 30, pause: 0.3 }) },
  { key: 'news', label: 'Check news & 8-Ks', skill: 'news', action: 'check',
    optional: 'includeNews', soft: true, timeoutMs: 5 * 60 * 1000,
    values: (o) => ({ tickers: o.symbol, hours: o.hours || 24, forms: '8-K', move_pct: 3, no_sec: !o.secUserAgent }) },
  { key: 'entry', label: 'Call the entry', skill: 'entry', action: 'check',
    timeoutMs: 5 * 60 * 1000,
    values: (o) => ({ symbol: o.symbol, setup: 'orb', interval: '5m', or_minutes: 15, write: true }) },
  { key: 'exit', label: 'Set stop & target', skill: 'exit', action: 'plan',
    timeoutMs: 5 * 60 * 1000,
    values: () => ({ from: 'trader/entry.json', setup: 'orb', or_minutes: 15, stop: 'or-mid', target: '2R', write: true }) },
  { key: 'sim', label: 'Replay the session', skill: 'timemachine', action: 'run',
    optional: 'includeSimulation', soft: true, timeoutMs: 10 * 60 * 1000,
    values: (o) => ({ plan: 'trader/plan.json', replays: o.replays || 2000, seed: 19, window: 2, write: true }) },
  { key: 'alert-setup', label: 'Turn plan into alerts', skill: 'alerts', action: 'add',
    optional: 'includeAlerts', soft: true, timeoutMs: 2 * 60 * 1000,
    values: () => ({ type: 'from-plan', plan: 'trader/plan.json', rules: 'trader/alerts.json' }) },
  { key: 'prices', label: 'Refresh live price', skill: 'alerts', action: 'quote',
    timeoutMs: 3 * 60 * 1000,
    values: (o) => ({ symbols: o.symbol, plan: true, source: 'yahoo', write: true }) },
  { key: 'size', label: 'Size the position', skill: 'budget', action: 'size',
    timeoutMs: 3 * 60 * 1000,
    values: () => ({ plan: 'trader/plan.json', prices: 'trader/prices.json', write: true }) },
  { key: 'risk', label: 'Run the risk gate', skill: 'risk', action: 'check',
    timeoutMs: 3 * 60 * 1000,
    values: () => ({ orders: 'trader/orders.json', prices: 'trader/prices.json' }) },
  { key: 'ticket', label: 'Build the order ticket', skill: 'broker', action: 'show',
    timeoutMs: 3 * 60 * 1000,
    values: () => ({ orders: 'trader/orders.json', index: 1 }) },
];

export const pipelineState = {
  running: false,
  startedAt: null,
  finishedAt: null,
  options: {},
  steps: [],
  logs: [],
  aborted: false,
};

let abortRequested = false;

export function stopPipeline() {
  abortRequested = true;
}

export function publicPipeline() {
  return {
    running: pipelineState.running,
    startedAt: pipelineState.startedAt,
    finishedAt: pipelineState.finishedAt,
    options: pipelineState.options,
    aborted: pipelineState.aborted,
    steps: pipelineState.steps.map((s) => ({
      ...s,
      stdout: (s.stdout || '').slice(0, 30000),
      stderr: (s.stderr || '').slice(0, 10000),
    })),
    logs: pipelineState.logs.slice(-250),
  };
}

function pickSymbol(options) {
  if (options.symbol) return String(options.symbol).trim().toUpperCase();
  const watchlist = readData('trader/watchlist.json');
  const hit = watchlist.data?.hits?.[0];
  if (hit?.symbol) return hit.symbol;
  return 'TSLA';
}

function logLine(text, stream = 'info') {
  pipelineState.logs.push({ at: new Date().toISOString(), stream, text: text.slice(0, 500) });
  if (pipelineState.logs.length > 1000) pipelineState.logs.shift();
}

export function summarize(step, result) {
  const d = result.parsed;
  try {
    switch (step.key) {
      case 'universe': return `${d?.kept ?? d?.count ?? '?'} symbols kept`;
      case 'scan': return `${d?.hits?.length ?? d?.counts?.hits ?? 0} setups found`;
      case 'news': return `${d?.items?.length ?? 0} new item(s)`;
      case 'entry': return `${d?.status ?? 'unknown'}${d?.trigger?.price ? ` @ $${d.trigger.price}` : ''}`;
      case 'exit': return `entry $${d?.entry ?? '?'} · stop $${d?.stop ?? '?'} · target $${d?.target ?? '?'}`;
      case 'sim': return d?.verdict || `${d?.mc?.p_target ?? 0}% target first`;
      case 'alert-setup': return (result.stdout || '').trim().split('\n')[0].slice(0, 120);
      case 'prices': return `${Object.keys(d?.quotes || {}).length} quote(s)`;
      case 'size': return `${d?.sizing?.qty ?? 0} share(s)${d?.sizing?.bound_by ? ` · bound by ${d.sizing.bound_by}` : ''}`;
      case 'risk': return `${d?.pass ?? 0} passed · ${d?.block ?? 0} blocked`;
      case 'ticket': return Array.isArray(d) ? `${d.length} ticket(s)` : (d?.ready ? 'ticket READY' : 'no ready ticket');
      default: break;
    }
    if (d && typeof d === 'object') {
      if ('open' in d) return `NYSE ${d.open ? 'OPEN' : 'CLOSED'} · ${d.now_new_york || ''}`;
      if ('status' in d) return `${d.symbol || ''} ${d.status}${d.price ? ` @ $${d.price}` : ''}`.trim();
      if ('pass' in d) return `${d.pass} passed · ${d.block} blocked`;
      if (d.sizing) return `${d.sizing.qty ?? 0} share(s)${d.sizing.bound_by ? ` · bound by ${d.sizing.bound_by}` : ''}`;
      if (d.quotes) return `${Object.keys(d.quotes).length} quote(s)`;
      if (Array.isArray(d)) return `${d.length} result(s)`;
      return Object.keys(d).slice(0, 4).join(', ') || 'done';
    }
  } catch { /* fall through */ }
  const first = (result.stdout || '').trim().split('\n')[0] || '';
  return (first.startsWith('{') || first.startsWith('[') ? '' : first).slice(0, 120) || 'done';
}

export async function startPipeline(options = {}) {
  if (pipelineState.running) return { started: false, reason: 'already running' };
  abortRequested = false;
  pipelineState.running = true;
  pipelineState.aborted = false;
  pipelineState.startedAt = new Date().toISOString();
  pipelineState.finishedAt = null;
  pipelineState.options = { ...options };
  pipelineState.steps = PIPELINE_STEPS.map((s) => ({
    key: s.key, label: s.label, skill: s.skill, action: s.action,
    status: 'pending', summary: '', durationMs: 0, code: null,
  }));
  pipelineState.logs = [];

  const symbol = pickSymbol(options);
  pipelineState.options.symbol = symbol;
  logLine(`Pipeline started for ${symbol} · paper mode · ${options.includeSimulation ? 'with simulation' : 'no simulation'}`);
  if (options.secUserAgent) logLine(`SEC User-Agent set: ${options.secUserAgent}`);

  const ctx = { ...options, symbol };

  (async () => {
    for (const step of PIPELINE_STEPS) {
      const state = pipelineState.steps.find((s) => s.key === step.key);
      if (abortRequested) {
        state.status = 'skipped';
        state.summary = 'skipped (stopped)';
        continue;
      }
      if (step.optional && options[step.optional] === false) {
        state.status = 'skipped';
        state.summary = 'disabled in options';
        continue;
      }

      state.status = 'running';
      state.startedAt = new Date().toISOString();
      logLine(`→ ${step.label} (${step.skill}/${step.action})`);

      let result;
      const skill = SKILL_BY_ID[step.skill];
      try {
        const values = { ...defaultsFor(step.skill, step.action), ...(step.values(ctx) || {}) };
        const argv = buildArgv(skill, step.action, values);
        logLine(`  $ ${argv.join(' ')}`, 'cmd');
        result = await runScript({
          skillId: step.skill,
          argv,
          timeoutMs: step.timeoutMs,
          onChunk: ({ stream, text }) => {
            for (const line of text.split(/\r?\n/)) {
              if (line.trim()) logLine(line.trim(), stream);
            }
          },
        });
      } catch (err) {
        result = { code: -1, stdout: '', stderr: err.message, parsed: null, durationMs: 0, argv: [] };
      }

      state.stdout = result.stdout;
      state.stderr = result.stderr;
      state.code = result.code;
      state.durationMs = result.durationMs;
      state.argv = result.argv;
      state.summary = summarize(step, result);

      const okCodes = skill.actions.find((a) => a.id === step.action)?.okCodes || [0];
      const failed = result.timedOut || !okCodes.includes(result.code);
      state.status = failed ? (step.soft ? 'warning' : 'error') : 'done';
      state.finishedAt = new Date().toISOString();
      logLine(`← ${step.label}: ${state.status} · ${state.summary}`, failed ? 'error' : 'info');

      logRun({
        source: 'pipeline', skill: step.skill, action: step.action,
        code: result.code, durationMs: result.durationMs, summary: state.summary,
        stdout: result.stdout, stderr: result.stderr,
      });

      if (failed && !step.soft && !abortRequested) {
        logLine(`Pipeline halted: ${step.label} failed. Nothing was sent to a broker.`, 'error');
        break;
      }
    }

    pipelineState.running = false;
    pipelineState.aborted = abortRequested;
    pipelineState.finishedAt = new Date().toISOString();
    const counts = pipelineState.steps.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {});
    logLine(`Pipeline finished · ${JSON.stringify(counts)} · no order was placed automatically`);
  })();

  return { started: true, symbol };
}
