// data.jsx — helpers + API mapper

const sev = (v) => v >= 90 ? 'crit' : v >= 75 ? 'warn' : 'ok';

function vmSeverity(vm) {
  if (vm.status === 'offline') return 'crit';
  const s = [sev(vm.cpu), sev(vm.ram), sev(vm.disk)];
  if (s.includes('crit')) return 'crit';
  if (s.includes('warn')) return 'warn';
  return 'ok';
}

function fmtBytes(gb) {
  if (gb >= 1000) return (gb / 1024).toFixed(1) + 'TB';
  return gb.toFixed(0) + 'GB';
}

function fmtUptime(days) {
  if (days == null) return '—';
  if (days < 1) return '<1d';
  if (days < 30) return days + 'd';
  const m = Math.floor(days / 30);
  return m + 'mo ' + (days % 30) + 'd';
}

function mapApiVm(vm) {
  const s = vm.latest_status;
  return {
    id: vm.id,
    name: vm.hostname,
    displayName: vm.display_name || '',
    ip: vm.ip_address || '',
    os: vm.os_version || '',
    status: vm.is_stale ? 'offline' : 'online',
    cpu: s ? s.cpu_usage : 0,
    ram: s ? s.ram_percent : 0,
    disk: s ? s.disk_percent : 0,
    ramGB: s ? Math.round(s.ram_total / 1024 * 10) / 10 : 0,
    cpuCores: null,
    updates: s ? (s.update_count > 0 ? s.update_count : 0) : 0,
    uptime: null,
    history: [],
    partitions: s ? s.partitions.map(p => ({
      mount: p.mountpoint,
      total: Math.round(p.total_mb / 1024),
      usedPct: p.used_percent,
    })) : [],
    description: vm.description || '',
    lastSeen: vm.last_seen ? new Date(vm.last_seen) : null,
  };
}

Object.assign(window, { vmSeverity, sev, fmtBytes, fmtUptime, mapApiVm });
