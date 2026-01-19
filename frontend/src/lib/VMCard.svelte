<script>
    import { createEventDispatcher } from "svelte";
    export let vm;
    export let now = new Date();
    export let isExpanded = true;
    export let isLocallyVisible = true;

    const dispatch = createEventDispatcher();

    $: status = vm.latest_status || {};

    // Lógica de estado (Stale if > 3 min)
    $: timeSinceLastSeen =
        (now.getTime() - new Date(vm.last_seen).getTime()) / 1000 / 60; // en minutos
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

        if (cpu === "danger" || ram === "danger" || disk === "danger")
            return "danger";
        if (cpu === "warning" || ram === "warning" || disk === "warning")
            return "warning";
        return "success";
    })();

    $: borderColor =
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

    function handleToggle() {
        dispatch("visibilityToggle", vm.id);
    }

    function toggleExpand() {
        isExpanded = !isExpanded;
    }
</script>

<div
    class="cyber-card"
    class:hidden={!isLocallyVisible}
    class:collapsed={!isExpanded}
    style="border-color: {borderColor}; box-shadow: 0 0 10px {borderColor}33;"
    draggable="true"
    role="listitem"
    tabIndex="-1"
    on:dragstart
    on:dragover|preventDefault
    on:drop
>
    <div class="card-header">
        <div class="title-row">
            <div class="drag-handle">
                <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="currentColor"
                >
                    <path
                        d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
                    />
                </svg>
            </div>
            <h3 class="glow-text-cyan">{vm.hostname}</h3>
            <span
                class="status-indicator"
                class:status-online={!isStale}
                class:status-offline={isStale}
            ></span>
        </div>

        <div class="header-actions">
            <button
                class="icon-btn"
                on:click={toggleExpand}
                title={isExpanded ? "Contraer" : "Expandir"}
            >
                <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="currentColor"
                >
                    {#if isExpanded}
                        <path d="M19 13H5v-2h14v2z" />
                    {:else}
                        <path d="M19 13H13v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    {/if}
                </svg>
            </button>
            <button
                on:click={handleToggle}
                class="icon-btn"
                title={isLocallyVisible ? "Ocultar" : "Mostrar"}
            >
                <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="currentColor"
                >
                    {#if isLocallyVisible}
                        <path
                            d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                        />
                    {:else}
                        <path
                            d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.82l2.92 2.92C21.1 15.39 22.4 13.81 23 12c-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.19 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.83l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.34-4.34l2.11 2.11C14.15 7.6 14.33 8.24 14.33 8.92c0 1.28-.8 2.36-1.92 2.78l-2.11-2.11c-.42-1.12-.66-2.2-.66-3.48 0-.68.18-1.32.42-1.87z"
                        />
                    {/if}
                </svg>
            </button>
        </div>
    </div>

    <div class="meta-row">
        <small class="time">{new Date(vm.last_seen).toLocaleString()}</small>
        <small class="ip">{vm.ip_address || "No IP"}</small>
    </div>

    {#if !isExpanded}
        <div class="collapsed-indicators">
            <div class="monitor-dots">
                <div class="dot-wrap">
                    <span class="dot-label">CPU</span>
                    <div
                        class="status-dot"
                        style="background: {cpuColor}; box-shadow: 0 0 5px {cpuColor}66;"
                        title="CPU: {status.cpu_usage}%"
                    ></div>
                </div>
                <div class="dot-wrap">
                    <span class="dot-label">RAM</span>
                    <div
                        class="status-dot"
                        style="background: {ramColor}; box-shadow: 0 0 5px {ramColor}66;"
                        title="RAM: {status.ram_percent}%"
                    ></div>
                </div>
                <div class="dot-wrap">
                    <span class="dot-label">DSK</span>
                    <div
                        class="status-dot"
                        style="background: {diskColor}; box-shadow: 0 0 5px {diskColor}66;"
                        title="DISK: {status.disk_percent}%"
                    ></div>
                </div>
            </div>

            <div class="update-indicator">
                {#if status.update_count > 0}
                    <div
                        class="mini-update warning"
                        title="{status.update_count} actualizaciones pendientes"
                    >
                        {status.update_count}
                    </div>
                {:else if status.update_count === 0}
                    <div
                        class="mini-update success"
                        title="Sistema actualizado"
                    >
                        ✓
                    </div>
                {/if}
            </div>
        </div>
    {/if}

    {#if isExpanded}
        <div class="card-content">
            <div class="resource">
                <div class="res-header">
                    <span>CPU</span>
                    <span style="color: {cpuColor}"
                        >{status.cpu_usage || 0}%</span
                    >
                </div>
                <div class="progress-container">
                    <div
                        class="progress-bar"
                        style="width: {status.cpu_usage ||
                            0}%; background: {cpuColor}"
                    ></div>
                </div>
            </div>

            <div class="resource">
                <div class="res-header">
                    <span>RAM</span>
                    <span style="color: {ramColor}"
                        >{status.ram_percent || 0}%</span
                    >
                </div>
                <div class="progress-container">
                    <div
                        class="progress-bar"
                        style="width: {status.ram_percent ||
                            0}%; background: {ramColor}"
                    ></div>
                </div>
            </div>

            <div class="resource">
                <div class="res-header">
                    <span>DISK</span>
                    <span style="color: {diskColor}"
                        >{status.disk_percent || 0}%</span
                    >
                </div>
                <div class="progress-container">
                    <div
                        class="progress-bar"
                        style="width: {status.disk_percent ||
                            0}%; background: {diskColor}"
                    ></div>
                </div>
            </div>
        </div>

        <div class="card-footer">
            <div class="os-row">
                <span class="os-version">{vm.os_version}</span>
            </div>
            <div class="bottom-row">
                <div class="update-section">
                    {#if status.update_count > 0}
                        <div
                            class="update-badge warning"
                            title="{status.update_count} actualizaciones pendientes"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                width="10"
                                height="10"
                                fill="currentColor"
                            >
                                <path
                                    d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"
                                />
                            </svg>
                            <span>ACTS: {status.update_count}</span>
                        </div>
                    {:else if status.update_count === 0}
                        <div
                            class="update-badge success"
                            title="Sistema actualizado"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                width="10"
                                height="10"
                                fill="currentColor"
                            >
                                <path
                                    d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                                />
                            </svg>
                            <span>ACTUALIZADO</span>
                        </div>
                    {/if}
                </div>
                <div class="actions">
                    {#if vm.webmin_url}
                        <a
                            href={vm.webmin_url}
                            target="_blank"
                            class="cyber-btn mini">Webmin</a
                        >
                    {/if}
                    <button
                        class="cyber-btn mini magenta"
                        on:click={() => dispatch("viewDetail", vm)}
                        title="Ver Detalle e Historial"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            width="12"
                            height="12"
                            fill="currentColor"
                        >
                            <path
                                d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"
                            />
                        </svg>
                        Detalles
                    </button>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .cyber-card {
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        min-height: 100px;
    }

    .cyber-card.collapsed {
        padding-bottom: 0.8rem;
    }

    .cyber-card.hidden {
        opacity: 0.5;
        filter: grayscale(1);
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .title-row {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .drag-handle {
        cursor: grab;
        color: var(--text-dim);
        display: flex;
        align-items: center;
    }

    .drag-handle:active {
        cursor: grabbing;
    }

    .header-actions {
        display: flex;
        gap: 4px;
    }

    .icon-btn {
        background: transparent;
        border: none;
        color: var(--text-dim);
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        border-radius: 4px;
    }

    .icon-btn:hover {
        color: var(--accent-cyan);
        background: rgba(0, 242, 255, 0.1);
    }

    .meta-row {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        color: var(--text-dim);
        font-family: monospace;
    }

    .res-header {
        display: flex;
        justify-content: space-between;
        font-size: 0.8rem;
        font-weight: 600;
        margin-bottom: 2px;
    }

    .card-footer {
        margin-top: 4px;
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        padding-top: 0.5rem;
    }

    .os-row {
        width: 100%;
    }

    .bottom-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
    }

    .os-version {
        font-weight: 600;
        color: var(--text-main);
        background: rgba(255, 255, 255, 0.05);
        padding: 2px 6px;
        border-radius: 3px;
        border-left: 2px solid var(--accent-magenta);
        font-size: 0.75rem;
        white-space: nowrap;
    }

    .update-badge {
        display: flex;
        align-items: center;
        gap: 4px;
        font-weight: 800;
        font-size: 0.6rem;
        padding: 2px 6px;
        border-radius: 4px;
        text-transform: uppercase;
    }

    .update-badge.warning {
        color: #ffcc00;
        background: rgba(255, 204, 0, 0.1);
        border: 1px solid rgba(255, 204, 0, 0.3);
        box-shadow: 0 0 5px rgba(255, 204, 0, 0.1);
    }

    .update-badge.success {
        color: var(--success);
        background: rgba(0, 255, 102, 0.05);
        border: 1px solid rgba(0, 255, 102, 0.2);
    }

    .actions {
        display: flex;
        gap: 8px;
    }

    .cyber-btn.mini {
        padding: 2px 6px;
        font-size: 0.65rem;
        background: transparent;
        border: 1px solid var(--accent-cyan);
        color: var(--accent-cyan);
        text-transform: uppercase;
        cursor: pointer;
        text-decoration: none;
    }

    .cyber-btn.mini:hover {
        background: var(--accent-cyan);
        color: var(--bg-dark);
    }

    .cyber-btn.mini.magenta {
        border-color: var(--accent-magenta);
        color: var(--accent-magenta);
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .cyber-btn.mini.magenta:hover {
        background: var(--accent-magenta);
        color: var(--bg-dark);
        box-shadow: 0 0 8px var(--accent-magenta);
    }

    .status-indicator {
        width: 8px;
        height: 8px;
    }

    /* Collapsed Indicators */
    .collapsed-indicators {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 0.2rem;
        padding-top: 0.2rem;
        border-top: 1px solid rgba(255, 255, 255, 0.03);
    }

    .monitor-dots {
        display: flex;
        gap: 40px;
    }

    .dot-wrap {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
    }

    .dot-label {
        font-size: 0.55rem;
        color: var(--text-dim);
        font-weight: 800;
        text-transform: uppercase;
        font-family: monospace;
    }

    .status-dot {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        transition: all 0.3s ease;
    }

    .mini-update {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        font-weight: 900;
        transition: all 0.3s ease;
    }

    .mini-update.warning {
        background: rgba(255, 204, 0, 0.15);
        color: #ffcc00;
        border: 1px solid rgba(255, 204, 0, 0.3);
        box-shadow: 0 0 8px rgba(255, 204, 0, 0.2);
    }

    .mini-update.success {
        background: rgba(0, 255, 102, 0.1);
        color: var(--success);
        border: 1px solid rgba(0, 255, 102, 0.2);
        box-shadow: 0 0 8px rgba(0, 255, 102, 0.1);
    }
</style>
