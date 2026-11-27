import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { SKILL_BY_ID } from './skills.js';

export const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
export const SKILLS_ROOT = process.env.SKILLS_DIR || path.join(os.homedir(), '.claude', 'skills');
export const DATA_ROOT = path.resolve(process.env.TRADER_DATA_DIR || path.join(PROJECT_ROOT, 'trader'));
export const SAMPLE_ROOT = path.join(PROJECT_ROOT, 'data', 'samples');

let pythonCache = null;
export function pythonExecutable() {
  if (pythonCache) return pythonCache;
  const candidates = [process.env.PYTHON, 'python', 'python3'].filter(Boolean);
  for (const exe of candidates) {
    try {
      const r = spawnSync(exe, ['--version'], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
      if (r.status === 0) {
        pythonCache = exe;
        return exe;
      }
    } catch { /* try next */ }
  }
  pythonCache = 'python';
  return pythonCache;
}

export function skillPath(skillId) {
  const skill = SKILL_BY_ID[skillId];
  if (!skill) throw new Error(`Unknown skill: ${skillId}`);
  const file = path.join(SKILLS_ROOT, skill.dir, skill.script);
  if (!fs.existsSync(file)) {
    throw new Error(`Skill script not found: ${file}. Set SKILLS_DIR to your skills folder.`);
  }
  return file;
}

function parseJson(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try { return JSON.parse(trimmed); } catch { /* fall through */ }
  const starts = [trimmed.indexOf('{'), trimmed.indexOf('[')].filter((i) => i >= 0);
  if (!starts.length) return null;
  const start = Math.min(...starts);
  for (let end = trimmed.length; end > start; end -= 1) {
    const slice = trimmed.slice(start, end);
    try { return JSON.parse(slice); } catch { /* shrink */ }
  }
  return null;
}

/**
 * Run one Python skill script. Returns { code, stdout, stderr, parsed, durationMs, timedOut, argv }.
 * `onChunk` receives { stream, text } for live logs when available.
 */
export function runScript({ skillId, argv, timeoutMs = 10 * 60 * 1000, onChunk }) {
  const script = skillPath(skillId);
  const fullArgs = [script, ...argv];
  return new Promise((resolve) => {
    fs.mkdirSync(DATA_ROOT, { recursive: true });
    const child = spawn(pythonExecutable(), fullArgs, {
      cwd: PROJECT_ROOT,
      env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONIOENCODING: 'utf-8' },
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const started = Date.now();
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout.on('data', (buf) => {
      const text = buf.toString('utf8');
      stdout += text;
      onChunk?.({ stream: 'stdout', text });
    });
    child.stderr.on('data', (buf) => {
      const text = buf.toString('utf8');
      stderr += text;
      onChunk?.({ stream: 'stderr', text });
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        code: -1, stdout, stderr: stderr + `\n${err.message}`, parsed: null,
        durationMs: Date.now() - started, timedOut: false, argv: fullArgs,
      });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        code: timedOut ? -2 : code ?? -1,
        stdout,
        stderr,
        parsed: parseJson(stdout),
        durationMs: Date.now() - started,
        timedOut,
        argv: fullArgs,
      });
    });
  });
}

// ---- in-memory activity log -------------------------------------------------

const history = [];
const MAX_HISTORY = 300;

export function logRun(entry) {
  const record = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    ...entry,
    stdout: (entry.stdout || '').slice(0, 40000),
    stderr: (entry.stderr || '').slice(0, 20000),
  };
  history.unshift(record);
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  return record;
}

export function getHistory(limit = 60) {
  return history.slice(0, limit).map((r) => {
    const { stdout, stderr, parsed, ...rest } = r;
    return { ...rest, stdoutPreview: (stdout || '').slice(0, 400), hasError: Boolean(stderr?.trim()) };
  });
}

export function getHistoryEntry(id) {
  return history.find((r) => r.id === id) || null;
}
