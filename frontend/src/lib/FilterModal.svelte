<script>
    import { createEventDispatcher, onMount } from "svelte";

    export let vms = [];
    export let isOpen = false;

    const dispatch = createEventDispatcher();

    let filterName = "";
    let selectedVMIds = [];
    let savedFilters = [];

    onMount(() => {
        loadFilters();
    });

    function loadFilters() {
        savedFilters = JSON.parse(
            localStorage.getItem("custom_filters") || "[]",
        );
    }

    function toggleVMSelection(id) {
        if (selectedVMIds.includes(id)) {
            selectedVMIds = selectedVMIds.filter((vId) => vId !== id);
        } else {
            selectedVMIds = [...selectedVMIds, id];
        }
    }

    function saveFilter() {
        if (!filterName.trim() || selectedVMIds.length === 0) return;

        const newFilter = {
            id: Date.now(),
            name: filterName,
            vmIds: selectedVMIds,
        };

        savedFilters = [...savedFilters, newFilter];
        localStorage.setItem("custom_filters", JSON.stringify(savedFilters));

        filterName = "";
        selectedVMIds = [];
        dispatch("filterAdded");
    }

    function deleteFilter(id) {
        savedFilters = savedFilters.filter((f) => f.id !== id);
        localStorage.setItem("custom_filters", JSON.stringify(savedFilters));
    }

    function close() {
        isOpen = false;
        dispatch("close");
    }

    function applyAll() {
        const allIds = vms.map((v) => v.id);
        dispatch("apply", { name: "Mostrar Todas", vmIds: allIds });
        close();
    }
</script>

{#if isOpen}
    <div class="modal-backdrop" on:click|self={close}>
        <div class="modal-content cyber-card">
            <header class="modal-header">
                <h2 class="glow-text-cyan">Gestionar Filtros</h2>
                <button class="close-btn" on:click={close}>&times;</button>
            </header>

            <div class="modal-body">
                <section class="filter-creation">
                    <h3>Nuevo Filtro</h3>
                    <div class="input-group">
                        <input
                            type="text"
                            placeholder="Nombre del filtro..."
                            bind:value={filterName}
                            class="cyber-input"
                        />
                    </div>

                    <div class="vm-selector-list">
                        {#each vms as vm}
                            <label class="vm-item">
                                <input
                                    type="checkbox"
                                    checked={selectedVMIds.includes(vm.id)}
                                    on:change={() => toggleVMSelection(vm.id)}
                                />
                                <span>{vm.hostname}</span>
                            </label>
                        {/each}
                    </div>

                    <button
                        class="cyber-btn"
                        on:click={saveFilter}
                        disabled={!filterName || selectedVMIds.length === 0}
                    >
                        Guardar Filtro
                    </button>
                    <button class="cyber-btn secondary" on:click={applyAll}>
                        Mostrar Todas por Defecto
                    </button>
                </section>

                <hr class="divider" />

                <section class="saved-filters">
                    <h3>Filtros Guardados</h3>
                    {#if savedFilters.length === 0}
                        <p class="empty-msg">No hay filtros personalizados.</p>
                    {:else}
                        <div class="filters-list">
                            {#each savedFilters as filter}
                                <div class="filter-item">
                                    <span class="filter-name"
                                        >{filter.name}</span
                                    >
                                    <div class="filter-actions">
                                        <button
                                            class="cyber-btn mini"
                                            on:click={() =>
                                                dispatch("apply", filter)}
                                        >
                                            Aplicar
                                        </button>
                                        <button
                                            class="cyber-btn mini danger"
                                            on:click={() =>
                                                deleteFilter(filter.id)}
                                        >
                                            Borrar
                                        </button>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </section>
            </div>
        </div>
    </div>
{/if}

<style>
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        backdrop-filter: blur(5px);
    }

    .modal-content {
        width: 90%;
        max-width: 500px;
        background: var(--bg-dark);
        border: 1px solid var(--border-glow);
        padding: 2rem;
        max-height: 85vh;
        overflow-y: auto;
    }

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }

    .close-btn {
        background: none;
        border: none;
        color: var(--text-dim);
        font-size: 2rem;
        cursor: pointer;
    }

    .close-btn:hover {
        color: var(--accent-cyan);
    }

    h3 {
        color: var(--accent-magenta);
        font-size: 0.9rem;
        text-transform: uppercase;
        margin-bottom: 1rem;
    }

    .cyber-input {
        width: 100%;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--text-dim);
        color: white;
        padding: 8px;
        margin-bottom: 1rem;
    }

    .vm-selector-list {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        max-height: 200px;
        overflow-y: auto;
        margin-bottom: 1.5rem;
        padding: 10px;
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .vm-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.85rem;
        cursor: pointer;
        color: var(--text-dim);
    }

    .vm-item input:checked + span {
        color: var(--accent-cyan);
    }

    .divider {
        border: 0;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        margin: 1.5rem 0;
    }

    .filter-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px;
        background: rgba(255, 255, 255, 0.03);
        margin-bottom: 8px;
        border-left: 2px solid var(--accent-cyan);
    }

    .filter-name {
        font-weight: 600;
        font-size: 0.9rem;
    }

    .filter-actions {
        display: flex;
        gap: 8px;
    }

    .empty-msg {
        color: var(--text-dim);
        font-size: 0.85rem;
        font-style: italic;
    }

    .cyber-btn.danger {
        border-color: var(--danger);
        color: var(--danger);
    }

    .cyber-btn.danger:hover {
        background: var(--danger);
        color: black;
    }
</style>
