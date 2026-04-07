<script>
    import { onMount, createEventDispatcher } from "svelte";
    import { getVMHistory, getVMStats } from "./api.js";
    import { Line } from "svelte-chartjs";
    import {
        Chart as ChartJS,
        Title,
        Tooltip,
        Legend,
        LineElement,
        LinearScale,
        PointElement,
        CategoryScale,
    } from "chart.js";

    ChartJS.register(
        Title,
        Tooltip,
        Legend,
        LineElement,
        LinearScale,
        PointElement,
        CategoryScale,
    );

    export let vm;
    const dispatch = createEventDispatcher();

    let history = [];
    let stats = [];
    let loading = true;
    let selectedHours = 24;

    async function loadData() {
        loading = true;
        try {
            const [historyData, statsData] = await Promise.all([
                getVMHistory(vm.id, selectedHours),
                getVMStats(vm.id, selectedHours),
            ]);
            history = historyData;
            stats = statsData;
        } catch (e) {
            console.error("Error loading VM details:", e);
        } finally {
            loading = false;
        }
    }

    onMount(loadData);

    function formatLabel(timestamp) {
        const d = new Date(timestamp);
        if (selectedHours >= 168) {
            return d.toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "2-digit" });
        }
        return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
    }

    $: chartData = {
        labels: stats.map((s) => formatLabel(s.timestamp)),
        datasets: [
            {
                label: "CPU %",
                data: stats.map((s) => s.cpu_usage),
                borderColor: "#00f2ff",
                backgroundColor: "rgba(0, 242, 255, 0.1)",
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 4,
            },
            {
                label: "RAM %",
                data: stats.map((s) => s.ram_percent),
                borderColor: "#ff00ff",
                backgroundColor: "rgba(255, 0, 255, 0.1)",
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 4,
            },
            {
                label: "Disk %",
                data: stats.map((s) => s.disk_percent),
                borderColor: "#bcff00",
                backgroundColor: "rgba(188, 255, 0, 0.1)",
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 4,
            },
        ],
    };

    $: chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
                grid: { color: "rgba(255, 255, 255, 0.1)" },
                ticks: { color: "#94a3b8" },
            },
            x: {
                grid: { color: "rgba(255, 255, 255, 0.1)" },
                ticks: {
                    color: "#94a3b8",
                    maxRotation: 45,
                    minRotation: 45,
                    maxTicksLimit: selectedHours >= 168 ? 7 : selectedHours,
                    autoSkip: true,
                },
            },
        },
        plugins: {
            legend: {
                labels: { color: "#e0e6ed", font: { family: "Inter" } },
            },
        },
    };

    function close() {
        dispatch("close");
    }

    $: latestStatus = vm.latest_status || {};
    $: partitions = latestStatus.partitions || [];
</script>

<div
    class="modal-overlay"
    on:click|self={close}
    on:keydown={(e) => e.key === "Escape" && close()}
    role="button"
    tabindex="0"
