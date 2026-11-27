// Registry of every installed day-trader skill, its commands and UI form schema.
// The Python scripts themselves remain the single source of truth; this file only
// describes how to call them and what controls to show in the web UI.

const DEFAULTS = {
  budget: 5000,
  cash_buffer_pct: 10,
  max_position_pct: 75,
  max_order_usd: 4000,
  min_order_usd: 5,
  max_loss_per_trade_usd: 50,
  max_daily_loss_usd: 150,
  max_trades_per_day: 3,
  max_orders_per_day: 10,
  min_reward_risk: 1.0,
  require_stop: true,
  no_entries_before: '09:45',
  no_entries_after: '15:30',
  flat_by: '15:55',
  fractional: false,
  broker: 'alpaca',
  paper: true,
  blocked: [],
  allow_options: false,
  allow_margin: false,
  allow_short: false,
  pdt_guard: false,
  sec_user_agent: 'Your Name you@example.com',
};

const p = (key, label, type, flag, extra = {}) => ({ key, label, type, flag, ...extra });

export const SKILLS = [
  {
    id: 'scanner',
    dir: 'trader-scanner',
    script: 'scan.py',
    name: 'Chart Scanner',
    tag: 'SCAN',
    phase: 'Discover',
    accent: '#4d8dff',
    blurb: 'Builds the US stock universe and finds opening-range breakouts, 20-day breakouts, flags and oversold bounces.',
    outputs: ['trader/universe.txt', 'trader/watchlist.json'],
    actions: [
      {
        id: 'universe', label: 'Build universe', json: true,
        desc: 'Download Nasdaq Trader symbol directories.',
        params: [p('pause', 'Pause between requests (s)', 'number', '--pause', { default: 0.3 })],
      },
      {
        id: 'daily', label: 'Daily scan', json: true,
        desc: 'Scan daily closes for setups. Writes trader/watchlist.json.',
        params: [
          p('symbols', 'Symbols (comma separated)', 'value', '--symbols', { placeholder: 'TSLA,NVDA,AMD' }),
          p('limit', 'Max symbols to scan', 'number', '--limit', { default: 120 }),
          p('min_price', 'Min price ($)', 'number', '--min-price', { default: 5 }),
          p('min_volume', 'Min volume', 'number', '--min-volume', { default: 1000000 }),
          p('show', 'Rows to display', 'number', '--show', { default: 30 }),
          p('pause', 'Pause (s)', 'number', '--pause', { default: 0.3 }),
        ],
      },
      {
        id: 'orb', label: 'Opening-range scan', json: true,
        desc: 'Scan 5-minute bars for opening-range breakouts.',
        params: [
          p('symbols', 'Symbols (comma separated)', 'value', '--symbols', { placeholder: 'TSLA,NVDA,AMD' }),
          p('limit', 'Max symbols to scan', 'number', '--limit', { default: 120 }),
          p('or_minutes', 'Opening range (min)', 'number', '--or-minutes', { default: 15 }),
          p('max_confirm', 'Max confirmations', 'number', '--max-confirm', { default: 200 }),
          p('at', 'Check at (HH:MM)', 'value', '--at', { placeholder: '10:15' }),
          p('until', 'Until (HH:MM)', 'value', '--until', { placeholder: '15:30' }),
          p('pause', 'Pause (s)', 'number', '--pause', { default: 0.3 }),
        ],
      },
    ],
  },
  {
    id: 'news',
    dir: 'trader-news',
    script: 'news.py',
    name: 'News Monitor',
    tag: 'NEWS',
    phase: 'Discover',
    accent: '#a06bff',
    blurb: 'New Yahoo headlines and SEC 8-K filings for your watchlist, plus how far each stock is from yesterday’s close.',
    outputs: ['trader/state/news.json'],
    actions: [
      {
        id: 'check', label: 'Check news', json: true, sub: false,
        desc: 'Check what is new since the last run.',
        params: [
          p('tickers', 'Tickers (space separated)', 'list-pos', '--tickers', { placeholder: 'TSLA NVDA' }),
          p('hours', 'Look back (hours)', 'number', '--hours', { default: 48 }),
          p('forms', 'SEC form filter', 'value', '--forms', { default: '8-K' }),
          p('move_pct', 'MOVING threshold (%)', 'number', '--move-pct', { default: 3 }),
          p('all', 'Show all, not just new', 'const', '--all'),
          p('no_sec', 'Skip SEC filings', 'const', '--no-sec'),
          p('no_moves', 'Skip price moves', 'const', '--no-moves'),
        ],
      },
    ],
  },
  {
    id: 'pelosi',
    dir: 'trader-pelosi',
    script: 'ptr.py',
    name: 'Pelosi Tracker',
    tag: 'CONGRESS',
    phase: 'Discover',
    accent: '#ff5c9d',
    blurb: 'Reads House Clerk Periodic Transaction Reports and turns disclosures into clean trade rows.',
    outputs: ['trader/state/pelosi.json', 'trader/state/ptr-pdfs/'],
    actions: [
      {
        id: 'index', label: 'Index filings', json: true,
        desc: 'List PTR filings by member and date.',
        params: [
          p('year', 'Year', 'number', '--year', { default: new Date().getFullYear() }),
          p('member', 'Member name (repeatable)', 'repeat', '--member', { placeholder: 'pelosi' }),
          p('type', 'Filing type', 'value', '--type', { default: 'P' }),
          p('since', 'Since (YYYY-MM-DD)', 'value', '--since', { placeholder: '2026-10-01' }),
          p('limit', 'Max rows', 'number', '--limit', { default: 50 }),
        ],
      },
      {
        id: 'new', label: 'Check for new filings', json: true,
        desc: 'Alert once per new PTR, optionally parse PDFs with pdftotext.',
        params: [
          p('year', 'Year', 'number', '--year', { default: new Date().getFullYear() }),
          p('member', 'Member name (repeatable)', 'repeat', '--member', { placeholder: 'pelosi' }),
          p('since', 'Since (YYYY-MM-DD)', 'value', '--since', { placeholder: '2026-10-01' }),
          p('today', 'Pretend today is (YYYY-MM-DD)', 'value', '--today', { placeholder: '2026-10-19' }),
          p('tickers', 'Flag holdings (space separated)', 'list-pos', '--tickers', { placeholder: 'TSLA NVDA' }),
          p('read', 'Parse PDFs (needs pdftotext)', 'const', '--read'),
          p('dry-run', 'Do not save state', 'const', '--dry-run'),
        ],
      },
      {
        id: 'fetch', label: 'Fetch & parse a report', json: true,
        desc: 'Download and parse one PTR by document id.',
        params: [
          p('doc', 'Document ID', 'pos', '', { required: true, placeholder: '20035143' }),
          p('year', 'Year', 'number', '--year', { default: new Date().getFullYear() }),
          p('filed', 'Filed (YYYY-MM-DD)', 'value', '--filed'),
          p('tickers', 'Flag holdings (space separated)', 'list-pos', '--tickers'),
        ],
      },
    ],
  },
  {
    id: 'analyst',
    dir: 'trader-analyst',
    script: 'facts.py',
    name: 'Earnings Analyst',
    tag: 'SEC',
    phase: 'Discover',
    accent: '#34d6c4',
    blurb: 'Reads SEC XBRL company facts and earnings 8-Ks; reports quarter-by-quarter revenue, margins and EPS.',
    outputs: ['trader/metrics.json'],
    actions: [
      {
        id: 'report', label: 'Analyze earnings', json: true, sub: false,
        desc: 'Summarize the last N quarters from SEC filings.',
        params: [
          p('tickers', 'Tickers (space separated)', 'list-pos', '', { required: true, placeholder: 'TSLA AAPL' }),
          p('quarters', 'Quarters to show', 'number', '--quarters', { default: 6 }),
          p('metrics', 'Write metrics JSON path', 'value', '--metrics', { placeholder: 'trader/metrics.json' }),
          p('user_agent', 'SEC User-Agent (Name email)', 'value', '--user-agent', { placeholder: 'Jane Doe jane@example.com' }),
          p('cik', 'Override CIK', 'value', '--cik'),
          p('no_filings', 'Skip filing lookups', 'const', '--no-filings'),
        ],
      },
    ],
  },
  {
    id: 'entry',
    dir: 'trader-entry',
    script: 'entry.py',
    name: 'Entry Timer',
    tag: 'ENTRY',
    phase: 'Plan',
    accent: '#ffb648',
    blurb: 'Watches 1m/5m bars and calls the first completed bar that closes above the opening range or your level.',
    outputs: ['trader/entry.json'],
    actions: [
      {
        id: 'check', label: 'Check symbol', json: true,
        desc: 'One-off check: triggered, waiting, expired or market closed.',
        params: [
          p('symbol', 'Symbol', 'pos', '', { required: true, placeholder: 'TSLA' }),
          p('setup', 'Setup', 'select', '--setup', { default: 'orb', options: ['orb', 'level'] }),
          p('level', 'Level price (for level setup)', 'number', '--level', { placeholder: '371.20' }),
          p('interval', 'Bar interval', 'select', '--interval', { default: '5m', options: ['5m', '1m'] }),
          p('or_minutes', 'Opening range (min)', 'number', '--or-minutes', { default: 15 }),
          p('min_volume_x', 'Min volume multiple', 'number', '--min-volume-x', { placeholder: '1.5' }),
          p('write', 'Write trader/entry.json', 'const', '--write'),
        ],
      },
      {
        id: 'watch', label: 'Watch symbol (live)', json: false,
        desc: 'Poll every N seconds until the entry triggers or expires.',
        params: [
          p('symbol', 'Symbol', 'pos', '', { required: true, placeholder: 'TSLA' }),
          p('every', 'Poll every (seconds)', 'number', '--every', { default: 30 }),
          p('until', 'Stop at (HH:MM)', 'value', '--until', { placeholder: '15:30' }),
          p('setup', 'Setup', 'select', '--setup', { default: 'orb', options: ['orb', 'level'] }),
          p('level', 'Level price', 'number', '--level'),
          p('interval', 'Bar interval', 'select', '--interval', { default: '5m', options: ['5m', '1m'] }),
          p('or_minutes', 'Opening range (min)', 'number', '--or-minutes', { default: 15 }),
        ],
      },
      {
        id: 'watchlist', label: 'Check watchlist', json: true,
        desc: 'Run the entry check across every hit in watchlist.json.',
        params: [
          p('watchlist', 'Watchlist path', 'value', '--watchlist', { placeholder: 'trader/watchlist.json' }),
          p('setup', 'Setup', 'select', '--setup', { default: 'orb', options: ['orb', 'level'] }),
          p('level', 'Level price', 'number', '--level'),
          p('interval', 'Bar interval', 'select', '--interval', { default: '5m', options: ['5m', '1m'] }),
          p('or_minutes', 'Opening range (min)', 'number', '--or-minutes', { default: 15 }),
        ],
      },
    ],
  },
  {
    id: 'exit',
    dir: 'trader-exit',
    script: 'exit.py',
    name: 'Exit Planner',
    tag: 'PLAN',
    phase: 'Plan',
    accent: '#ff7b5c',
    blurb: 'Sets the stop and target before entry: opening-range midpoint by default, 2R target, and a flat-by time.',
    outputs: ['trader/plan.json'],
    actions: [
      {
        id: 'plan', label: 'Build plan', json: true,
        desc: 'Read entry.json (or your own numbers) and write trader/plan.json.',
        params: [
          p('from', 'Read entry from', 'value', '--from', { placeholder: 'trader/entry.json' }),
          p('symbol', 'Symbol override', 'value', '--symbol', { placeholder: 'TSLA' }),
          p('entry', 'Entry price override', 'number', '--entry'),
          p('or_high', 'Opening range high', 'number', '--or-high'),
          p('or_low', 'Opening range low', 'number', '--or-low'),
          p('or_minutes', 'Opening range (min)', 'number', '--or-minutes', { default: 15 }),
          p('setup', 'Setup', 'select', '--setup', { default: 'orb', options: ['orb', 'level'] }),
          p('stop', 'Stop rule', 'value', '--stop', { default: 'or-mid', placeholder: 'or-mid / or-low / price:358 / pct:2 / atr:1.5' }),
          p('target', 'Target rule', 'value', '--target', { default: '2R', placeholder: '2R / 1R / price:370' }),
          p('flat_by', 'Flat by (HH:MM)', 'value', '--flat-by', { placeholder: '15:55' }),
          p('write', 'Write trader/plan.json', 'const', '--write'),
        ],
      },
      {
        id: 'show', label: 'Show saved plan', json: true,
        desc: 'Re-render the stored plan.',
        params: [p('plan', 'Plan path', 'value', '--plan', { placeholder: 'trader/plan.json' })],
      },
    ],
  },
  {
    id: 'timemachine',
    dir: 'trader-timemachine',
    script: 'timemachine.py',
    name: 'Time Machine',
    tag: 'SIM',
    phase: 'Plan',
    accent: '#8f7bff',
    blurb: 'Replays the rest of the session 10,000 times and re-runs the rule on every past session it fired.',
    outputs: ['trader/timemachine.json'],
    actions: [
      {
        id: 'run', label: 'Run simulation', json: true,
        desc: 'Monte Carlo odds of target first, stop first, or neither.',
        params: [
          p('plan', 'Plan path', 'value', '--plan', { placeholder: 'trader/plan.json' }),
          p('replays', 'Replays', 'number', '--replays', { default: 10000 }),
          p('seed', 'Seed', 'number', '--seed', { default: 19 }),
          p('window', 'Window', 'number', '--window', { default: 2 }),
          p('until', 'Until (HH:MM)', 'value', '--until', { placeholder: '16:00' }),
          p('symbol', 'Symbol override', 'value', '--symbol'),
          p('entry', 'Entry override', 'number', '--entry'),
          p('stop', 'Stop override', 'number', '--stop'),
          p('target', 'Target override', 'number', '--target'),
          p('write', 'Write timemachine.json', 'const', '--write'),
        ],
      },
      {
        id: 'chart', label: 'Fan chart', json: false,
        desc: 'ASCII price fan chart from a saved run.',
        params: [p('from', 'Read run from', 'value', '--from', { placeholder: 'trader/timemachine.json' })],
      },
    ],
  },
  {
    id: 'budget',
    dir: 'trader-budget',
    script: 'size.py',
    name: 'Budget Manager',
    tag: 'SIZE',
    phase: 'Execute',
    accent: '#5ce0a0',
    blurb: 'Sizes whole shares under four limits and writes one proposed bracket order to trader/orders.json.',
    outputs: ['trader/orders.json'],
    actions: [
      {
        id: 'size', label: 'Size the trade', json: true, sub: false,
        desc: 'Find the share count that fits your risk and cash limits.',
        params: [
          p('plan', 'Plan path', 'value', '--plan', { placeholder: 'trader/plan.json' }),
          p('budget', 'Budget override ($)', 'number', '--budget'),
          p('limit', 'Use a limit price', 'optconst', '--limit', { placeholder: 'plan or a price; blank = market' }),
          p('prices', 'Prices path', 'value', '--prices', { placeholder: 'trader/prices.json' }),
          p('portfolio', 'Portfolio path', 'value', '--portfolio', { placeholder: 'trader/portfolio.json' }),
          p('weights', 'Weights mode', 'value', '--weights', { placeholder: 'AAPL=40,KO=60' }),
          p('targets', '13F targets file', 'value', '--targets'),
          p('top', 'Top N holdings', 'number', '--top'),
          p('whole_shares', 'Whole shares only', 'const', '--whole-shares'),
          p('write', 'Write trader/orders.json', 'const', '--write'),
        ],
      },
    ],
  },
  {
    id: 'risk',
    dir: 'trader-risk',
    script: 'check.py',
    name: 'Risk Manager',
    tag: 'RISK',
    phase: 'Execute',
    accent: '#ff4d6d',
    blurb: 'The gate before the broker: PASS or BLOCK per order with a fingerprint, daily limits and freshness checks.',
    outputs: ['trader/state/risk.json'],
    actions: [
      {
        id: 'check', label: 'Run risk check', json: true, sub: false,
        desc: 'Check every proposed order against your rules.',
        params: [
          p('orders', 'Orders path', 'value', '--orders', { placeholder: 'trader/orders.json' }),
          p('prices', 'Prices path', 'value', '--prices', { placeholder: 'trader/prices.json' }),
          p('portfolio', 'Portfolio path', 'value', '--portfolio'),
          p('today', 'Pretend today is', 'value', '--today', { placeholder: 'YYYY-MM-DD' }),
          p('now', 'Pretend now is', 'value', '--now', { placeholder: '2026-10-19 10:15' }),
          p('no_write', 'Do not save verdict', 'const', '--no-write'),
        ],
      },
    ],
  },
  {
    id: 'broker',
    dir: 'trader-broker',
    script: 'ticket.py',
    name: 'Order Executor',
    tag: 'BROKER',
    phase: 'Execute',
    accent: '#ff9f43',
    blurb: 'Renders plain-language order tickets and records your yes. It never talks to a broker by itself.',
    outputs: ['trader/state/broker.json', 'trader/portfolio.json'],
    actions: [
      {
        id: 'show', label: 'Show tickets', json: true,
        desc: 'Display proposed orders and the exact place_stock_order JSON.',
        params: [
          p('orders', 'Orders path', 'value', '--orders', { placeholder: 'trader/orders.json' }),
          p('index', 'Order number', 'number', '--index', { placeholder: '1' }),
        ],
      },
      {
        id: 'approve', label: 'Record my yes', json: false,
        desc: 'Records your exact reply. Requires typing CONFIRM in this UI as well.',
        danger: true,
        params: [
          p('index', 'Order number', 'number', '--index', { required: true, default: 1 }),
          p('reply', 'Your exact reply', 'value', '--reply', { required: true, default: 'yes' }),
        ],
      },
      {
        id: 'decline', label: 'Decline', json: false,
        desc: 'Record a no for an order.',
        params: [
          p('index', 'Order number', 'number', '--index', { required: true, default: 1 }),
          p('reply', 'Your reply', 'value', '--reply', { default: 'no' }),
        ],
      },
      {
        id: 'result', label: 'Record broker result', json: false,
        desc: 'Log placed / denied / failed from your broker.',
        params: [
          p('index', 'Order number', 'number', '--index', { required: true, default: 1 }),
          p('status', 'Status', 'select', '--status', { default: 'placed', options: ['placed', 'denied', 'failed'] }),
          p('broker_id', 'Broker order id', 'value', '--broker-id'),
          p('filled_qty', 'Filled quantity', 'number', '--filled-qty'),
          p('filled_price', 'Filled price', 'number', '--filled-price'),
          p('note', 'Note', 'value', '--note'),
        ],
      },
      {
        id: 'flatten', label: 'Build flatten ticket', json: false,
        desc: 'Replace orders.json with a market sell to be flat by your flat-by time.',
        danger: true,
        params: [
          p('symbol', 'Symbol', 'value', '--symbol', { required: true, placeholder: 'TSLA' }),
          p('qty', 'Quantity', 'number', '--qty'),
        ],
      },
      {
        id: 'log', label: 'Order log', json: false,
        desc: 'Show today’s recorded broker actions.',
        params: [p('all', 'Show all days', 'const', '--all')],
      },
    ],
  },
  {
    id: 'alerts',
    dir: 'trader-alerts',
    script: 'alerts.py',
    name: 'Price Alerts',
    tag: 'ALERT',
    phase: 'Monitor',
    accent: '#4de2ff',
    blurb: 'Rings on your stop, target, flat-by time, percent moves and the opening bell. Fetches delayed quotes.',
    outputs: ['trader/alerts.json', 'trader/prices.json', 'trader/state/alerts.json'],
    actions: [
      {
        id: 'clock', label: 'NYSE clock', json: true,
        desc: 'Is the market open? When does it open next?',
        params: [p('now', 'Pretend now is', 'value', '--now', { placeholder: '2026-10-19 10:15' })],
      },
      {
        id: 'quote', label: 'Fetch quotes', json: true,
        desc: 'Fetch delayed quotes and write trader/prices.json.',
        params: [
          p('symbols', 'Symbols (space separated)', 'list-pos', '', { placeholder: 'TSLA NVDA' }),
          p('holdings', 'Include portfolio holdings', 'const', '--holdings'),
          p('plan', 'Include plan symbol', 'const', '--plan'),
          p('source', 'Quote source', 'select', '--source', { default: 'yahoo', options: ['yahoo', 'stooq'] }),
          p('write', 'Write prices.json', 'const', '--write'),
        ],
      },
      {
        id: 'check', label: 'Check alerts', json: true,
        desc: 'Ring anything that hit and refresh prices.',
        params: [
          p('rules', 'Rules path', 'value', '--rules', { placeholder: 'trader/alerts.json' }),
          p('state', 'State path', 'value', '--state'),
          p('source', 'Quote source', 'select', '--source', { default: 'yahoo', options: ['yahoo', 'stooq'] }),
          p('no_write', 'Do not write prices', 'const', '--no-write'),
        ],
      },
      {
        id: 'add', label: 'Add an alert', json: false,
        desc: 'Add a rule, or turn a trade plan into stop + target + flat-by in one go.',
        custom: 'alert-add',
        params: [
          p('symbol', 'Symbol', 'value', '--symbol', { placeholder: 'TSLA' }),
          p('type', 'Alert type', 'select', '', {
            default: 'from-plan',
            options: ['from-plan', 'above', 'below', 'stop', 'target', 'pct', 'opening-bell', 'at'],
          }),
          p('value', 'Price / percent', 'number', '', { placeholder: '358.32' }),
          p('at', 'Time (HH:MM)', 'value', '--at', { placeholder: '15:55' }),
          p('plan', 'Plan path', 'value', '--plan', { placeholder: 'trader/plan.json' }),
          p('rules', 'Rules path', 'value', '--rules', { placeholder: 'trader/alerts.json' }),
          p('label', 'Label', 'value', '--label', { placeholder: 'flat by close' }),
          p('before_close', 'Only before the close', 'const', '--before-close'),
          p('date', 'Date (YYYY-MM-DD)', 'value', '--date'),
          p('direction', 'Pct direction', 'select', '--direction', { options: ['up', 'down'] }),
          p('rearm', 'Re-arm after ringing', 'const', '--rearm'),
          p('note', 'Note', 'value', '--note'),
          p('id', 'Rule id', 'value', '--id'),
        ],
      },
      {
        id: 'list', label: 'List alerts', json: false,
        desc: 'Show every rule and whether it rang today.',
        params: [p('rules', 'Rules path', 'value', '--rules'), p('state', 'State path', 'value', '--state')],
      },
      {
        id: 'reset', label: 'Re-arm alert', json: false,
        desc: 'Clear the rung flag on one rule.',
        params: [
          p('id', 'Rule id', 'pos', '', { required: true, placeholder: 'tsla-plan-stop' }),
          p('state', 'State path', 'value', '--state'),
        ],
      },
    ],
  },
];

