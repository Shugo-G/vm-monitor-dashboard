<script>
    import { createEventDispatcher } from "svelte";
    export let vm;
    export let now = new Date();
    export let isExpanded = true;
    export let isLocallyVisible = true;

    const dispatch = createEventDispatcher();

    $: status = vm.latest_status || {};

    $: timeSinceLastSeen =
        (now.getTime() - new Date(vm.last_seen).getTime()) / 1000 / 60;
    $: isStale = timeSinceLastSeen > 3;

    function getStatusLevel(val) {
        if (val > 80) return "danger";
        if (val > 50) return "warning";
        return "success";
    }

    $: worstLevel = (() => {
        if (isStale) return "danger";
        const cpu = getStatusLevel(status.cpu_usage || 0);
        const ram = getStatusLevel(status.ram_percent || 0);
        const disk = getStatusLevel(status.disk_percent || 0);
        if (cpu === "danger" || ram === "danger" || disk === "danger") return "danger";
        if (cpu === "warning" || ram === "warning" || disk === "warning") return "warning";
        return "success";
    })();

    $: dotColor =
        worstLevel === "danger"
            ? "var(--danger)"
            : worstLevel === "warning"
              ? "var(--warning)"
              : "var(--success)";

    function getColor(val) {
        if (isStale) return "var(--danger)";
        const level = getStatusLevel(val);
        return level === "danger"
            ? "var(--danger)"
            : level === "warning"
              ? "var(--warning)"
              : "var(--success)";
    }

    $: cpuColor = getColor(status.cpu_usage || 0);
    $: ramColor = getColor(status.ram_percent || 0);
    $: diskColor = getColor(status.disk_percent || 0);

    // SVG gauge constants (270° arc, starts at 7 o'clock)
    const R = 36;
    const CIRCUMFERENCE = 2 * Math.PI * R; // ≈ 226.19
    const ARC_LENGTH = (270 / 360) * CIRCUMFERENCE; // ≈ 169.65
    const GAP = CIRCUMFERENCE - ARC_LENGTH; // ≈ 56.55

    function gaugeStroke(percent) {
        const fill = (Math.min(Math.max(percent, 0), 100) / 100) * ARC_LENGTH;
        return `${fill} ${CIRCUMFERENCE - fill}`;
    }

    function formatGB(mb) {
        const gb = mb / 1024;
        return gb >= 1 ? `${gb.toFixed(0)}GB` : `${mb.toFixed(0)}MB`;
    }

    $: ramGB = status.ram_total ? formatGB(status.ram_total) : "?";
    $: diskGB = status.disk_total ? formatGB(status.disk_total) : "?";

    function handleToggle() {
        dispatch("visibilityToggle", vm.id);
    }

    function toggleExpand() {
        isExpanded = !isExpanded;
    }
</script>

<div
    class="vm-card"
    class:hidden={!isLocallyVisible}
    class:collapsed={!isExpanded}
    draggable="true"
    role="listitem"
    tabIndex="-1"
    on:dragstart
    on:dragover|preventDefault
    on:drop
