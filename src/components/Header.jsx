import React from 'react';
import Icon from './Icon.jsx';

const TABS = [
  { id: 'dashboard', label: 'Pipeline', icon: 'bolt' },
  { id: 'skills', label: 'Skills', icon: 'grid' },
  { id: 'data', label: 'Data', icon: 'db' },
  { id: 'config', label: 'Config', icon: 'cog' },
  { id: 'log', label: 'Activity', icon: 'activity' },
];

export default function Header({ tab, setTab, market, apiOnline }) {
  const m = market?.market;
  const open = m?.open === true;
  const statusText = open ? 'NYSE OPEN' : 'NYSE CLOSED';

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark"><Icon name="radar" size={26} /></div>
        <div className="brand-text">
          <div className="brand-title">TRADER<span>//</span>CONSOLE</div>
          <div className="brand-sub">day-trader-skill · control deck</div>
        </div>
      </div>

      <nav className="tabs" aria-label="Main navigation">
        {TABS.map((t) => (
          <button key={t.id} type="button"
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}>
            <Icon name={t.icon} size={16} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <div className="status-cluster">
        <div className={`pill ${open ? 'pill-open' : 'pill-closed'}`} title={m?.reason || ''}>
          <span className="pill-dot" />
          {statusText}
        </div>
        <div className="pill pill-muted" title={m?.next_open || ''}>
          <Icon name="clock" size={13} />
          <span>{m?.now_new_york || '--:-- ET'}</span>
        </div>
        <div className={`pill ${apiOnline ? 'pill-ok' : 'pill-error'}`} title="Backend connection">
          <span className="pill-dot" />
          {apiOnline ? 'API ONLINE' : 'API OFFLINE'}
        </div>
        <div className="pill pill-paper" title="Orders are paper by default">
          <Icon name="shield" size={13} /> PAPER
        </div>
      </div>
    </header>
  );
}
