import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { SKILLS, SKILL_BY_ID } from './skills.js';
import { runScript, logRun, getHistory, getHistoryEntry, PROJECT_ROOT } from './runner.js';
import { listData, readData, getConfig, saveConfig, ensureDirs } from './store.js';
import { startPipeline, stopPipeline, publicPipeline, summarize, PIPELINE_STEPS } from './pipeline.js';

const app = express();
const PORT = Number(process.env.PORT || 8787);

app.use(express.json({ limit: '2mb' }));
ensureDirs();

app.get('/health', (_req, res) => res.json({ ok: true, at: new Date().toISOString() }));

const sendError = (res, err, status = 500) => {
  res.status(status).json({ error: err?.message || String(err) });
};

// ---- metadata ---------------------------------------------------------------

app.get('/api/skills', (_req, res) => {
  res.json({
    skills: SKILLS.map((s) => ({
      id: s.id, name: s.name, tag: s.tag, phase: s.phase, accent: s.accent,
      blurb: s.blurb, outputs: s.outputs,
      actions: s.actions.map((a) => ({
        id: a.id, label: a.label, desc: a.desc, json: Boolean(a.json),
        danger: Boolean(a.danger), params: a.params,
      })),
    })),
    pipeline: PIPELINE_STEPS.map((s) => ({
      key: s.key, label: s.label, skill: s.skill, action: s.action, optional: s.optional,
    })),
  });
});

app.get('/api/status', async (_req, res) => {
  try {
    const result = await runScript({ skillId: 'alerts', argv: ['clock', '--json'], timeoutMs: 20000 });
    res.json({ ok: true, market: result.parsed, stderr: result.stderr, code: result.code });
  } catch (err) { sendError(res, err); }
});

// ---- arbitrary skill execution ---------------------------------------------

app.post('/api/run', async (req, res) => {
  const { skillId, actionId, values = {}, confirm, timeoutMs } = req.body || {};
  const skill = SKILL_BY_ID[skillId];
  if (!skill) return sendError(res, new Error(`Unknown skill: ${skillId}`), 400);
  const action = skill.actions.find((a) => a.id === actionId);
  if (!action) return sendError(res, new Error(`Unknown action: ${actionId}`), 400);
  if (action.danger && confirm !== 'CONFIRM') {
    return sendError(res, new Error('This action requires an explicit CONFIRM from the UI.'), 403);
  }

  let argv;
  try {
    const { buildArgv } = await import('./skills.js');
    argv = buildArgv(skill, actionId, values);
    if (action.json) argv.push('--json');
  } catch (err) { return sendError(res, err, 400); }

  try {
    const result = await runScript({ skillId, argv, timeoutMs: Number(timeoutMs) || 10 * 60 * 1000 });
    const summary = summarize(
      { key: `${skillId}-${actionId}`, label: action.label, skill: skillId, action: actionId },
      result,
    );
    const record = logRun({
      source: 'manual', skill: skillId, action: actionId, argv,
      code: result.code, durationMs: result.durationMs, summary,
      stdout: result.stdout, stderr: result.stderr,
    });
    res.json({
      ok: action.okCodes.includes(result.code) && !result.timedOut,
      id: record.id,
      code: result.code,
      timedOut: result.timedOut,
      durationMs: result.durationMs,
      stdout: result.stdout,
      stderr: result.stderr,
      parsed: result.parsed,
      summary,
      argv: result.argv,
    });
  } catch (err) { sendError(res, err); }
});

// ---- activity log -----------------------------------------------------------

app.get('/api/log', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 60, 300);
  res.json({ entries: getHistory(limit) });
});

app.get('/api/log/:id', (req, res) => {
  const entry = getHistoryEntry(req.params.id);
  if (!entry) return sendError(res, new Error('Log entry not found'), 404);
  res.json(entry);
});

// ---- data files -------------------------------------------------------------

app.get('/api/files', (_req, res) => {
  res.json({ files: listData() });
});

app.get('/api/file', (req, res) => {
  const rel = String(req.query.path || '');
  if (!rel) return sendError(res, new Error('Missing path'), 400);
  try {
    res.json(readData(rel));
  } catch (err) { sendError(res, err, 400); }
});

// ---- config -----------------------------------------------------------------

app.get('/api/config', (_req, res) => res.json(getConfig()));

app.put('/api/config', (req, res) => {
  try {
    const saved = saveConfig(req.body || {});
    res.json({ ok: true, config: saved });
  } catch (err) { sendError(res, err); }
});

// ---- pipeline ---------------------------------------------------------------

app.get('/api/pipeline', (_req, res) => res.json(publicPipeline()));

app.post('/api/pipeline/start', (req, res) => {
  try {
    const result = startPipeline(req.body || {});
    res.json({ ok: result.started, ...result });
  } catch (err) { sendError(res, err); }
});

app.post('/api/pipeline/stop', (_req, res) => {
  stopPipeline();
  res.json({ ok: true, message: 'Stop requested; the current script will finish before halting.' });
});

// ---- static frontend (production build) -------------------------------------

const dist = path.join(PROJECT_ROOT, 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Trader Console API listening on http://localhost:${PORT}`);
  console.log(`Skills: ${process.env.SKILLS_DIR || path.join(os.homedir(), '.claude', 'skills')}`);
  console.log(`Data:   ${PROJECT_ROOT}\\trader`);
});
