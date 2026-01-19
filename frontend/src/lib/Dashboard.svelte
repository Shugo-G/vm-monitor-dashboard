<script>
    import { onMount, onDestroy } from "svelte";
    import { getVMs, bulkToggleVMVisibility } from "./api.js";
    import VMCard from "./VMCard.svelte";
    import VMDetail from "./VMDetail.svelte";
    import FilterModal from "./FilterModal.svelte";

    let vms = [];
    let interval;
    let loading = true;
    let error = null;
    let showHidden = false;
    let globalExpanded = true;
    let draggedVmId = null;
    let now = new Date();
    let nowTimer;
    let selectedVM = null;

    // Filter and Visibility logic
    let isFilterModalOpen = false;
    let activeFilterName =
        localStorage.getItem("active_filter_name") || "Todas";
    let activeFilterVmIds = JSON.parse(
        localStorage.getItem("active_filter_ids") || "null",
    );
    let manualHiddenIds = JSON.parse(
        localStorage.getItem("manual_hidden_ids") || "[]",
    );

    function handleVisibilityToggle(event) {
        const vmId = event.detail;
        if (manualHiddenIds.includes(vmId)) {
            manualHiddenIds = manualHiddenIds.filter((id) => id !== vmId);
        } else {
            manualHiddenIds = [...manualHiddenIds, vmId];
        }
        localStorage.setItem(
            "manual_hidden_ids",
            JSON.stringify(manualHiddenIds),
        );
    }

    function openDetail(event) {
        selectedVM = event.detail;
    }

    function closeDetail() {
        selectedVM = null;
    }

    async function refreshData() {
        try {
            const data = await getVMs();
            const savedOrder = JSON.parse(
                localStorage.getItem("vm_order") || "[]",
            );

            if (savedOrder.length > 0) {
                // Reordenar según el guardado
                vms = savedOrder
                    .map((id) => data.find((v) => v.id === id))
                    .filter(Boolean);
                // Si hay nuevas VMs que no están en el orden guardado, agregarlas al final
                const newVMS = data.filter((v) => !savedOrder.includes(v.id));
                vms = [...vms, ...newVMS];
            } else {
                vms = data;
            }

            error = null;
        } catch (e) {
            error = "Connection Lost - Retrying...";
            console.error(e);
        } finally {
            loading = false;
        }
    }

    function saveOrder() {
        localStorage.setItem("vm_order", JSON.stringify(vms.map((v) => v.id)));
    }

    onMount(() => {
        refreshData();
        interval = setInterval(refreshData, 30000);
        nowTimer = setInterval(() => {
            now = new Date();
        }, 10000); // Actualizar cada 10s
    });

    onDestroy(() => {
        if (interval) clearInterval(interval);
        if (nowTimer) clearInterval(nowTimer);
    });

    function handleDragStart(id) {
        draggedVmId = id;
    }

    function handleDrop(targetId) {
        if (draggedVmId === null) return;
        const fromIndex = vms.findIndex((v) => v.id === draggedVmId);
        const toIndex = vms.findIndex((v) => v.id === targetId);

        if (fromIndex !== -1 && toIndex !== -1) {
            const draggedItem = vms[fromIndex];
            vms.splice(fromIndex, 1);
            vms.splice(toIndex, 0, draggedItem);
            vms = vms; // trigger update
            saveOrder();
        }
        draggedVmId = null;
    }

    let isLightTheme = false;

    function toggleTheme() {
        isLightTheme = !isLightTheme;
        if (isLightTheme) {
            document.body.classList.add("light-theme");
        } else {
            document.body.classList.remove("light-theme");
        }
    }

    function toggleAll(expand) {
        globalExpanded = expand;
    }

    function applyFilter(event) {
        const { name, vmIds } = event.detail;

        const isShowAll = name === "Mostrar Todas" || name === "Todas";

        if (isShowAll) {
            activeFilterName = "Todas";
            activeFilterVmIds = null;
        } else {
            activeFilterName = name;
            activeFilterVmIds = vmIds;
        }

        localStorage.setItem("active_filter_name", activeFilterName);
        localStorage.setItem(
            "active_filter_ids",
            JSON.stringify(activeFilterVmIds),
        );

        // Resetear ocultación manual al aplicar/re-aplicar un filtro
        manualHiddenIds = [];
        localStorage.removeItem("manual_hidden_ids");
    }

    $: filteredVms = vms
        .filter((v) =>
            activeFilterVmIds ? activeFilterVmIds.includes(v.id) : true,
        )
        .filter((v) => showHidden || !manualHiddenIds.includes(v.id));

    $: stats = {
        total: vms.length,
        online: vms.filter(
            (v) =>
                (now.getTime() - new Date(v.last_seen).getTime()) / 1000 / 60 <=
                3,
        ).length,
        visible: filteredVms.length,
        onlineVisible: filteredVms.filter(
            (v) =>
                (now.getTime() - new Date(v.last_seen).getTime()) / 1000 / 60 <=
                3,
        ).length,
    };
