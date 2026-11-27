import React from 'react';
import Icon from './Icon.jsx';
import OutputView from './OutputView.jsx';

export default function LogView({ entries, detail, onSelect, onRefresh }) {
  return (
    <div className="log-view">
      <section className="panel log-list-panel">
        <div className="panel-head">
          <div><div className="eyebrow">RUN HISTORY</div><h2>Activity</h2></div>
          <button className="btn btn-ghost" onClick={onRefresh}><Icon name="refresh" size={16} /> Refresh</button>
        </div>
        <div className="log-entries">
          {(entries || []).length === 0 && <p className="muted">No runs recorded yet.</p>}
          {(entries || []).map((e) => (
            <button key={e.id} className={`log-entry ${detail?.id === e.id ? 'active' : ''}`} onClick={() => onSelect(e.id)}>
              <span className={`log-status ${e.code === 0 ? 'ok' : 'bad'}`}><Icon name={e.code === 0 ? 'check' : 'close'} size={13} /></span>
              <span className="log-main">
                <strong>{e.skill} <span className="muted">/ {e.action}</span></strong>
                <small>{e.summary || e.stdoutPreview || '—'}</small>
              </span>
              <span className="log-when">{e.at?.slice(11, 19)}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="panel log-detail-panel">
        {detail ? (
          <>
            <div className="panel-head"><h3>{detail.skill} / {detail.action}</h3><span className="muted small">{detail.at}</span></div>
            <OutputView result={{ ok: detail.code === 0, code: detail.code, durationMs: detail.durationMs, stdout: detail.stdout, stderr: detail.stderr, argv: detail.argv }} />
          </>
        ) : (
          <div className="empty-view"><Icon name="activity" size={28} /><p>Select a run to inspect its full output.</p></div>
        )}
      </section>
    </div>
  );
}
