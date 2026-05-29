// filters.jsx — filter modal + alerts panel

function FilterModal({ vms, savedFilters, activeFilter, onClose, onApply, onSave, onDelete }) {
  const [name, setName] = React.useState('');
  const [selected, setSelected] = React.useState(new Set());

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const toggle = (vm) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(vm.name)) next.delete(vm.name); else next.add(vm.name);
      return next;
    });
  };

  const canSave = name.trim().length > 0 && selected.size > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-filters" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 className="modal-title mono">Gestionar filtros</h2>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="filter-section">
            <h3 className="subhead mono">Nuevo filtro</h3>
            <input
              className="input"
              placeholder="Nombre del filtro…"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="vm-grid-chk">
              {vms.map(vm => (
                <label key={vm.name} className={`chk-row ${selected.has(vm.name) ? 'on' : ''}`}>
                  <input type="checkbox" checked={selected.has(vm.name)} onChange={() => toggle(vm)}/>
                  <span className="chk-box">
                    {selected.has(vm.name) && (
                      <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 5l3 3 5-6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    )}
                  </span>
                  <span className="mono">{vm.name}</span>
                  <StatusDot sevLevel={vmSeverity(vm)} status={vm.status} pulse={false}/>
                </label>
              ))}
            </div>
            <div className="filter-actions">
              <button className="btn-primary" disabled={!canSave}
                      onClick={() => { onSave(name.trim(), Array.from(selected)); setName(''); setSelected(new Set()); }}>
                Guardar filtro
              </button>
              <button className="btn-ghost" onClick={() => onApply(null)}>
                Mostrar todas
              </button>
            </div>
          </div>

          <div className="filter-section">
            <h3 className="subhead mono">Filtros guardados</h3>
            {savedFilters.length === 0 ? (
              <div className="empty mono">No hay filtros guardados.</div>
            ) : (
              <div className="saved-list">
                {savedFilters.map(f => (
                  <div key={f.name} className={`saved-row ${activeFilter === f.name ? 'on' : ''}`}>
                    <div className="saved-row-name mono">{f.name}</div>
                    <div className="saved-row-count mono">{f.vms.length} VMs</div>
                    <button className="btn-ghost-sm" onClick={() => onApply(f.name)}>
                      {activeFilter === f.name ? 'Activo' : 'Aplicar'}
                    </button>
                    <button className="btn-danger-sm" onClick={() => onDelete(f.name)}>Borrar</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ======== Alerts panel ========
function AlertsPanel({ vms, onClose, onOpenVm }) {
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const alerts = [];
  vms.forEach(vm => {
    if (vm.status === 'offline') {
      alerts.push({ vm, level: 'crit', type: 'down', msg: 'VM sin respuesta', age: '12 min' });
    }
    if (vm.cpu > 50) {
      alerts.push({ vm, level: vm.cpu > 80 ? 'crit' : 'warn', type: 'cpu', msg: `CPU alto: ${vm.cpu.toFixed(1)}%`, age: 'ahora' });
    }
    if (vm.ram > 50) {
      alerts.push({ vm, level: vm.ram > 80 ? 'crit' : 'warn', type: 'ram', msg: `RAM alta: ${vm.ram.toFixed(1)}%`, age: 'ahora' });
    }
    if (vm.disk > 80) {
      alerts.push({ vm, level: 'crit', type: 'disk', msg: `Disco casi lleno: ${vm.disk.toFixed(1)}%`, age: '3h' });
    } else if (vm.disk > 50) {
      alerts.push({ vm, level: 'warn', type: 'disk', msg: `Disco alto: ${vm.disk.toFixed(1)}%`, age: '6h' });
    }
    if (vm.updates >= 10) {
      alerts.push({ vm, level: 'info', type: 'upd', msg: `${vm.updates} actualizaciones pendientes`, age: '1d' });
    }
  });

  const crit = alerts.filter(a => a.level === 'crit');
  const warn = alerts.filter(a => a.level === 'warn');
  const info = alerts.filter(a => a.level === 'info');

  return (
    <div className="alerts-overlay" onClick={onClose}>
      <div className="alerts-panel" onClick={(e) => e.stopPropagation()}>
        <div className="alerts-head">
          <h2 className="mono">Alertas activas</h2>
          <button className="btn-icon" onClick={onClose}>×</button>
        </div>
        <div className="alerts-summary">
          <span className="mono"><span className="dot-red"/> {crit.length} críticas</span>
          <span className="mono"><span className="dot-yellow"/> {warn.length} warnings</span>
          <span className="mono"><span className="dot-cyan"/> {info.length} info</span>
        </div>
        <div className="alerts-list">
          {alerts.length === 0 && <div className="empty mono">Todo en orden ✓</div>}
          {[...crit, ...warn, ...info].map((a, i) => (
            <button key={i} className={`alert-row alert-${a.level}`}
                    onClick={() => { onOpenVm(a.vm); onClose(); }}>
              <div className="alert-icon">
                {a.level === 'crit' ? '●' : a.level === 'warn' ? '▲' : 'ⓘ'}
              </div>
              <div className="alert-content">
                <div className="alert-title">
                  <span className="mono alert-vm">{a.vm.name}</span>
                  <span className="alert-msg">{a.msg}</span>
                </div>
                <div className="alert-meta mono">
                  <span>{a.vm.ip}</span>
                  <span>·</span>
                  <span>{a.age}</span>
                </div>
              </div>
              <div className="alert-chev">→</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { FilterModal, AlertsPanel });
