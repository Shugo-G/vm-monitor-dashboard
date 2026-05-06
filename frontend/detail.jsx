// detail.jsx — VM detail drawer (Overview only)

function saveDisplayName(vmId, displayName) {
  return fetch(`/api/vms/${vmId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: displayName }),
  }).then(() => window.dispatchEvent(new CustomEvent('vm-data-changed')));
}

function DetailDrawer({ vm, onClose }) {
  const [range, setRange] = React.useState(24);
  const [series, setSeries] = React.useState({ cpu: true, ram: true, disk: true });
  const [editingName, setEditingName] = React.useState(false);
  const [aliasDraft, setAliasDraft] = React.useState('');
  const [editingDesc, setEditingDesc] = React.useState(false);
  const [descDraft, setDescDraft] = React.useState('');
  const [description, setDescription] = React.useState(vm.description || '');
  const [vmHistory, setVmHistory] = React.useState([]);

  React.useEffect(() => {
    if (!vm.id) return;
    fetch(`/api/vms/${vm.id}/stats/?hours=${range}`)
      .then(r => r.json())
      .then(data => setVmHistory(data.map((p, i) => ({
        t: i,
        cpu: p.cpu_usage,
        ram: p.ram_percent,
        disk: p.disk_percent,
      }))))
      .catch(() => setVmHistory([]));
  }, [vm.id, range]);

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !editingName) onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, editingName]);

  if (!vm) return null;

  const hostname = vm.name;
  const alias = vm.displayName || '';
  const displayName = alias || hostname;

  const startDescEdit = () => { setDescDraft(description); setEditingDesc(true); };
  const commitDescEdit = () => {
    const text = descDraft.trim();
    fetch(`/api/vms/${vm.id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: text }),
    }).then(() => setDescription(text));
    setEditingDesc(false);
  };
  const cancelDescEdit = () => { setEditingDesc(false); };

  const sevLevel = vmSeverity(vm);
  const isOffline = vm.status === 'offline';

  const chartSeries = [
    { key: 'cpu',  label: 'CPU',  color: 'var(--cyan)',     visible: series.cpu },
    { key: 'ram',  label: 'RAM',  color: 'var(--magenta)',  visible: series.ram },
    { key: 'disk', label: 'Disk', color: 'var(--yellow)',   visible: series.disk },
  ];

  const avg = (key) => {
    if (!vmHistory.length) return 0;
    return vmHistory.reduce((s, p) => s + p[key], 0) / vmHistory.length;
  };
  const max = (key) => {
    if (!vmHistory.length) return 0;
    return Math.max(...vmHistory.map(p => p[key]));
  };

  const startEdit = () => { setAliasDraft(alias); setEditingName(true); };
  const commitEdit = () => {
    const trimmed = aliasDraft.trim();
    saveDisplayName(vm.id, trimmed !== hostname ? trimmed : '');
    setEditingName(false);
  };
  const cancelEdit = () => { setEditingName(false); };
  const clearAlias = () => { saveDisplayName(vm.id, ''); setEditingName(false); };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-inner">

          <div className={`drawer-top sev-${sevLevel} ${isOffline ? 'is-offline' : ''}`}>
            <div className="drawer-top-left">
              <div className="drawer-status">
                <StatusDot sevLevel={sevLevel} status={vm.status}/>
                <span className={`mono ${isOffline ? 'txt-red' : 'txt-green'}`}>
                  {isOffline ? 'OFFLINE' : 'ONLINE'}
                </span>
              </div>
              {editingName ? (
                <div className="drawer-title-edit">
                  <input
                    autoFocus
                    className="drawer-title-input mono"
                    value={aliasDraft}
                    placeholder={hostname}
                    onChange={(e) => setAliasDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit();
                      if (e.key === 'Escape') { e.stopPropagation(); cancelEdit(); }
                    }}
                  />
                  <button className="btn-primary-sm" onClick={commitEdit}>Guardar</button>
                  <button className="btn-ghost-sm" onClick={cancelEdit}>Cancelar</button>
                  {alias && <button className="btn-danger-sm" onClick={clearAlias} title="Quitar alias">Quitar</button>}
                </div>
              ) : (
                <div className="drawer-title-row">
                  <h2 className="drawer-title mono">{displayName}</h2>
                  <button className="btn-icon edit-name-btn" onClick={startEdit} title="Editar nombre">
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                      <path d="M9 2l3 3-7 7H2v-3l7-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              )}
              <div className="drawer-meta">
                {alias && <span className="tag mono tag-cyan">host: {hostname}</span>}
                <span className="tag mono">{vm.ip}</span>
                <span className="tag mono tag-cyan">{vm.os}</span>
                {vm.ramGB > 0 && <span className="tag mono">{vm.ramGB} GB RAM</span>}
                {vm.cpuCores != null && <span className="tag mono">{vm.cpuCores} vCPU</span>}
                {vm.updates > 0 && (
                  <span className="tag mono tag-warn">⚠ {vm.updates} actualizaciones</span>
                )}
                {vm.uptime != null && <span className="tag mono tag-muted">Uptime {fmtUptime(vm.uptime)}</span>}
              </div>
            </div>
            <div className="drawer-top-right">
              <button className="btn-icon" onClick={onClose} aria-label="Cerrar">
                <svg width="16" height="16" viewBox="0 0 16 16"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5"/></svg>
              </button>
            </div>
          </div>

          <div className="drawer-kpis">
            <KpiBlock label="CPU ahora" value={`${vm.cpu.toFixed(1)}%`} color={sevHex(sev(vm.cpu))}
                      hint={`prom ${avg('cpu').toFixed(1)}% · max ${max('cpu').toFixed(0)}%`} />
            <KpiBlock label="RAM ahora" value={`${vm.ram.toFixed(1)}%`} color={sevHex(sev(vm.ram))}
                      hint={`${((vm.ram/100) * vm.ramGB).toFixed(1)} / ${vm.ramGB} GB`}
                      hint2={`prom ${avg('ram').toFixed(1)}%`}/>
            <KpiBlock label="Disk uso" value={`${vm.disk.toFixed(1)}%`} color={sevHex(sev(vm.disk))}
                      hint={`max 24h ${max('disk').toFixed(0)}%`}/>
            <KpiBlock label="Última señal" value={(() => {
                if (!vm.lastSeen) return isOffline ? '—' : 'ahora';
                const sec = Math.floor((Date.now() - vm.lastSeen.getTime()) / 1000);
                if (sec < 60) return `${sec}s`;
                if (sec < 3600) return `${Math.floor(sec / 60)} min`;
                return `${Math.floor(sec / 3600)}h`;
              })()} color="var(--text-1)"
                      hint={isOffline ? 'sin respuesta' : 'saludable'} />
          </div>

          <div className="drawer-body">
            <section className="drawer-section">
              <div className="section-head">
                <h3 className="section-title mono">Descripción</h3>
                {!editingDesc && (
                  <button className="btn-ghost-sm" onClick={startDescEdit}>
                    {description ? 'Editar' : 'Agregar'}
                  </button>
                )}
              </div>
              {editingDesc ? (
                <div className="desc-edit">
                  <textarea
                    autoFocus
                    className="desc-textarea mono"
                    placeholder="Notas, propósito de la VM, contactos, etc.…"
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { e.stopPropagation(); cancelDescEdit(); }
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commitDescEdit();
                    }}
                    rows={4}
                  />
                  <div className="desc-edit-actions">
                    <button className="btn-primary-sm" onClick={commitDescEdit}>Guardar</button>
                    <button className="btn-ghost-sm" onClick={cancelDescEdit}>Cancelar</button>
                    <span className="desc-hint mono txt-dim">⌘+Enter para guardar</span>
                  </div>
                </div>
              ) : (
                <div className={`desc-display ${description ? '' : 'is-empty'}`} onClick={startDescEdit}>
                  {description || 'Sin descripción. Hacé click para agregar una.'}
                </div>
              )}
            </section>
            <section className="drawer-section">
              <SectionHead title="Particiones" subtitle={`${vm.partitions.length} montadas`}/>
              <div className="part-grid">
                {vm.partitions.map(p => <PartitionBlock key={p.mount} part={p}/>)}
              </div>
            </section>
            <section className="drawer-section">
              <div className="chart-head">
                <SectionHead title="Historial" subtitle={`Últimas ${range}h`}/>
                <div className="chart-controls">
                  <div className="legend">
                    {chartSeries.map(s => (
                      <button key={s.key}
                        className={`legend-item ${s.visible ? 'on' : 'off'}`}
                        onClick={() => setSeries(p => ({ ...p, [s.key]: !p[s.key] }))}>
                        <span className="legend-dot" style={{ background: s.color }}/>
                        <span className="mono">{s.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="range-picker">
                    {[1, 6, 12, 24].map(h => (
                      <button key={h} className={`range-btn ${range === h ? 'on' : ''}`}
                              onClick={() => setRange(h)}>
                        {h}h
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="chart-container">
                <ResponsiveChart data={vmHistory} series={chartSeries} rangeHours={range}/>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHead({ title, subtitle }) {
  return (
    <div className="section-head">
      <h3 className="section-title mono">{title}</h3>
      {subtitle && <span className="section-subtitle mono">{subtitle}</span>}
    </div>
  );
}

function KpiBlock({ label, value, hint, hint2, color }) {
  return (
    <div className="kpi">
      <div className="kpi-label mono">{label}</div>
      <div className="kpi-value mono" style={{ color }}>{value}</div>
      {hint && <div className="kpi-hint mono">{hint}</div>}
      {hint2 && <div className="kpi-hint mono">{hint2}</div>}
    </div>
  );
}

function PartitionBlock({ part }) {
  const s = sev(part.usedPct);
  const color = sevHex(s);
  const used = ((part.usedPct / 100) * part.total);
  return (
    <div className="part-block">
      <div className="part-block-head">
        <span className="part-mount mono">{part.mount}</span>
        <span className="mono" style={{ color }}>{part.usedPct.toFixed(1)}%</span>
      </div>
      <div className="part-bar">
        <div style={{ width: `${part.usedPct}%`, background: color }}/>
      </div>
      <div className="part-block-foot mono">
        <span>{used.toFixed(0)}GB usado</span>
        <span className="txt-dim">de {fmtBytes(part.total)}</span>
      </div>
    </div>
  );
}

function ResponsiveChart({ data, series, rangeHours, tall }) {
  const ref = React.useRef(null);
  const [dims, setDims] = React.useState({ w: 800, h: tall ? 340 : 240 });
  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(es => {
      const cr = es[0].contentRect;
      setDims({ w: Math.max(400, cr.width), h: tall ? Math.max(300, cr.height) : 240 });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [tall]);
  return (
    <div ref={ref} style={{ width: '100%', height: tall ? 380 : 240, position: 'relative' }}>
      <LineChart data={data} width={dims.w} height={dims.h} series={series} rangeHours={rangeHours}/>
    </div>
  );
}

Object.assign(window, { DetailDrawer });