>
    <div class="detail-container cyber-card">
        <header class="detail-header">
            <div class="title-group">
                <h2 class="glow-text-cyan">{vm.hostname}</h2>
                <div class="meta-info">
                    <span class="ip-tag">{vm.ip_address}</span>
                    <span class="os-highlight">{vm.os_version}</span>
                    {#if latestStatus.ram_total}
                        <span class="ram-tag">{(latestStatus.ram_total / 1024).toFixed(0)} GB RAM</span>
                    {/if}
                    {#if latestStatus.update_count > 0}
                        <div class="update-tag warning">
                            <svg
                                viewBox="0 0 24 24"
                                width="12"
                                height="12"
                                fill="currentColor"
                            >
                                <path
                                    d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"
                                />
                            </svg>
                            <span>ACTS: {latestStatus.update_count}</span>
                        </div>
                    {:else if latestStatus.update_count === 0}
                        <div class="update-tag success">
                            <svg
                                viewBox="0 0 24 24"
                                width="12"
                                height="12"
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
            </div>
            <div class="header-actions">
                {#if vm.webmin_url}
                    <a
                        href={vm.webmin_url}
                        target="_blank"
                        class="cyber-btn mini webmin-large"
                    >
                        WEBMIN
                    </a>
                {/if}
                <button class="close-btn" on:click={close}>&times;</button>
            </div>
        </header>

        <div class="detail-content">
            <section class="partitions-section">
                <h3>Particiones</h3>
                <div class="partitions-grid">
                    {#if partitions.length > 0}
                        {#each partitions as part}
                            <div class="partition-item">
                                <div class="part-info">
                                    <span class="mountpoint"
                                        >{part.mountpoint}</span
                                    >
                                    <span class="usage-text"
                                        >{Math.round(part.used_mb / 1024)}GB / {Math.round(
                                            part.total_mb / 1024,
                                        )}GB ({part.used_percent}%)</span
                                    >
                                </div>
                                <div class="progress-container">
                                    <div
                                        class="progress-bar"
                                        style="width: {part.used_percent}%; background: {part.used_percent >
                                        80
                                            ? 'var(--danger)'
                                            : part.used_percent > 50
                                              ? 'var(--warning)'
                                              : 'var(--success)'}"
                                    ></div>
                                </div>
                            </div>
                        {/each}
                    {:else}
                        <p class="no-data">
                            No hay datos de particiones disponibles.
                        </p>
                    {/if}
                </div>
            </section>

            <section class="history-section">
                <div class="section-header">
                    <h3>Historial ({selectedHours >= 168 ? "Última semana" : `Últimas ${selectedHours}h`})</h3>
                    <select
                        bind:value={selectedHours}
                        on:change={loadData}
                        class="cyber-select"
                    >
                        <option value={6}>6 Horas</option>
                        <option value={12}>12 Horas</option>
                        <option value={24}>24 Horas</option>
                        <option value={48}>48 Horas</option>
                        <option value={168}>1 Semana</option>
                    </select>
                </div>
                <div class="chart-container">
                    {#if loading}
                        <div class="loader-small">Cargando datos...</div>
                    {:else if stats.length > 0}
                        <Line data={chartData} options={chartOptions} />
                    {:else}
                        <p class="no-data">
                            No hay datos históricos para este periodo.
                        </p>
                    {/if}
                </div>
            </section>
        </div>
    </div>
</div>

<style>
    .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(8px);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
    }

    .detail-container {
        width: 100%;
        max-width: 900px;
        max-height: 90vh;
        background: var(--bg-card);
        display: flex;
        flex-direction: column;
        animation: slideUp 0.3s ease-out;
    }

    .detail-header {
        padding: 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--border-glow);
    }

    .title-group h2 {
        margin: 0;
        font-size: 1.8rem;
    }

    .ip-tag {
        color: var(--text-dim);
        font-family: monospace;
        background: rgba(0, 0, 0, 0.3);
        padding: 2px 8px;
        border-radius: 4px;
    }

    .os-highlight {
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--accent-cyan);
        text-shadow: 0 0 5px rgba(0, 242, 255, 0.3);
    }

    .ram-tag {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--text-dim);
        background: rgba(255, 255, 255, 0.05);
        padding: 2px 8px;
        border-radius: 4px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        font-family: monospace;
    }

    .meta-info {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-top: 0.3rem;
        flex-wrap: wrap;
    }

    .update-tag {
        display: flex;
        align-items: center;
        gap: 6px;
        font-weight: 800;
        font-size: 0.75rem;
        padding: 4px 10px;
        border-radius: 6px;
        text-transform: uppercase;
    }

    .update-tag.warning {
        color: #ffcc00;
        background: rgba(255, 204, 0, 0.1);
        border: 1px solid rgba(255, 204, 0, 0.4);
        box-shadow: 0 0 10px rgba(255, 204, 0, 0.1);
    }

    .update-tag.success {
        color: var(--success);
        background: rgba(0, 255, 102, 0.05);
        border: 1px solid rgba(0, 255, 102, 0.2);
    }

    .header-actions {
        display: flex;
        align-items: center;
        gap: 1.5rem;
    }

    .webmin-large {
        padding: 6px 12px;
        font-size: 0.8rem;
        text-decoration: none;
        display: inline-block;
        background: rgba(0, 242, 255, 0.1);
        border: 1px solid var(--accent-cyan);
        color: var(--accent-cyan);
        font-weight: 600;
        text-transform: uppercase;
        transition: all 0.2s;
    }

    .webmin-large:hover {
        background: var(--accent-cyan);
        color: var(--bg-dark);
        box-shadow: 0 0 10px var(--accent-cyan);
    }

    .close-btn {
        background: transparent;
        border: none;
        color: var(--text-dim);
        font-size: 2rem;
        cursor: pointer;
        line-height: 1;
    }

    .close-btn:hover {
        color: var(--accent-cyan);
    }

    .detail-content {
        padding: 1.5rem;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }

    h3 {
        color: var(--accent-magenta);
        font-size: 1rem;
        margin-bottom: 1rem;
        text-transform: uppercase;
        letter-spacing: 1px;
    }

    .partitions-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        gap: 1rem;
    }

    .partition-item {
        background: rgba(255, 255, 255, 0.03);
        padding: 0.8rem;
        border-radius: 4px;
        border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .part-info {
        display: flex;
        justify-content: space-between;
        font-size: 0.8rem;
        margin-bottom: 0.5rem;
    }

    .mountpoint {
        font-weight: bold;
        color: var(--text-main);
    }

    .usage-text {
        color: var(--text-dim);
    }

    .chart-container {
        height: 350px;
        position: relative;
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .cyber-select {
        background: var(--bg-dark);
        border: 1px solid var(--accent-cyan);
        color: var(--accent-cyan);
        padding: 4px 8px;
        font-size: 0.8rem;
        border-radius: 4px;
        outline: none;
    }

    .loader-small {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--text-dim);
        font-style: italic;
    }

    .no-data {
        color: var(--text-dim);
        text-align: center;
        padding: 2rem;
        font-style: italic;
    }

    @keyframes slideUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @media (max-width: 600px) {
        .modal-overlay {
            padding: 0.5rem;
        }
        .chart-container {
            height: 250px;
        }
    }
</style>
