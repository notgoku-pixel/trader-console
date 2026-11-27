import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './lib/api.js';
import Icon from './components/Icon.jsx';
import Header from './components/Header.jsx';
import HexBackdrop from './components/HexBackdrop.jsx';
import SkillRunner from './components/SkillRunner.jsx';
import PipelineView from './components/PipelineView.jsx';
import DataView from './components/DataView.jsx';
import ConfigView from './components/ConfigView.jsx';
import LogView from './components/LogView.jsx';

const SKILL_ICONS = {
  scanner: 'radar', news: 'news', pelosi: 'congress', analyst: 'sec',
  entry: 'entry', exit: 'exit', timemachine: 'sim',
  budget: 'size', risk: 'risk', broker: 'broker', alerts: 'bell',
};
const PHASE_ORDER = ['Discover', 'Plan', 'Execute', 'Monitor'];

function defaultsFor(params = {}) {
  // params arrive from the API as objects; normalize defaults here.
  return Object.fromEntries(params.map((p) => [p.key, p.default ?? '']));
}

export default function App() {
  const [meta, setMeta] = useState({ skills: [], pipeline: [] });
  const [tab, setTab] = useState('dashboard');
  const [skillId, setSkillId] = useState('scanner');
  const [actionId, setActionId] = useState('universe');
  const [values, setValues] = useState({ pause: 0.3 });
  const [result, setResult] = useState(null);
  const [runError, setRunError] = useState('');
  const [loading, setLoading] = useState(false);

  const [market, setMarket] = useState(null);
  const [apiOnline, setApiOnline] = useState(false);
  const [pipeline, setPipeline] = useState(null);
  const [config, setConfig] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState('trader/plan.json');
  const [fileDetail, setFileDetail] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logDetail, setLogDetail] = useState(null);
  const [stats, setStats] = useState({});
  const [toast, setToast] = useState('');

  const notify = (text) => { setToast(text); setTimeout(() => setToast(''), 3500); };

  const refreshPipeline = useCallback(() => api.getPipeline().then(setPipeline).catch(() => {}), []);
  const refreshFiles = useCallback(() => api.getFiles().then((d) => setFiles(d.files || [])).catch(() => {}), []);
  const refreshLogs = useCallback(() => api.getLog(80).then((d) => setLogs(d.entries || [])).catch(() => {}), []);
  const refreshStatus = useCallback(() => api.getStatus()
    .then((d) => { setMarket(d); setApiOnline(true); })
    .catch(() => setApiOnline(false)), []);

  const refreshStats = useCallback(async () => {
    try {
      const [watchlist, risk, alerts] = await Promise.all([
        api.getFile('trader/watchlist.json'),
        api.getFile('trader/state/risk.json'),
        api.getFile('trader/alerts.json'),
      ]);
      setStats({
        setups: watchlist.data?.hits?.length ?? 0,
        riskPass: risk.data?.pass ?? 0,
        riskBlock: risk.data?.block ?? 0,
        alerts: alerts.data?.rules?.length ?? 0,
        watchlistSource: watchlist.source,
      });
    } catch { /* stats are cosmetic */ }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [m, c, f, l] = await Promise.all([api.getSkills(), api.getConfig(), api.getFiles(), api.getLog(80)]);
        if (!alive) return;
        setMeta({ skills: m.skills || [], pipeline: m.pipeline || [] });
        setConfig(c);
        setFiles(f.files || []);
        setLogs(l.entries || []);
        const first = m.skills?.[0];
        if (first) {
          setSkillId(first.id);
          setActionId(first.actions[0].id);
          setValues(defaultsFor(first.actions[0].params));
        }
      } catch (err) {
        if (alive) notify(`Could not reach the API: ${err.message}`);
      }
    })();
    refreshPipeline();
    refreshStatus();
    refreshStats();
    return () => { alive = false; };
  }, [refreshPipeline, refreshStatus, refreshStats]);

  useEffect(() => {
    const id = setInterval(() => {
      refreshPipeline();
      if (pipeline?.running) refreshLogs();
    }, pipeline?.running ? 1200 : 8000);
    return () => clearInterval(id);
  }, [pipeline?.running, refreshPipeline, refreshLogs]);

  useEffect(() => {
    const id = setInterval(refreshStatus, 90000);
    return () => clearInterval(id);
  }, [refreshStatus]);

  useEffect(() => {
    if (tab === 'data' && selectedFile) api.getFile(selectedFile).then(setFileDetail).catch(() => setFileDetail(null));
    if (tab === 'log' && logs[0]) api.getLogEntry(logs[0].id).then(setLogDetail).catch(() => {});
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const skill = meta.skills.find((s) => s.id === skillId);
  const action = skill?.actions.find((a) => a.id === actionId) || skill?.actions[0];

  const selectSkill = (id) => {
    const s = meta.skills.find((x) => x.id === id);
    if (!s) return;
    setSkillId(id);
    setActionId(s.actions[0].id);
    setValues(defaultsFor(s.actions[0].params));
    setResult(null);
    setRunError('');
    setTab('skills');
  };

  const selectAction = (id) => {
    const a = skill.actions.find((x) => x.id === id);
    if (!a) return;
    setActionId(id);
    setValues(defaultsFor(a.params));
    setResult(null);
    setRunError('');
  };

  const runSkill = async () => {
    setLoading(true);
    setRunError('');
    setResult(null);
    try {
      const res = await api.runSkill({ skillId, actionId, values, confirm: 'CONFIRM' });
      setResult(res);
      refreshFiles();
      refreshLogs();
      refreshStats();
    } catch (err) {
      setRunError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startPipeline = async (options) => {
    try {
      await api.startPipeline(options);
      refreshPipeline();
      notify('Pipeline started — watch the live log.');
    } catch (err) { notify(err.message); }
  };
  const stopPipeline = async () => {
    try { await api.stopPipeline(); refreshPipeline(); notify('Stop requested.'); }
    catch (err) { notify(err.message); }
  };
  const saveConfig = async (draft) => {
    try {
      const res = await api.saveConfig(draft);
      setConfig(res.config);
      refreshFiles();
      notify('Config saved to trader/config.json');
    } catch (err) { notify(err.message); }
  };
  const pickFile = async (path) => {
    setSelectedFile(path);
    try { setFileDetail(await api.getFile(path)); } catch { setFileDetail(null); }
  };
  const pickLog = async (id) => {
    try { setLogDetail(await api.getLogEntry(id)); } catch { setLogDetail(null); }
  };

  const grouped = useMemo(() => {
    const out = {};
    for (const phase of PHASE_ORDER) out[phase] = meta.skills.filter((s) => s.phase === phase);
    return out;
  }, [meta.skills]);

  const m = market?.market;
  const open = m?.open === true;

  return (
    <div className="app">
      <HexBackdrop />
      <Header tab={tab} setTab={setTab} market={market} apiOnline={apiOnline} />

      <div className="stat-strip">
        <div className="stat"><Icon name="clock" size={15} /><span>MARKET</span><strong className={open ? 'up' : 'down'}>{open ? 'OPEN' : 'CLOSED'}</strong></div>
        <div className="stat"><Icon name="radar" size={15} /><span>SETUPS</span><strong>{stats.setups ?? '—'}</strong></div>
        <div className="stat"><Icon name="shield" size={15} /><span>RISK</span><strong className={stats.riskBlock ? 'down' : 'up'}>{stats.riskPass ?? 0}P / {stats.riskBlock ?? 0}B</strong></div>
        <div className="stat"><Icon name="bell" size={15} /><span>ALERTS</span><strong>{stats.alerts ?? '—'}</strong></div>
        <div className="stat"><Icon name="shield" size={15} /><span>MODE</span><strong className="up">PAPER</strong></div>
        <div className="stat stat-wide"><Icon name="news" size={15} /><span>NEW YORK</span><strong>{m?.now_new_york || '—'}</strong></div>
      </div>

      <main className="main">
        {tab === 'dashboard' && (
          <PipelineView pipeline={pipeline} config={config} onStart={startPipeline} onStop={stopPipeline} onRefresh={refreshPipeline} />
        )}

        {tab === 'skills' && (
          <div className="skills-layout">
            <aside className="skills-rail">
              <div className="eyebrow">11 SKILLS</div>
              {PHASE_ORDER.map((phase) => (
                <div className="rail-group" key={phase}>
                  <div className="rail-title">{phase}</div>
                  {(grouped[phase] || []).map((s) => (
                    <button key={s.id} className={`rail-skill ${skillId === s.id ? 'active' : ''}`}
                      style={{ '--accent': s.accent }} onClick={() => selectSkill(s.id)}>
                      <Icon name={SKILL_ICONS[s.id] || 'spark'} size={16} />
                      <span>{s.name}</span>
                      <Icon name="chevron" size={13} className="rail-chevron" />
                    </button>
                  ))}
                </div>
              ))}
              <div className="rail-note"><Icon name="shield" size={14} /> No automatic orders. Every broker step needs your explicit yes.</div>
            </aside>
            <div className="skills-main">
              {skill && action && (
                <>
                  <div className="action-tabs">
                    {skill.actions.map((a) => (
                      <button key={a.id} className={`action-tab ${a.id === actionId ? 'active' : ''}`}
                        onClick={() => selectAction(a.id)}>{a.label}</button>
                    ))}
                  </div>
                  <SkillRunner key={`${skillId}-${actionId}`} skill={skill} action={action}
                    values={values} setValues={setValues} onRun={runSkill}
                    result={result} error={runError} loading={loading} />
                </>
              )}
            </div>
          </div>
        )}

        {tab === 'data' && (
          <DataView files={files} selected={selectedFile} onSelect={pickFile}
            detail={fileDetail} onRefresh={() => { refreshFiles(); if (selectedFile) pickFile(selectedFile); }} />
        )}

        {tab === 'config' && <ConfigView config={config} onSave={saveConfig} />}

        {tab === 'log' && (
          <LogView entries={logs} detail={logDetail} onSelect={pickLog} onRefresh={() => { refreshLogs(); if (logs[0]) pickLog(logs[0].id); }} />
        )}
      </main>

      <footer className="footer">
        <span>Educational tooling · free delayed data · nothing here places a real order without your approval</span>
        <span>trader-console v1.0 · {m?.early_close ? 'early close today' : 'NYSE calendar 2026/2027'}</span>
      </footer>
      {toast && <div className="toast"><Icon name="check" size={15} /> {toast}</div>}
    </div>
  );
}
