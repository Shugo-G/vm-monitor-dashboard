// app.jsx — main dashboard

const LS_KEY = 'shugovision:v2';

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch { return {}; }
}
function saveState(patch) {
  try {
    const cur = loadState();
    localStorage.setItem(LS_KEY, JSON.stringify({ ...cur, ...patch }));
  } catch {}
}

function App() {
  const persisted = loadState();

  const [vms, setVms] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const [order, setOrder] = React.useState(persisted.order || []);
  const [hidden, setHidden] = React.useState(new Set(persisted.hidden || []));
  const [showHidden, setShowHidden] = React.useState(persisted.showHidden ?? false);
  const [viewMode, setViewMode] = React.useState(() => {
    const v = persisted.viewMode || 'expanded';
    return v === 'mini' ? 'compact' : v;
  });
  const [sortBy, setSortBy] = React.useState(persisted.sortBy || 'manual');
  const [search, setSearch] = React.useState('');
  const [activeFilter, setActiveFilter] = React.useState(persisted.activeFilter || null);
  const [savedFilters, setSavedFilters] = React.useState(persisted.savedFilters || []);

  const [detailVm, setDetailVm] = React.useState(null);
  const [showFilters, setShowFilters] = React.useState(false);
  const [showAlerts, setShowAlerts] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [density, setDensity] = React.useState(persisted.density || 'comfy');
  const [palette, setPalette] = React.useState(persisted.palette || 'neon');
  const [tweaksOn, setTweaksOn] = React.useState(false);

  // Fetch VMs from API
  const fetchVms = React.useCallback(() => {
    return fetch('/api/vms/')
      .then(r => r.json())
      .then(data => {
        const mapped = data.map(mapApiVm);
        setVms(mapped);
        setOrder(prev => {
          const names = mapped.map(v => v.name);
          const kept = prev.filter(n => names.includes(n));
          const added = names.filter(n => !prev.includes(n));
          return [...kept, ...added];
        });
      })
      .catch(err => console.error('Error fetching VMs:', err))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    fetchVms();
    const id = setInterval(fetchVms, 30000);
    return () => clearInterval(id);
  }, [fetchVms]);

  // Refetch inmediato cuando el usuario edita nombre o descripción
  React.useEffect(() => {
    window.addEventListener('vm-data-changed', fetchVms);
    return () => window.removeEventListener('vm-data-changed', fetchVms);
  }, [fetchVms]);

  // Keep detail vm synced with latest data
  React.useEffect(() => {
    if (detailVm) {
      const fresh = vms.find(v => v.name === detailVm.name);
      if (fresh) setDetailVm(fresh);
    }
  }, [vms]);

  // Persist
  React.useEffect(() => {
    saveState({ order, hidden: Array.from(hidden), showHidden, viewMode, sortBy, activeFilter, savedFilters, density, palette });
  }, [order, hidden, showHidden, viewMode, sortBy, activeFilter, savedFilters, density, palette]);

  // Keyboard: ⌘K / Ctrl+K = focus search
  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const el = document.querySelector('.header-search input');
        if (el) el.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Tweaks bridge
  React.useEffect(() => {
    const onMsg = (e) => {
      if (!e.data) return;
      if (e.data.type === '__activate_edit_mode') setTweaksOn(true);
      if (e.data.type === '__deactivate_edit_mode') setTweaksOn(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  // Palette
  React.useEffect(() => {
    document.body.dataset.palette = palette;
    document.body.dataset.density = density;
  }, [palette, density]);

  // Derived list
  const filteredVms = React.useMemo(() => {
    let list = vms;
    if (activeFilter) {
      const f = savedFilters.find(f => f.name === activeFilter);
      if (f) list = list.filter(v => f.vms.includes(v.name));
    }
    if (!showHidden) list = list.filter(v => !hidden.has(v.name));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(v => {
        const dn = (v.displayName || '').toLowerCase();
        return v.name.toLowerCase().includes(q) || v.ip.includes(q) || v.os.toLowerCase().includes(q) || dn.includes(q);
      });
    }
    if (sortBy === 'manual') {
      const idx = new Map(order.map((n, i) => [n, i]));
      list = [...list].sort((a, b) => (idx.get(a.name) ?? 999) - (idx.get(b.name) ?? 999));
    } else if (sortBy === 'name') {
      const dn = (v) => (v.displayName || v.name).toLowerCase();
      list = [...list].sort((a, b) => dn(a).localeCompare(dn(b)));
    } else if (sortBy === 'severity') {
      const rank = { crit: 0, warn: 1, ok: 2 };
      list = [...list].sort((a, b) => rank[vmSeverity(a)] - rank[vmSeverity(b)]);
    } else {
      list = [...list].sort((a, b) => b[sortBy] - a[sortBy]);
    }
    return list;
  }, [vms, order, hidden, showHidden, search, sortBy, activeFilter, savedFilters]);

  const visibleCount = filteredVms.length;

  // Drag & drop manual ordering
  const [dragName, setDragName] = React.useState(null);
  const [overName, setOverName] = React.useState(null);

  const handleDragStart = (name) => (e) => {
    setDragName(name);
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', name); } catch {}
  };
  const handleDragOver = (name) => (e) => {
    e.preventDefault();
    if (name !== dragName) setOverName(name);
  };
  const handleDrop = (name) => (e) => {
    e.preventDefault();
    if (!dragName || dragName === name) { setDragName(null); setOverName(null); return; }
    setOrder(prev => {
      const next = prev.filter(n => n !== dragName);
      const idx = next.indexOf(name);
      next.splice(idx, 0, dragName);
      return next;
    });
    setSortBy('manual');
    setDragName(null);
    setOverName(null);
  };
  const handleDragEnd = () => { setDragName(null); setOverName(null); };

  const onRefresh = () => {
    setRefreshing(true);
    fetchVms().finally(() => setTimeout(() => setRefreshing(false), 400));
  };

  const toggleHidden = (vm) => {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(vm.name)) next.delete(vm.name); else next.add(vm.name);
      return next;
    });
  };

  const filterName = activeFilter || 'Todas';
  const unreadAlerts = vms.filter(v => v.status === 'offline' || vmSeverity(v) !== 'ok').length;

  return (
    <div className="app">
      <Header
        vms={vms}
        visibleVms={filteredVms}
        filterName={filterName}
        onOpenFilters={() => setShowFilters(true)}
        viewMode={viewMode}
        onViewMode={setViewMode}
        search={search}
        onSearch={setSearch}
        onRefresh={onRefresh}
        refreshing={refreshing}
        sortBy={sortBy}
        onSortBy={setSortBy}
        showHidden={showHidden}
        onToggleHidden={setShowHidden}
        onOpenAlerts={() => setShowAlerts(true)}
        unreadAlerts={unreadAlerts}
      />

      <main className="app-main">
        {loading && vms.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon mono" style={{ fontSize: 28, animation: 'spin 1s linear infinite' }}>⟳</div>
            <h3 className="mono">Conectando…</h3>
            <p>Cargando datos del servidor.</p>
          </div>
        )}

        {!loading && visibleCount === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">∅</div>
            <h3 className="mono">{vms.length === 0 ? 'Sin VMs registradas' : 'Sin resultados'}</h3>
            <p>{vms.length === 0
              ? 'Ejecutá el reporter en alguna máquina para empezar.'
              : 'Ajustá los filtros o el término de búsqueda.'}</p>
            {(search || activeFilter) && (
              <button className="btn-ghost" onClick={() => { setSearch(''); setActiveFilter(null); }}>
                Limpiar
              </button>
            )}
          </div>
        )}

        {viewMode === 'list' ? (
          <ListView vms={filteredVms} onOpen={setDetailVm}/>
        ) : (
          <div className={`vm-grid vm-grid-${viewMode}`}>
            {filteredVms.map(vm => {
              const Card = viewMode === 'expanded' ? VMCardExpanded
                         : viewMode === 'compact'  ? VMCardCompact
                         : VMCardMini;
              return (
                <div
                  key={vm.name}
                  className={`vm-slot ${dragName === vm.name ? 'dragging' : ''} ${overName === vm.name ? 'drag-over' : ''}`}
                  draggable
                  onDragStart={handleDragStart(vm.name)}
                  onDragOver={handleDragOver(vm.name)}
                  onDrop={handleDrop(vm.name)}
                  onDragEnd={handleDragEnd}
                >
                  <Card vm={vm} onOpen={setDetailVm} dragHandleProps={{}} />
                </div>
              );
            })}
          </div>
        )}
      </main>

      {detailVm && <DetailDrawer vm={detailVm} onClose={() => setDetailVm(null)}/>}
      {showFilters && (
        <FilterModal
          vms={vms}
          savedFilters={savedFilters}
          activeFilter={activeFilter}
          onClose={() => setShowFilters(false)}
          onApply={(name) => { setActiveFilter(name); setShowFilters(false); }}
          onSave={(name, vmNames) => setSavedFilters(prev => [...prev.filter(f => f.name !== name), { name, vms: vmNames }])}
          onDelete={(name) => {
            setSavedFilters(prev => prev.filter(f => f.name !== name));
            if (activeFilter === name) setActiveFilter(null);
          }}
        />
      )}
      {showAlerts && (
        <AlertsPanel vms={vms} onClose={() => setShowAlerts(false)} onOpenVm={setDetailVm}/>
      )}

      {tweaksOn && (
        <TweaksPanel
          density={density} setDensity={setDensity}
          palette={palette} setPalette={setPalette}
          viewMode={viewMode} setViewMode={setViewMode}
        />
      )}
    </div>
  );
}

