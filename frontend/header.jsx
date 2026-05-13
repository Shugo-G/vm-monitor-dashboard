// header.jsx — single-row top bar

function Header({
  vms, filterName, onOpenFilters,
  viewMode, onViewMode,
  search, onSearch,
  onRefresh, refreshing,
  sortBy, onSortBy,
  onOpenAlerts, unreadAlerts,
}) {
  const total = vms.length;
  const up = vms.filter(v => v.status !== 'offline').length;
  const down = total - up;
  const crit = vms.filter(v => vmSeverity(v) === 'crit').length;
  const warn = vms.filter(v => vmSeverity(v) === 'warn').length;

  return (
    <header className="app-header">
      <div className="header-row single-row">
        <div className="brand">
          <div className="brand-mark">
            <svg viewBox="0 0 32 32" width="26" height="26">
              <path d="M16 2L4 8v10c0 7 5 11 12 12 7-1 12-5 12-12V8L16 2z"
                    fill="none" stroke="var(--cyan)" strokeWidth="1.8" strokeLinejoin="round"/>
              <circle cx="16" cy="15" r="3" fill="var(--cyan)"/>
              <path d="M16 18v5" stroke="var(--cyan)" strokeWidth="1.8"/>
            </svg>
          </div>
          <span className="brand-title">SHUGOVISION</span>
        </div>

        <div className="summary-inline">
          <SummaryKPI label="VMs" value={total} accent="var(--text-0)" />
          <SummaryKPI label="Online" value={up} accent="var(--green)" dot="green"/>
          <SummaryKPI label="Offline" value={down} accent={down > 0 ? 'var(--red)' : 'var(--text-3)'} dot={down > 0 ? 'red' : null}/>
          <SummaryKPI label="Crit" value={crit} accent={crit > 0 ? 'var(--red)' : 'var(--text-3)'} />
          <SummaryKPI label="Warn" value={warn} accent={warn > 0 ? 'var(--yellow)' : 'var(--text-3)'} />
        </div>

        <div className="header-search">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input type="text" placeholder="Buscar por nombre o IP…"
                 value={search} onChange={(e) => onSearch(e.target.value)}/>
          {search && <button className="search-clear" onClick={() => onSearch('')}>×</button>}
          <span className="search-hint mono">⌘K</span>
        </div>

        <button className="btn-alert btn-alert-inline" onClick={onOpenAlerts} title="Alertas">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1c-2.2 0-4 1.8-4 4v3l-1.5 2h11L11 8V5c0-2.2-1.8-4-4-4zM5.5 11.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round"/>
          </svg>
          {unreadAlerts > 0 && <span className="badge-count mono">{unreadAlerts}</span>}
        </button>

        <div className="header-right-group">
          <button className="btn-filter" onClick={onOpenFilters}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 2h10l-4 5v3l-2 1V7L1 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none"/>
            </svg>
            <span className="filter-active mono">{filterName}</span>
          </button>

          <div className="sort-control">
            <select value={sortBy} onChange={(e) => onSortBy(e.target.value)} title="Ordenar">
              <option value="manual">Manual</option>
              <option value="name">Nombre</option>
              <option value="cpu">CPU ↓</option>
              <option value="ram">RAM ↓</option>
              <option value="disk">Disk ↓</option>
              <option value="severity">Severidad</option>
              <option value="updates">Updates ↓</option>
            </select>
          </div>

          <div className="view-switch">
            <button className={viewMode === 'expanded' ? 'on' : ''} onClick={() => onViewMode('expanded')} title="Expandida">
              <svg width="14" height="14" viewBox="0 0 14 14"><rect x="2" y="2" width="10" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3"/><path d="M2 6h10M6 2v10" stroke="currentColor" strokeWidth="1.3"/></svg>
            </button>
            <button className={viewMode === 'compact' ? 'on' : ''} onClick={() => onViewMode('compact')} title="Compacta">
              <svg width="14" height="14" viewBox="0 0 14 14"><rect x="2" y="3" width="10" height="3" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1.3"/><rect x="2" y="8" width="10" height="3" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1.3"/></svg>
            </button>
            <button className={viewMode === 'list' ? 'on' : ''} onClick={() => onViewMode('list')} title="Lista">
              <svg width="14" height="14" viewBox="0 0 14 14"><path d="M2 3h10M2 7h10M2 11h10" stroke="currentColor" strokeWidth="1.3"/></svg>
            </button>
          </div>

          <button className={`btn-refresh ${refreshing ? 'is-refreshing' : ''}`} onClick={onRefresh} title="Actualizar">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M11 6.5a4.5 4.5 0 11-1.32-3.18L11 4.5V1.5M11 4.5H8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" fill="none"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

function SummaryKPI({ label, value, accent, dot }) {
  return (
    <div className="sk">
      {dot && <span className={`sk-dot sk-dot-${dot}`}/>}
      <div className="sk-content">
        <span className="sk-label mono">{label}</span>
        <span className="sk-value mono" style={{ color: accent }}>{value}</span>
      </div>
    </div>
  );
}

Object.assign(window, { Header });
