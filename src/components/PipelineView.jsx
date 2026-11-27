import React, { useEffect, useState } from 'react';
import Icon from './Icon.jsx';

const STATUS_ICON = { done: 'check', error: 'close', warning: 'risk', running: 'refresh', skipped: 'chevron', pending: 'clock' };

export default function PipelineView({ pipeline, config, onStart, onStop, onRefresh }) {
  const [opts, setOpts] = useState({
    symbol: '', limit: 120, replays: 2000, hours: 24,
    includeUniverse: true, includeNews: true, includeSimulation: true, includeAlerts: true,
  });

  useEffect(() => {
    if (!opts.symbol && config?.symbol_hint) setOpts((o) => ({ ...o, symbol: config.symbol_hint }));
  }, [config?.symbol_hint, opts.symbol]);

  const set = (key, value) => setOpts((o) => ({ ...o, [key]: value }));
  const steps = pipeline?.steps || [];
  const doneCount = steps.filter((s) => ['done', 'warning'].includes(s.status)).length;
  const progress = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;
  const running = Boolean(pipeline?.running);

  return (
    <div className="pipeline-view">
      <section className="panel pipeline-control">
        <div className="panel-head">
          <div>
            <div className="eyebrow">AUTOMATED HAND-OFF ORDER</div>
            <h2>One-click pipeline</h2>
            <p className="muted">Runs the skills in the documented order. The last step only <em>builds</em> a ticket — no order is placed automatically.</p>
          </div>
          <div className="pipeline-buttons">
            <button className="btn btn-ghost" onClick={onRefresh} title="Refresh status"><Icon name="refresh" size={16} /></button>
            {running ? (
              <button className="btn btn-danger" onClick={onStop}><Icon name="stop" size={15} /> Stop</button>
            ) : (
              <button className="btn btn-primary" onClick={() => onStart({ ...opts, secUserAgent: config?.sec_user_agent })}>
                <Icon name="play" size={15} /> Run pipeline
              </button>
            )}
          </div>
        </div>

        <div className="pipeline-options">
          <div className="field compact">
            <label className="field-label" htmlFor="pl-symbol">Symbol (blank = first watchlist hit)</label>
            <input id="pl-symbol" value={opts.symbol} placeholder="TSLA" onChange={(e) => set('symbol', e.target.value.toUpperCase())} />
          </div>
          <div className="field compact">
            <label className="field-label" htmlFor="pl-limit">Scan limit</label>
            <input id="pl-limit" type="number" value={opts.limit} onChange={(e) => set('limit', e.target.value)} />
          </div>
          <div className="field compact">
            <label className="field-label" htmlFor="pl-replays">Replays</label>
            <input id="pl-replays" type="number" value={opts.replays} onChange={(e) => set('replays', e.target.value)} />
          </div>
          <div className="field compact">
            <label className="field-label" htmlFor="pl-hours">News lookback (h)</label>
            <input id="pl-hours" type="number" value={opts.hours} onChange={(e) => set('hours', e.target.value)} />
          </div>
        </div>
        <div className="check-row">
          {[
            ['includeUniverse', 'Universe'], ['includeNews', 'News'],
            ['includeSimulation', 'Time Machine'], ['includeAlerts', 'Alerts'],
          ].map(([key, label]) => (
            <label key={key} className="check-chip">
              <input type="checkbox" checked={opts[key]} onChange={(e) => set(key, e.target.checked)} />
              <span>{label}</span>
            </label>
          ))}
          <span className="spacer" />
          <span className="muted small">SEC agent: {config?.sec_user_agent && !config.sec_user_agent.includes('example.com') ? 'set' : 'not set (8-Ks skipped)'}</span>
        </div>

        <div className="progress-line">
          <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
          <span>{doneCount}/{steps.length || 11} steps · {running ? 'running' : pipeline?.finishedAt ? 'finished' : 'idle'}</span>
        </div>
      </section>

      <div className="pipeline-columns">
        <section className="panel step-panel">
          <div className="panel-head"><h3>Execution chain</h3><span className="muted small">scanner → news → entry → exit → sim → alerts → budget → risk → broker</span></div>
          <ol className="steps">
            {steps.length === 0 && <li className="step pending"><span className="step-num">—</span><span>Run the pipeline to see steps here.</span></li>}
            {steps.map((s, i) => (
              <li key={s.key} className={`step ${s.status}`}>
                <span className="step-num">{String(i + 1).padStart(2, '0')}</span>
                <span className={`step-icon status-${s.status}`}><Icon name={STATUS_ICON[s.status] || 'clock'} size={14} /></span>
                <span className="step-body">
                  <strong>{s.label}</strong>
                  <small>{s.summary || `${s.skill}/${s.action}`}</small>
                </span>
                <span className="step-meta">{s.durationMs ? `${(s.durationMs / 1000).toFixed(1)}s` : ''}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="panel live-panel">
          <div className="panel-head"><h3>Live log</h3><span className={`live-dot ${running ? 'on' : ''}`} /></div>
          <div className="live-log">
            {(pipeline?.logs || []).length === 0 && <div className="muted">No activity yet.</div>}
            {(pipeline?.logs || []).map((l, i) => (
              <div key={i} className={`log-line log-${l.stream}`}>
                <span className="log-time">{l.at.slice(11, 19)}</span>
                <span>{l.text}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
