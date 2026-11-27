# Trader Console

A web control panel + one-click pipeline for the 11 `day-trader-skill` Claude skills. It runs the real Python scripts, displays their output, and stores their JSON state in a local `trader/` folder. The UI uses a dark hexagon / neon theme.

## Credits

The trading logic is the work of **Jake Schincariol** — this repository is a web UI and orchestration layer built around it, not a new trading system.

- [Jakeschincariol/trader-skill](https://github.com/Jakeschincariol/trader-skill) — the companion Claude skill collection that inspired this project.
- [Jakeschincariol/day-trader-skill](https://github.com/Jakeschincariol/day-trader-skill) — the 11 skills bundled in `skills/` and driven by the dashboard.

The upstream skill scripts are used as-is under the MIT license. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for the full notice.

**Nothing here places a real order.** The Order Executor only renders tickets and records your explicit yes; actual order placement still happens through your broker connector (Alpaca / IBKR) with its own approval step.

## Run it

Requires Node 18+ and Python 3. The skill scripts must be installed in `~/.claude/skills/trader-*`.

Two terminals:

```powershell
npm run server          # Express API on http://localhost:8787
npm run dev             # React dev server on http://localhost:5173
```

Open **http://localhost:5173**. For a production build: `npm run build`, then `npm run start` and open **http://localhost:8787**.

On Windows, if `npm` is blocked by execution policy, use `npm.cmd` or `& "C:\Program Files\nodejs\npm.cmd" <command>`.

## What it does

- **Pipeline tab** — runs the documented hand-off order:

  `scanner universe → scanner daily → news → entry → exit → timemachine → alerts → quotes → budget → risk → broker ticket`

  Optional steps (universe, news, simulation, alerts) can be toggled. You can override the symbol, scan limit, replay count and news lookback. Live log streams each script's output; any hard failure halts the chain before any order step.

- **Skills tab** — all 11 skills with their real CLI flags exposed as forms. Each shows a terminal-style output view plus a JSON/command toggle.
- **Data tab** — inspects every `trader/*.json` file the scripts write. Files are marked `LIVE` when generated locally or `SAMPLE` when bundled examples are shown offline.
- **Config tab** — edits `trader/config.json` (budget, max loss per trade, daily limits, session window, stop requirement, paper mode, SEC User-Agent, etc.).
- **Activity tab** — run history with full stdout/stderr for each invocation.

## Live + sample fallback

Scripts fetch Yahoo Finance, Nasdaq Trader and SEC EDGAR directly using Python's standard library. If a file has not been generated yet, the Data tab falls back to the bundled examples in `data/samples/` so the UI is still useful offline. The Dashboard stat strip shows which source is in use.

SEC endpoints (News 8-Ks and Earnings Analyst) need a real User-Agent: set it in the Config tab or pass it on the skill form. Otherwise those scripts skip SEC lookups with a note.

## Safety notes

- `paper: true` is the default in `trader/config.json`.
- Broker `approve` / `flatten` actions require typing `CONFIRM` in the UI. The Python script additionally records your verbatim reply, and the broker MCP tool itself must be set to **Needs approval**.
- Risk verdicts are fingerprinted; the broker ticket is only READY when a same-day PASS exists for that exact order.
- All data stays in `trader/` inside this folder. The app does not send your keys anywhere.

## Configuration

| Env var | Purpose |
|---|---|
| `SKILLS_DIR` | Override the skills folder (default `~/.claude/skills`) |
| `TRADER_DATA_DIR` | Override where `trader/` data is written |
| `PYTHON` | Override the Python executable |
| `PORT` | API port (default `8787`) |

## Deploy free on Render

The repo is self-contained: the 11 skill folders are bundled under `skills/` and `render.yaml` points the app at them.

1. Create a free account at [render.com](https://render.com).
2. Click **New + → Blueprint** and connect your GitHub account.
3. Select `provide a name` and the `main` branch. Render reads `render.yaml` automatically.
4. Click **Apply**. The first Docker build takes a few minutes; later pushes auto-deploy.

Free tier notes:
- The instance **sleeps after ~15 minutes of inactivity** and takes 30–60 seconds to wake on the first visit. Keeping the dashboard tab open makes it poll every few seconds and keeps it awake.
- `trader/` state lives inside the container. It survives while the instance runs but is reset after a redeploy or if the instance is rebuilt. Treat hosted state as disposable — your local copy is the source of truth.
- For always-on pipeline/alerts, use an Always Free VM instead (Oracle Cloud); free container hosts are not designed for nonstop background jobs.
- If you want SEC filings in the hosted app, set a real `sec_user_agent` in the Config tab after first load; never put secrets in the repo.

## Project layout

```
server/     Express API, skill registry, subprocess runner, pipeline, data store
src/        React single-page app
data/samples/  Bundled example JSON for offline viewing
trader/     Generated live state (created on first run)
```
