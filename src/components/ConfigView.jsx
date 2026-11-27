import React, { useEffect, useState } from 'react';
import Icon from './Icon.jsx';

const GROUPS = [
  {
    title: 'Money & risk', icon: 'shield',
    fields: [
      ['budget', 'Account budget ($)', 'number'],
      ['max_loss_per_trade_usd', 'Max loss per trade ($)', 'number'],
      ['max_daily_loss_usd', 'Daily loss limit ($)', 'number'],
      ['max_position_pct', 'Max position (%)', 'number'],
      ['max_order_usd', 'Max order ($)', 'number'],
      ['min_order_usd', 'Min order ($)', 'number'],
      ['min_reward_risk', 'Min reward:risk', 'number'],
      ['cash_buffer_pct', 'Cash buffer (%)', 'number'],
    ],
  },
  {
    title: 'Session rules', icon: 'clock',
    fields: [
      ['no_entries_before', 'No entries before (HH:MM)', 'text'],
      ['no_entries_after', 'No entries after (HH:MM)', 'text'],
      ['flat_by', 'Flat by (HH:MM)', 'text'],
      ['max_trades_per_day', 'Max trades per day', 'number'],
      ['max_orders_per_day', 'Max orders per day', 'number'],
    ],
  },
  {
    title: 'Broker & style', icon: 'broker',
    fields: [
      ['broker', 'Broker', 'text'],
      ['paper', 'Paper trading', 'bool'],
      ['fractional', 'Fractional shares', 'bool'],
      ['require_stop', 'Require a stop', 'bool'],
      ['allow_short', 'Allow short sales', 'bool'],
      ['allow_options', 'Allow options', 'bool'],
      ['allow_margin', 'Allow margin', 'bool'],
      ['pdt_guard', 'PDT guard', 'bool'],
      ['blocked', 'Blocked tickers', 'list'],
    ],
  },
  {
    title: 'SEC filings', icon: 'sec',
    fields: [
      ['sec_user_agent', 'SEC User-Agent (Name email)', 'text'],
    ],
  },
];

export default function ConfigView({ config, onSave }) {
  const [draft, setDraft] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (config) {
      const { _source, ...rest } = config;
      setDraft(rest);
      setSaved(false);
    }
  }, [config]);

  const set = (key, value) => { setDraft((d) => ({ ...d, [key]: value })); setSaved(false); };
  const save = async () => {
    await onSave(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="config-view">
      <section className="panel config-intro">
        <div>
          <div className="eyebrow">WRITTEN TO trader/config.json</div>
          <h2>Trading rules</h2>
          <p className="muted">These limits are read by the Budget Manager and the Risk Manager. A stop too far for your max loss is a refusal, never a smaller order.</p>
        </div>
        <button className="btn btn-primary" onClick={save}><Icon name="check" size={16} /> {saved ? 'Saved' : 'Save config'}</button>
      </section>

      <div className="config-grid">
        {GROUPS.map((group) => (
          <section className="panel config-group" key={group.title}>
            <div className="group-title"><Icon name={group.icon} size={17} /><h3>{group.title}</h3></div>
            <div className="config-fields">
              {group.fields.map(([key, label, type]) => {
                if (type === 'bool') {
                  return (
                    <label className="toggle-field" key={key}>
                      <input type="checkbox" checked={Boolean(draft[key])}
                        onChange={(e) => set(key, e.target.checked)} />
                      <span className="toggle-track"><span className="toggle-thumb" /></span>
                      <span>{label}</span>
                    </label>
                  );
                }
                const isList = type === 'list';
                return (
                  <div className="field" key={key}>
                    <label className="field-label">{label}</label>
                    <input type={type === 'number' ? 'number' : 'text'}
                      step={type === 'number' ? 'any' : undefined}
                      value={isList ? (Array.isArray(draft[key]) ? draft[key].join(', ') : draft[key] || '') : draft[key] ?? ''}
                      placeholder={isList ? 'TSLA, NVDA' : ''}
                      onChange={(e) => set(key, isList ? e.target.value.split(/[\s,]+/).filter(Boolean) : e.target.value)} />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
