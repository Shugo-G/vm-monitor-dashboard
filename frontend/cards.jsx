// cards.jsx — VM cards in three modes: expanded, compact, mini + list row

const statusColor = (sevLevel, status) => {
  if (status === 'offline') return 'var(--red)';
  if (sevLevel === 'crit') return 'var(--red)';
  if (sevLevel === 'warn') return 'var(--yellow)';
  return 'var(--green)';
};

// Small sparkline for a metric (last N points)
function Sparkline({ data, color, height = 22, strokeWidth = 1.5 }) {
  if (!data || data.length === 0) return null;
  const N = data.length;
  const pts = data.map((v, i) => {
    const x = (i / (N - 1)) * 100;
    const y = height - (Math.max(0, Math.min(100, v)) / 100) * height;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
  const last = data[data.length - 1];
  const lastX = 100;
  const lastY = height - (Math.max(0, Math.min(100, last)) / 100) * height;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none"
         style={{ width: '100%', height, display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={strokeWidth}
                vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r={1.6} fill={color} />
    </svg>
  );
}

// Meter bar
function Meter({ label, value, total, unit, color, sevLevel, showPct = true }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="meter">
      <div className="meter-head">
        <span className="meter-label mono">{label}</span>
        <span className="meter-value mono">
          {showPct && <>{pct.toFixed(1)}<span className="pct-sym">%</span></>}
          {total != null && <span className="meter-total"> {typeof total === 'string' ? total : unit ? ` ${unit}` : ''}</span>}
        </span>
      </div>
      <div className="meter-bar">
        <div className="meter-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function sevHex(sevLevel, status) {
  if (status === 'offline' || sevLevel === 'crit') return 'var(--red)';
  if (sevLevel === 'warn') return 'var(--yellow)';
  return 'var(--green)';
}

// CPU gauge (circle)
function CpuGauge({ value, status }) {
  const pct = Math.max(0, Math.min(100, value));
  const r = 22;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  const sevLevel = sev(pct);
  const color = status === 'offline' ? 'var(--text-3)' : sevHex(sevLevel);
  return (
    <div className="cpu-gauge">
      <svg viewBox="0 0 60 60" width="60" height="60">
        <circle cx="30" cy="30" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4"/>
        <circle cx="30" cy="30" r={r} fill="none" stroke={color} strokeWidth="4"
                strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
                transform="rotate(-90 30 30)"
                style={{ transition: 'stroke-dasharray 600ms ease, stroke 300ms' }}/>
      </svg>
      <div className="cpu-gauge-text mono">
        <span className="cpu-gauge-num">{pct < 10 ? pct.toFixed(1) : Math.round(pct)}</span>
        <span className="cpu-gauge-pct">%</span>
      </div>
    </div>
  );
}

// Drag handle (6 dots)
function DragHandle() {
  return (
    <svg className="drag-handle" width="8" height="14" viewBox="0 0 8 14" fill="none">
      <circle cx="2" cy="2" r="1" fill="currentColor"/>
      <circle cx="6" cy="2" r="1" fill="currentColor"/>
      <circle cx="2" cy="7" r="1" fill="currentColor"/>
      <circle cx="6" cy="7" r="1" fill="currentColor"/>
      <circle cx="2" cy="12" r="1" fill="currentColor"/>
      <circle cx="6" cy="12" r="1" fill="currentColor"/>
    </svg>
  );
}

// Status dot
function StatusDot({ sevLevel, status, pulse = true }) {
  const color = sevHex(sevLevel, status);
  return (
    <span className={`status-dot ${pulse ? 'pulse' : ''}`} style={{ background: color, boxShadow: `0 0 8px ${color}` }}/>
  );
}

// Update badge
function UpdateBadge({ count, severity }) {
  if (!count) return null;
  const high = count >= 10;
  return (
    <span className={`upd-badge ${high ? 'upd-high' : ''} mono`}>
      <svg width="9" height="9" viewBox="0 0 9 9" style={{ marginRight: 3 }}>
        <path d="M4.5 1.5l3 3h-2v3h-2v-3h-2l3-3z" fill="currentColor"/>
      </svg>
      {count}
    </span>
  );
}

// ======== EXPANDED CARD ========
function VMCardExpanded({ vm, onOpen, dragHandleProps }) {
  const sevLevel = vmSeverity(vm);
  const isOffline = vm.status === 'offline';
  const cpuSev = sev(vm.cpu);
  const ramSev = sev(vm.ram);
  const diskSev = sev(vm.disk);

  return (
    <div className={`vm-card vm-card-expanded sev-${sevLevel} ${isOffline ? 'is-offline' : ''}`}
         onClick={(e) => { if (!e.target.closest('button,a,.no-open')) onOpen(vm); }}>
      <div className="vm-card-accent" />
      <div className="vm-card-head">
        <div className="vm-card-head-left">
          <span {...dragHandleProps} className="drag-grip" title="Arrastrar">
            <DragHandle/>
          </span>
          <h3 className="vm-name mono" title={vm.name}>{vm.displayName || vm.name}</h3>
          <span className="vm-ip-inline mono">{vm.ip}</span>
        </div>
        <div className="vm-card-head-right">
          <StatusDot sevLevel={sevLevel} status={vm.status} />
        </div>
      </div>

      <div className="vm-card-body">
        <div className="vm-metric-primary">
          <CpuGauge value={vm.cpu} status={vm.status} />
          <div className="vm-metric-primary-label mono">CPU</div>
        </div>
        <div className="vm-metrics-secondary">
          <Meter label="RAM" value={vm.ram} color={sevHex(ramSev)} sevLevel={ramSev} />
          <Meter label="DISK" value={vm.disk} color={sevHex(diskSev)} sevLevel={diskSev} />
        </div>
      </div>

      <div className="vm-card-foot">
        <div className="vm-card-foot-left">
          <span className={`vm-status mono ${isOffline ? 'is-offline' : ''}`}>
            {isOffline ? 'Offline' : 'Online'}
          </span>
        </div>
        <div className="vm-card-foot-right">
          {vm.updates > 0 ? (
            <UpdateBadge count={vm.updates} />
          ) : (
            <span className="upd-ok mono" title="Sin actualizaciones pendientes">
              <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 5l3 3 5-6" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </span>
          )}
          <button className="btn-primary-sm" onClick={(e) => { e.stopPropagation(); onOpen(vm); }}>
            Detalle
          </button>
        </div>
      </div>
    </div>
  );
}

// ======== COMPACT CARD ========
function VMCardCompact({ vm, onOpen, dragHandleProps }) {
  const sevLevel = vmSeverity(vm);
  const isOffline = vm.status === 'offline';
  const cpuSev = sev(vm.cpu);
  const ramSev = sev(vm.ram);
  const diskSev = sev(vm.disk);
  const spark = vm.history.slice(-36);

  return (
    <div className={`vm-card vm-card-compact sev-${sevLevel} ${isOffline ? 'is-offline' : ''}`}
         onClick={(e) => { if (!e.target.closest('button,a,.no-open')) onOpen(vm); }}>
      <div className="vm-card-accent" />
      <div className="vm-card-head">
        <div className="vm-card-head-left">
          <span {...dragHandleProps} className="drag-grip"><DragHandle/></span>
          <h3 className="vm-name mono" title={vm.name}>{vm.displayName || vm.name}</h3>
        </div>
        <div className="vm-card-head-right">
          <UpdateBadge count={vm.updates} />
          <StatusDot sevLevel={sevLevel} status={vm.status} />
        </div>
      </div>

      <div className="vm-compact-row">
        <MetricPill label="CPU"  value={vm.cpu}  sevLevel={cpuSev} />
        <MetricPill label="RAM"  value={vm.ram}  sevLevel={ramSev} />
        <MetricPill label="DISK" value={vm.disk} sevLevel={diskSev} />
      </div>
    </div>
  );
}

function MetricPill({ label, value, sevLevel }) {
  const color = sevHex(sevLevel);
  return (
    <div className="metric-pill">
      <div className="metric-pill-label mono">{label}</div>
      <div className="metric-pill-value mono" style={{ color }}>
        {value < 10 ? value.toFixed(1) : Math.round(value)}<span className="pct-sym">%</span>
      </div>
      <div className="metric-pill-bar">
        <div style={{ width: `${Math.max(2, value)}%`, background: color }}/>
      </div>
    </div>
  );
}

// ======== MINI CARD ========
function VMCardMini({ vm, onOpen, dragHandleProps }) {
  const sevLevel = vmSeverity(vm);
  const isOffline = vm.status === 'offline';
  return (
    <div className={`vm-card vm-card-mini sev-${sevLevel} ${isOffline ? 'is-offline' : ''}`}
         onClick={() => onOpen(vm)}>
      <div className="vm-card-accent" />
      <div className="vm-mini-inner">
        <span {...dragHandleProps} className="drag-grip"><DragHandle/></span>
        <StatusDot sevLevel={sevLevel} status={vm.status} />
        <h3 className="vm-name mono" title={vm.name}>{vm.displayName || vm.name}</h3>
        <UpdateBadge count={vm.updates} />
      </div>
    </div>
  );
}

// ======== LIST ROW ========
function VMListRow({ vm, onOpen }) {
  const sevLevel = vmSeverity(vm);
  const isOffline = vm.status === 'offline';
  const cpuSev = sev(vm.cpu);
  const ramSev = sev(vm.ram);
  const diskSev = sev(vm.disk);
  return (
    <div className={`vm-row sev-${sevLevel} ${isOffline ? 'is-offline' : ''}`} onClick={() => onOpen(vm)}>
      <div className="vm-row-status"><StatusDot sevLevel={sevLevel} status={vm.status}/></div>
      <div className="vm-row-name mono" title={vm.name}>{vm.displayName || vm.name}</div>
      <div className="vm-row-ip mono">{vm.ip}</div>
      <div className="vm-row-os">{vm.os}</div>
      <div className="vm-row-metric">
        <span className="mono" style={{ color: sevHex(cpuSev) }}>{vm.cpu.toFixed(1)}%</span>
        <div className="row-bar"><div style={{ width: `${vm.cpu}%`, background: sevHex(cpuSev) }}/></div>
      </div>
      <div className="vm-row-metric">
        <span className="mono" style={{ color: sevHex(ramSev) }}>{vm.ram.toFixed(1)}%</span>
        <div className="row-bar"><div style={{ width: `${vm.ram}%`, background: sevHex(ramSev) }}/></div>
      </div>
      <div className="vm-row-metric">
        <span className="mono" style={{ color: sevHex(diskSev) }}>{vm.disk.toFixed(1)}%</span>
        <div className="row-bar"><div style={{ width: `${vm.disk}%`, background: sevHex(diskSev) }}/></div>
      </div>
      <div className="vm-row-upd"><UpdateBadge count={vm.updates} /></div>
      <div className="vm-row-uptime mono">{vm.uptime != null ? fmtUptime(vm.uptime) : '—'}</div>
    </div>
  );
}

Object.assign(window, {
  VMCardExpanded, VMCardCompact, VMCardMini, VMListRow,
  Sparkline, StatusDot, UpdateBadge, CpuGauge, DragHandle, sevHex,
});