function ListView({ vms, onOpen }) {
  return (
    <div className="list-view">
      <div className="list-head mono">
        <div>●</div>
        <div>Nombre</div>
        <div>IP</div>
        <div>OS</div>
        <div>CPU</div>
        <div>RAM</div>
        <div>Disk</div>
        <div>Upd</div>
        <div>Uptime</div>
      </div>
      <div className="list-body">
        {vms.map(vm => <VMListRow key={vm.name} vm={vm} onOpen={onOpen}/>)}
      </div>
    </div>
  );
}

function TweaksPanel({ density, setDensity, palette, setPalette, viewMode, setViewMode }) {
  return (
    <div className="tweaks-panel">
      <div className="tweaks-head mono">Tweaks</div>
      <div className="tweak-group">
        <label className="mono">Densidad</label>
        <div className="seg">
          {['compact', 'comfy', 'spacious'].map(d => (
            <button key={d} className={density === d ? 'on' : ''} onClick={() => setDensity(d)}>{d}</button>
          ))}
        </div>
      </div>
      <div className="tweak-group">
        <label className="mono">Paleta</label>
        <div className="seg">
          {['neon', 'calm', 'contrast'].map(p => (
            <button key={p} className={palette === p ? 'on' : ''} onClick={() => setPalette(p)}>{p}</button>
          ))}
        </div>
      </div>
      <div className="tweak-group">
        <label className="mono">Vista</label>
        <div className="seg">
          {['expanded', 'compact', 'mini', 'list'].map(v => (
            <button key={v} className={viewMode === v ? 'on' : ''} onClick={() => setViewMode(v)}>{v}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { App });