export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
export const CONFIG_DEFAULTS = DEFAULTS;

// Several scripts use exit code 1 for "nothing to report" rather than an error:
// a closed market, no new headlines, no hits, a trade plan refusal, a risk BLOCK.
const OK_CODE_ONE = {
  scanner: ['universe', 'daily', 'orb'],
  news: ['check'],
  entry: ['check', 'watchlist'],
  analyst: ['report'],
  pelosi: ['index', 'new', 'fetch', 'parse'],
  alerts: ['clock', 'quote', 'check'],
  timemachine: ['run'],
  budget: ['size'],
  risk: ['check'],
  broker: ['show'],
};
for (const skill of SKILLS) {
  for (const action of skill.actions) {
    action.okCodes = OK_CODE_ONE[skill.id]?.includes(action.id) ? [0, 1] : [0];
  }
}

const isEmpty = (v) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

function buildGeneric(params, values) {
  const out = [];
  for (const param of params) {
    const v = values[param.key];
    if (isEmpty(v)) continue;
    switch (param.type) {
      case 'pos':
        out.push(String(v));
        break;
      case 'const':
        if (v === true || v === 'true' || v === 1) out.push(param.flag);
        break;
      case 'optconst':
        out.push(param.flag);
        if (String(v) !== 'plan') out.push(String(v));
        break;
      case 'list-pos':
        if (param.flag) out.push(param.flag);
        const items = Array.isArray(v) ? v : String(v).split(/[\s,]+/).filter(Boolean);
        out.push(...items.map(String));
        break;
      case 'repeat':
        for (const item of Array.isArray(v) ? v : String(v).split(/[\s,]+/).filter(Boolean)) {
          out.push(param.flag, String(item));
        }
        break;
      default:
        if (param.flag) out.push(param.flag, String(v));
    }
  }
  return out;
}