>
    <!-- Header -->
    <div class="card-header">
        <div class="header-left">
            <div class="drag-handle" title="Arrastrar">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                    <path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
            </div>
            <span class="hostname">{vm.hostname}</span>
        </div>
        <div class="header-right">
            <span
                class="status-dot"
                style="background:{dotColor}; box-shadow: 0 0 8px {dotColor};"
            ></span>
            <button class="icon-btn" on:click={toggleExpand} title={isExpanded ? "Contraer" : "Expandir"}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    {#if isExpanded}
                        <path d="M19 13H5v-2h14v2z"/>
                    {:else}
                        <path d="M19 13H13v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    {/if}
                </svg>
            </button>
            <button class="icon-btn" on:click={handleToggle} title={isLocallyVisible ? "Ocultar" : "Mostrar"}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    {#if isLocallyVisible}
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    {:else}
                        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.82l2.92 2.92C21.1 15.39 22.4 13.81 23 12c-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.19 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.83l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.34-4.34l2.11 2.11C14.15 7.6 14.33 8.24 14.33 8.92c0 1.28-.8 2.36-1.92 2.78l-2.11-2.11c-.42-1.12-.66-2.2-.66-3.48 0-.68.18-1.32.42-1.87z"/>
                    {/if}
                </svg>
            </button>
        </div>
    </div>

    <!-- Collapsed view -->
    {#if !isExpanded}
        <div class="collapsed-row">
            <div class="mini-dots">
                <div class="mini-dot-wrap" title="CPU: {status.cpu_usage || 0}%">
                    <span class="mini-label">CPU</span>
                    <span class="mini-dot" style="background:{cpuColor}; box-shadow:0 0 5px {cpuColor};"></span>
                </div>
                <div class="mini-dot-wrap" title="RAM: {status.ram_percent || 0}%">
                    <span class="mini-label">RAM</span>
                    <span class="mini-dot" style="background:{ramColor}; box-shadow:0 0 5px {ramColor};"></span>
                </div>
                <div class="mini-dot-wrap" title="DISK: {status.disk_percent || 0}%">
                    <span class="mini-label">DSK</span>
                    <span class="mini-dot" style="background:{diskColor}; box-shadow:0 0 5px {diskColor};"></span>
                </div>
            </div>
            {#if status.update_count > 0}
                <span class="mini-badge warning">{status.update_count} upd</span>
            {:else if status.update_count === 0}
                <span class="mini-badge success">✓</span>
            {/if}
        </div>
    {/if}

    <!-- Expanded body -->
    {#if isExpanded}
        <div class="card-body">
            <!-- CPU Gauge -->
            <div class="gauge-wrap">
                <svg viewBox="0 0 100 100" class="gauge-svg">
                    <!-- Background arc -->
                    <circle
                        cx="50" cy="50" r={R}
                        fill="none"
                        stroke="rgba(255,255,255,0.07)"
                        stroke-width="7"
                        stroke-dasharray="{ARC_LENGTH} {GAP}"
                        stroke-linecap="round"
                        transform="rotate(135 50 50)"
                    />
                    <!-- Value arc -->
                    <circle
                        cx="50" cy="50" r={R}
                        fill="none"
                        stroke={cpuColor}
                        stroke-width="7"
                        stroke-dasharray={gaugeStroke(status.cpu_usage || 0)}
                        stroke-linecap="round"
                        transform="rotate(135 50 50)"
                        style="transition: stroke-dasharray 0.5s ease, stroke 0.3s ease;"
                    />
                    <!-- Percentage text -->
                    <text
                        x="50" y="46"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-size="18"
                        font-weight="700"
                        fill={cpuColor}
                        style="transition: fill 0.3s ease;"
                    >{(status.cpu_usage || 0).toFixed(1)}%</text>
                    <!-- Label -->
                    <text
                        x="50" y="62"
                        text-anchor="middle"
                        dominant-baseline="middle"
                        font-size="9"
                        fill="rgba(255,255,255,0.4)"
                        letter-spacing="2"
                    >CPU</text>
                </svg>
            </div>

            <!-- Resource bars -->
            <div class="bars-wrap">
                <!-- RAM -->
                <div class="bar-block">
                    <div class="bar-header">
                        <span class="bar-label">RAM</span>
                        <span class="bar-value" style="color:{ramColor}">
                            {(status.ram_percent || 0).toFixed(1)}%<span class="bar-total">/{ramGB}</span>
                        </span>
                    </div>
                    <div class="progress-track">
                        <div
                            class="progress-fill"
                            style="width:{status.ram_percent || 0}%; background:{ramColor}; box-shadow: 0 0 6px {ramColor}66;"
                        ></div>
                    </div>
                </div>

                <!-- DISK -->
                <div class="bar-block">
                    <div class="bar-header">
                        <span class="bar-label">DISK</span>
                        <span class="bar-value" style="color:{diskColor}">
                            {(status.disk_percent || 0).toFixed(1)}%<span class="bar-total">/{diskGB}</span>
                        </span>
                    </div>
                    <div class="progress-track">
                        <div
                            class="progress-fill"
                            style="width:{status.disk_percent || 0}%; background:{diskColor}; box-shadow: 0 0 6px {diskColor}66;"
                        ></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="card-footer">
            <div class="footer-left">
                {#if isStale}
                    <span class="uptime offline">Offline</span>
                {:else}
                    <span class="uptime online">Online</span>
                {/if}
                <span class="ip-text">{vm.ip_address || ""}</span>
            </div>
            <div class="footer-right">
                {#if status.update_count > 0}
                    <span class="update-badge warning" title="{status.update_count} actualizaciones pendientes">
                        ▲ {status.update_count}
                    </span>
                {:else if status.update_count === 0}
                    <span class="update-badge success" title="Sistema actualizado">✓</span>
                {/if}
                {#if vm.webmin_url}
                    <a href={vm.webmin_url} target="_blank" class="action-btn">Webmin</a>
                {/if}
                <button class="action-btn magenta" on:click={() => dispatch("viewDetail", vm)} title="Ver detalle e historial">
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                    </svg>
                    Detalles
                </button>
            </div>
        </div>
    {/if}
</div>

<style>
    .vm-card {
        background: rgba(14, 20, 30, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 10px;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
    }

    .vm-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(0, 242, 255, 0.3), transparent);
    }

    .vm-card.hidden {
        opacity: 0.4;
        filter: grayscale(0.8);
    }

    .vm-card.collapsed {
        padding-bottom: 0.75rem;
    }

    /* Header */
    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .header-left {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
    }

    .drag-handle {
        cursor: grab;
        color: rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: center;
        flex-shrink: 0;
    }

    .drag-handle:active {
        cursor: grabbing;
    }

    .hostname {
        font-size: 0.85rem;
        font-weight: 700;
        letter-spacing: 1px;
        text-transform: uppercase;
        color: #e0e6ed;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .header-right {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
    }

    .status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        display: inline-block;
        margin-right: 2px;
        transition: background 0.3s ease, box-shadow 0.3s ease;
    }

    .icon-btn {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.25);
        cursor: pointer;
        padding: 3px;
        display: flex;
        align-items: center;
        border-radius: 4px;
        transition: color 0.2s, background 0.2s;
    }

    .icon-btn:hover {
        color: var(--accent-cyan);
        background: rgba(0, 242, 255, 0.08);
    }

    /* Collapsed */
    .collapsed-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 0.25rem;
        border-top: 1px solid rgba(255, 255, 255, 0.04);
    }

    .mini-dots {
        display: flex;
        gap: 1.5rem;
    }

    .mini-dot-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
    }

    .mini-label {
        font-size: 0.5rem;
        color: rgba(255, 255, 255, 0.35);
        font-weight: 700;
        letter-spacing: 1px;
    }

    .mini-dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        display: block;
        transition: all 0.3s ease;
    }

    .mini-badge {
        font-size: 0.6rem;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 10px;
    }

    .mini-badge.warning {
        color: var(--warning);
        background: rgba(255, 204, 0, 0.1);
        border: 1px solid rgba(255, 204, 0, 0.25);
    }

    .mini-badge.success {
        color: var(--success);
        background: rgba(51, 255, 119, 0.08);
        border: 1px solid rgba(51, 255, 119, 0.2);
    }

    /* Body */
    .card-body {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    /* Gauge */
    .gauge-wrap {
        flex-shrink: 0;
        width: 100px;
        height: 100px;
    }

    .gauge-svg {
        width: 100%;
        height: 100%;
        overflow: visible;
    }

    /* Bars */
    .bars-wrap {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        min-width: 0;
    }

    .bar-block {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }

    .bar-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
    }

    .bar-label {
        font-size: 0.65rem;
        font-weight: 700;
        letter-spacing: 1.5px;
        color: rgba(255, 255, 255, 0.45);
        text-transform: uppercase;
    }

    .bar-value {
        font-size: 0.75rem;
        font-weight: 700;
        font-family: monospace;
        transition: color 0.3s ease;
    }

    .bar-total {
        font-size: 0.65rem;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.35);
    }

    .progress-track {
        height: 5px;
        background: rgba(255, 255, 255, 0.06);
        border-radius: 3px;
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.5s ease, background 0.3s ease;
    }

    /* Footer */
    .card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 0.5rem;
        border-top: 1px solid rgba(255, 255, 255, 0.04);
    }

    .footer-left {
        display: flex;
        flex-direction: column;
        gap: 1px;
    }

    .uptime {
        font-size: 0.7rem;
        color: rgba(255, 255, 255, 0.4);
        font-family: monospace;
    }

    .uptime.online {
        color: var(--success);
    }

    .uptime.offline {
        color: var(--danger);
        font-weight: 700;
    }

    .ip-text {
        font-size: 0.6rem;
        color: rgba(255, 255, 255, 0.2);
        font-family: monospace;
    }

    .footer-right {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .update-badge {
        font-size: 0.6rem;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
    }

    .update-badge.warning {
        color: var(--warning);
        background: rgba(255, 204, 0, 0.1);
        border: 1px solid rgba(255, 204, 0, 0.25);
    }

    .update-badge.success {
        color: var(--success);
        background: rgba(51, 255, 119, 0.08);
        border: 1px solid rgba(51, 255, 119, 0.2);
    }

    .action-btn {
        font-size: 0.6rem;
        font-weight: 700;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        padding: 3px 7px;
        border-radius: 4px;
        cursor: pointer;
        background: transparent;
        border: 1px solid rgba(0, 242, 255, 0.4);
        color: var(--accent-cyan);
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 3px;
        transition: all 0.2s ease;
    }

    .action-btn:hover {
        background: rgba(0, 242, 255, 0.1);
        border-color: var(--accent-cyan);
    }

    .action-btn.magenta {
        border-color: rgba(255, 0, 255, 0.4);
        color: var(--accent-magenta);
    }

    .action-btn.magenta:hover {
        background: rgba(255, 0, 255, 0.1);
        border-color: var(--accent-magenta);
    }
</style>
