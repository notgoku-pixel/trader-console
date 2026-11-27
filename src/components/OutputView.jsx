import React, { useState } from 'react';
import Icon from './Icon.jsx';

const fmtMs = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`);

export default function OutputView({ result, error, loading, emptyText = 'Run a skill to see its output here.' }) {
  const [mode, setMode] = useState('text');
  const [copied, setCopied] = useState(false);

  const text = result ? `${result.stdout || ''}${result.stderr ? `\n${result.stderr}` : ''}`.trim() : '';
  const json = result?.parsed ? JSON.stringify(result.parsed, null, 2) : '';
  const command = result?.argv ? [result.argv[0], ...result.argv.slice(1)].join(' ') : '';
  const shown = mode === 'json' ? json : mode === 'cmd' ? command : text;

  const copy = async () => {
    if (!shown) return;
    try {
      await navigator.clipboard.writeText(shown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch { /* clipboard unavailable */ }
  };

  if (loading) {
    return (
      <div className="output-view loading-view">
        <div className="spinner" />
        <p>Skill is running… this can take a minute when it fetches live charts.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="output-view">
        <div className="result-banner banner-error"><Icon name="close" size={16} /> {error}</div>
      </div>
    );
  }

  if (!result) {
    return <div className="output-view empty-view"><Icon name="bolt" size={28} /><p>{emptyText}</p></div>;
  }

  return (
    <div className="output-view">
      <div className="output-bar">
        <div className={`result-banner ${result.ok === false ? 'banner-error' : 'banner-ok'}`}>
          <Icon name={result.ok === false ? 'close' : 'check'} size={15} />
          {result.ok === false ? 'FAILED' : 'DONE'}
          <span className="muted">{result.code != null ? `exit ${result.code}` : ''} · {fmtMs(result.durationMs || 0)}</span>
        </div>
        <div className="output-actions">
          {result.parsed && (
            <button className={`chip ${mode === 'json' ? 'on' : ''}`} onClick={() => setMode(mode === 'json' ? 'text' : 'json')}>JSON</button>
          )}
          {command && (
            <button className={`chip ${mode === 'cmd' ? 'on' : ''}`} onClick={() => setMode(mode === 'cmd' ? 'text' : 'cmd')}>CMD</button>
          )}
          <button className="chip" onClick={copy} title="Copy output">
            <Icon name={copied ? 'check' : 'copy'} size={14} />
          </button>
        </div>
      </div>
      {result.summary && <div className="output-summary">{result.summary}</div>}
      <pre className={`terminal ${mode === 'json' ? 'json-mode' : ''}`}>{shown || '(no output)'}</pre>
    </div>
  );
}