function buildAlertAdd(params, values) {
  const out = ['add'];
  const copy = { ...values };
  const type = copy.type || 'from-plan';
  delete copy.type;
  const simple = ['symbol', 'at', 'plan', 'rules', 'label', 'before_close', 'date', 'direction', 'rearm', 'note', 'id'];
  out.push(...buildGeneric(params.filter((p) => simple.includes(p.key)), copy));
  const flagFor = {
    above: '--above', below: '--below', stop: '--stop', target: '--target', pct: '--pct',
    'opening-bell': '--opening-bell', 'from-plan': '--from-plan',
  };
  if (type === 'at') {
    // --at is already added from the generic pass.
  } else if (flagFor[type]) {
    out.push(flagFor[type]);
    if (['above', 'below', 'stop', 'target', 'pct'].includes(type) && !isEmpty(copy.value)) {
      out.push(String(copy.value));
    }
  }
  return out;
}

export function buildArgv(skill, actionId, values = {}) {
  const action = skill.actions.find((a) => a.id === actionId);
  if (!action) throw new Error(`Unknown action ${actionId} for ${skill.id}`);
  if (action.custom === 'alert-add') return buildAlertAdd(action.params, values);
  const sub = action.sub === false ? [] : [actionId];
  return [...sub, ...buildGeneric(action.params, values)];
}

export function defaultsFor(skillId, actionId) {
  const skill = SKILL_BY_ID[skillId];
  const action = skill?.actions.find((a) => a.id === actionId);
  if (!action) return {};
  return Object.fromEntries(action.params.map((p) => [p.key, p.default ?? '']));
}