</script>

<div class="dashboard-container">
    <header class="dashboard-header">
        <div class="navbar-content">
            <div class="nav-left">
                <h1 class="glow-text-cyan">ShugoVision</h1>
                <div class="divider"></div>
                <div class="nav-stats">
                    <div class="stat-mini">
                        <span class="mini-label">VISIBLES</span>
                        <span class="mini-value cyan">{stats.visible}</span>
                    </div>
                    <div class="stat-mini">
                        <span class="mini-label">UP VIS.</span>
                        <span class="mini-value green"
                            >{stats.onlineVisible}</span
                        >
                    </div>
                </div>
            </div>

            <div class="nav-center">
                <div class="control-group main-actions">
                    <button
                        class="nav-btn accent"
                        on:click={() => refreshData()}
                    >
                        <span class="btn-icon">⚡</span> Actualizar
                    </button>
                    <button
                        class="nav-btn magenta"
                        on:click={() => (isFilterModalOpen = true)}
                    >
                        <span class="btn-icon">🔍</span> Filtros: {activeFilterName}
                    </button>
                </div>

                <div class="control-group view-actions">
                    <button
                        class="nav-btn icon-btn"
                        on:click={() => toggleAll(false)}
                        title="Contraer Todas"
                        >[-]
                    </button>
                    <button
                        class="nav-btn icon-btn"
                        on:click={() => toggleAll(true)}
                        title="Expandir Todas"
                        >[+]
                    </button>
                    <button
                        class="nav-btn icon-btn"
                        on:click={toggleTheme}
                        title="Cambiar Tema">🌓</button
                    >
                    <label class="compact-toggle">
                        <input type="checkbox" bind:checked={showHidden} />
                        <span class="toggle-text">Ocultos</span>
                    </label>
                </div>
            </div>

            <div class="nav-right">
                <div class="nav-stats-alt">
                    <div class="stat-mini">
                        <span class="mini-label">TOTAL</span>
                        <span class="mini-value cyan">{stats.total}</span>
                    </div>
                    <div class="stat-mini">
                        <span class="mini-label">UP</span>
                        <span class="mini-value green">{stats.online}</span>
                    </div>
                </div>
            </div>
        </div>
        {#if error}
            <div class="error-banner">{error}</div>
        {/if}
    </header>

    {#if loading}
        <div class="loader">
            <div class="spinner"></div>
            <p>INITIALIZING NEURAL LINK...</p>
        </div>
    {:else}
        <div class="dashboard-grid">
            {#each filteredVms as vm, i (vm.id)}
                <VMCard
                    {vm}
                    {now}
                    isExpanded={globalExpanded}
                    isLocallyVisible={activeFilterVmIds
                        ? activeFilterVmIds.includes(vm.id)
                        : !manualHiddenIds.includes(vm.id)}
                    on:dragstart={() => handleDragStart(vm.id)}
                    on:drop={() => handleDrop(vm.id)}
                    on:viewDetail={openDetail}
                    on:visibilityToggle={handleVisibilityToggle}
                />
            {/each}
        </div>
    {/if}

    {#if selectedVM}
        <VMDetail vm={selectedVM} on:close={closeDetail} />
    {/if}

    <FilterModal bind:isOpen={isFilterModalOpen} {vms} on:apply={applyFilter} />
</div>

<style>
    .dashboard-container {
        animation: fadeIn 0.5s ease-out;
    }

    .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
        align-items: start; /* Fixes Issue 3: Alignment */
    }

    .dashboard-header {
        position: sticky;
        top: 0;
        z-index: 100;
        margin-bottom: 1.5rem;
        padding: 0.5rem 1.5rem;
        background: rgba(5, 8, 15, 0.95);
        border-bottom: 2px solid rgba(0, 242, 255, 0.4);
        backdrop-filter: blur(15px);
        box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.6),
            inset 0 -1px 0 rgba(255, 255, 255, 0.05);
    }

    .navbar-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 2rem;
        height: 50px;
    }

    .nav-left,
    .nav-right {
        display: flex;
        align-items: center;
        gap: 1.2rem;
    }

    .nav-left h1 {
        font-size: 1.4rem;
        margin: 0;
        letter-spacing: 2px;
    }

    .divider {
        width: 1px;
        height: 24px;
        background: rgba(0, 242, 255, 0.2);
    }

    .nav-center {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 2rem;
    }

    .control-group {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 8px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .nav-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: var(--text-main);
        padding: 4px 12px;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .nav-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
        transform: translateY(-1px);
    }

    .nav-btn.accent {
        border-color: var(--accent-cyan);
        color: var(--accent-cyan);
    }

    .nav-btn.accent:hover {
        background: var(--accent-cyan);
        color: var(--bg-dark);
        box-shadow: 0 0 10px var(--accent-cyan);
    }

    .nav-btn.magenta {
        border-color: var(--accent-magenta);
        color: var(--accent-magenta);
    }

    .nav-btn.magenta:hover {
        background: var(--accent-magenta);
        color: var(--bg-dark);
        box-shadow: 0 0 10px var(--accent-magenta);
    }

    .nav-btn.icon-btn {
        padding: 4px 8px;
        font-size: 1rem;
    }

    .compact-toggle {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        font-size: 0.65rem;
        font-weight: 700;
        color: var(--text-dim);
        text-transform: uppercase;
        padding: 0 4px;
    }

    .nav-stats,
    .nav-stats-alt {
        display: flex;
        gap: 1.2rem;
    }

    .nav-stats-alt {
        padding-left: 1.2rem;
        border-left: 2px solid rgba(0, 242, 255, 0.1);
    }

    .stat-mini {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 50px;
    }

    .mini-label {
        font-size: 0.5rem;
        color: var(--text-dim);
        font-weight: 800;
        letter-spacing: 1px;
    }

    .mini-value {
        font-size: 1rem;
        font-weight: 900;
        font-family: "JetBrains Mono", monospace;
    }

    .mini-value.cyan {
        color: var(--accent-cyan);
        text-shadow: 0 0 8px rgba(0, 242, 255, 0.4);
    }
    .mini-value.green {
        color: var(--success);
        text-shadow: 0 0 8px rgba(0, 255, 136, 0.4);
    }

    .error-banner {
        background: var(--danger);
        color: black;
        padding: 6px;
        font-size: 0.85rem;
        font-weight: bold;
        margin-top: 1rem;
        text-align: center;
        animation: pulse 2s infinite;
    }

    .loader {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 60vh;
        color: var(--accent-cyan);
        letter-spacing: 4px;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes pulse {
        0% {
            opacity: 0.8;
        }
        50% {
            opacity: 1;
        }
        100% {
            opacity: 0.8;
        }
    }
</style>
