import React from 'react';
import Icon from './Icon.jsx';

export default function DataView({ files, selected, onSelect, detail, onRefresh }) {
  return (
    <div className="data-view">
      <section className="panel file-list-panel">
        <div className="panel-head">
          <div><div className="eyebrow">LOCAL STATE</div><h2>Data files</h2></div>
          <button className="btn btn-ghost" onClick={onRefresh}><Icon name="refresh" size={16} /> Refresh</button>
        </div>
        <p className="muted small">Live files come from the pipeline. Sample files are bundled from the skill examples so the UI works offline.</p>
        <div className="file-list">
          {(files || []).map((f) => (
            <button key={f.path} className={`file-row ${selected === f.path ? 'active' : ''}`} onClick={() => onSelect(f.path)}>
              <span className="file-icon"><Icon name={f.kind === 'text' ? 'news' : 'db'} size={15} /></span>
              <span className="file-main">
                <strong>{f.label}</strong>
                <small>{f.path}</small>
              </span>
              <span className={`source-badge ${f.source}`}>{f.source}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel file-view-panel">
        {detail ? (
          <>
            <div className="panel-head">
              <div>
                <div className="eyebrow">{detail.path}</div>
                <h2>{files?.find((f) => f.path === detail.path)?.label || 'File'}</h2>
              </div>
              <span className={`source-badge ${detail.source}`}>{detail.source}</span>
            </div>
            {detail.modified && <p className="muted small">Modified {new Date(detail.modified).toLocaleString()}</p>}
            <pre className="terminal file-content">{detail.data ? JSON.stringify(detail.data, null, 2) : detail.raw || '(empty)'}</pre>
          </>
        ) : (
          <div className="empty-view"><Icon name="db" size={28} /><p>Select a file to inspect its contents.</p></div>
        )}
      </section>
    </div>
  );
}
