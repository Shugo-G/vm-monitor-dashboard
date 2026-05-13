// chart.jsx — interactive multi-series line chart with crosshair tooltip

function LineChart({ data, width = 800, height = 260, series, rangeHours = 24 }) {
  const [hover, setHover] = React.useState(null);
  const svgRef = React.useRef(null);

  const PAD = { top: 18, right: 16, bottom: 32, left: 38 };
  const W = width, H = height;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const N = data.length;
  // data covers 24h at 5min. Slice to last rangeHours
  const pointsToUse = Math.min(N, Math.round((rangeHours * 60) / 5));
  const d = data.slice(N - pointsToUse);
  const M = d.length;

  const xAt = (i) => PAD.left + (i / (M - 1)) * innerW;
  const yAt = (v) => PAD.top + innerH - (Math.max(0, Math.min(100, v)) / 100) * innerH;

  // gridlines y
  const yTicks = [0, 25, 50, 75, 100];

  // x labels — 6 evenly spaced
  const nowMs = Date.now();
  const stepMin = 5;
  const xLabels = [];
  const labelCount = 7;
  for (let i = 0; i < labelCount; i++) {
    const idx = Math.round((i / (labelCount - 1)) * (M - 1));
    const tMs = nowMs - (M - 1 - idx) * stepMin * 60 * 1000;
    const dt = new Date(tMs);
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');
    xLabels.push({ x: xAt(idx), label: `${hh}:${mm}` });
  }

  const buildPath = (key) => {
    return d.map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(2)},${yAt(p[key]).toFixed(2)}`).join(' ');
  };

  const buildArea = (key) => {
    const top = d.map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(2)},${yAt(p[key]).toFixed(2)}`).join(' ');
    return `${top} L${xAt(M-1).toFixed(2)},${yAt(0).toFixed(2)} L${xAt(0).toFixed(2)},${yAt(0).toFixed(2)} Z`;
  };

  const handleMove = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    if (x < PAD.left || x > W - PAD.right) { setHover(null); return; }
    const ratio = (x - PAD.left) / innerW;
    const idx = Math.round(ratio * (M - 1));
    if (idx >= 0 && idx < M) setHover(idx);
  };

  const point = hover != null ? d[hover] : null;
  const hoverX = hover != null ? xAt(hover) : null;
  const hoverTime = hover != null
    ? (() => {
        const tMs = nowMs - (M - 1 - hover) * stepMin * 60 * 1000;
        const dt = new Date(tMs);
        return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
      })()
    : null;

  return (
    <div className="chart-wrap">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="chart-svg"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          {series.map(s => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.25"/>
              <stop offset="100%" stopColor={s.color} stopOpacity="0"/>
            </linearGradient>
          ))}
        </defs>

        {/* y gridlines */}
        {yTicks.map(v => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={yAt(v)} y2={yAt(v)}
                  stroke="rgba(255,255,255,0.05)" strokeDasharray={v === 0 ? '' : '2 3'} />
            <text x={PAD.left - 8} y={yAt(v) + 3} fill="var(--text-3)" fontSize="10"
                  textAnchor="end" fontFamily="var(--mono)">{v}</text>
          </g>
        ))}

        {/* axis baseline */}
        <line x1={PAD.left} x2={W - PAD.right} y1={yAt(0)} y2={yAt(0)} stroke="rgba(255,255,255,0.12)"/>

        {/* x labels */}
        {xLabels.map((l, i) => (
          <text key={i} x={l.x} y={H - 10} fill="var(--text-3)" fontSize="10"
                textAnchor="middle" fontFamily="var(--mono)">{l.label}</text>
        ))}

        {/* areas */}
        {series.map(s => s.visible && (
          <path key={`a-${s.key}`} d={buildArea(s.key)} fill={`url(#grad-${s.key})`} />
        ))}

        {/* lines */}
        {series.map(s => s.visible && (
          <path key={`l-${s.key}`} d={buildPath(s.key)}
                fill="none" stroke={s.color} strokeWidth="1.6"
                strokeLinejoin="round" strokeLinecap="round"
                vectorEffect="non-scaling-stroke"/>
        ))}

        {/* crosshair */}
        {hoverX != null && (
          <g>
            <line x1={hoverX} x2={hoverX} y1={PAD.top} y2={H - PAD.bottom}
                  stroke="rgba(255,255,255,0.2)" strokeDasharray="2 3"/>
            {series.map(s => s.visible && (
              <circle key={`p-${s.key}`} cx={hoverX} cy={yAt(point[s.key])} r="3"
                      fill={s.color} stroke="#000" strokeWidth="1.5"/>
            ))}
          </g>
        )}
      </svg>

      {hoverX != null && point && (
        <div className="chart-tooltip" style={{
          left: `${(hoverX / W) * 100}%`,
          transform: hoverX > W * 0.7 ? 'translate(-100%, 0)' : 'translate(8px, 0)',
        }}>
          <div className="chart-tooltip-time mono">{hoverTime}</div>
          {series.map(s => s.visible && (
            <div key={s.key} className="chart-tooltip-row">
              <span className="chart-tooltip-dot" style={{ background: s.color }}/>
              <span className="chart-tooltip-label mono">{s.label}</span>
              <span className="chart-tooltip-val mono">{point[s.key].toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { LineChart });
