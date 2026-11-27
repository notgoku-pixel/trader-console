import React, { useState } from 'react';
import Icon from './Icon.jsx';
import OutputView from './OutputView.jsx';

function Field({ param, value, onChange }) {
  const id = `field-${param.key}`;
  const label = (
    <label className="field-label" htmlFor={id}>
      {param.label}
      {param.required && <span className="req">*</span>}
    </label>
  );

  if (param.type === 'const') {
    return (
      <label className="toggle-field" htmlFor={id}>
        <input id={id} type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        <span className="toggle-track"><span className="toggle-thumb" /></span>
        <span>{param.label}</span>
      </label>
    );
  }

  if (param.type === 'select') {
    return (
      <div className="field">
        {label}
        <select id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">— default —</option>
          {(param.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }

  return (
    <div className="field">
      {label}
      <input
        id={id}
        type={param.type === 'number' ? 'number' : 'text'}
        step={param.type === 'number' ? 'any' : undefined}
        value={value ?? ''}
        placeholder={param.placeholder || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export default function SkillRunner({ skill, action, values, setValues, onRun, result, error, loading }) {
  const [confirm, setConfirm] = useState('');
  const dangerOK = !action.danger || confirm === 'CONFIRM';
  const missing = action.params.find((p) => p.required && (values[p.key] === '' || values[p.key] == null));

  return (
    <section className="runner panel">
      <div className="runner-head">
        <div>
          <div className="eyebrow">{skill.tag} · {skill.phase.toUpperCase()}</div>
          <h2>{skill.name}</h2>
          <p className="muted">{action.desc || skill.blurb}</p>
        </div>
        <span className="skill-badge" style={{ '--accent': skill.accent }}>{action.label}</span>
      </div>

      {action.danger && (
        <div className="danger-box">
          <Icon name="risk" size={18} />
          <div>
            <strong>This action changes local order state.</strong>
            <p>No order is placed by this app. The real broker still requires your approval in Claude Desktop. Type <code>CONFIRM</code> to continue.</p>
            <input className="confirm-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Type CONFIRM" />
          </div>
        </div>
      )}

      <div className="field-grid">
        {action.params.map((p) => (
          <Field key={p.key} param={p} value={values[p.key]} onChange={(v) => setValues((old) => ({ ...old, [p.key]: v }))} />
        ))}
      </div>

      <div className="runner-actions">
        <button className="btn btn-primary" disabled={loading || !dangerOK || Boolean(missing)} onClick={onRun}>
          <Icon name={loading ? 'refresh' : 'play'} size={16} className={loading ? 'spin' : ''} />
          {loading ? 'Running…' : `Run ${action.label}`}
        </button>
        {missing && <span className="hint error-text">Fill required field: {missing.label}</span>}
        <span className="hint">Writes to the local <code>trader/</code> folder. Nothing is sent to a broker.</span>
      </div>

      <OutputView result={result} error={error} loading={loading} />
    </section>
  );
}
