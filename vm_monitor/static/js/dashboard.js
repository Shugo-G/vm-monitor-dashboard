let vmsData = [];
let showHidden = false;
let collapsedVMs = new Set(); // IDs de VMs colapsadas
let vmOrder = []; // Orden personalizado de las VMs

// Cargar preferencias guardadas
function loadPreferences() {
    const savedCollapsed = localStorage.getItem('collapsedVMs');
    const savedOrder = localStorage.getItem('vmOrder');
    
    if (savedCollapsed) {
        collapsedVMs = new Set(JSON.parse(savedCollapsed));
    }
    
    if (savedOrder) {
        vmOrder = JSON.parse(savedOrder);
    }
}

// Guardar preferencias
function savePreferences() {
    localStorage.setItem('collapsedVMs', JSON.stringify([...collapsedVMs]));
    localStorage.setItem('vmOrder', JSON.stringify(vmOrder));
}

async function fetchVMs() {
    try {
        const response = await fetch('/api/vms/');
        if (!response.ok) throw new Error('Error al cargar datos');
        vmsData = await response.json();
        
        // Aplicar orden personalizado si existe
        if (vmOrder.length > 0) {
            vmsData.sort((a, b) => {
                const indexA = vmOrder.indexOf(a.id);
                const indexB = vmOrder.indexOf(b.id);
                
                // Si ambos están en el orden, usar ese orden
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                // Si solo A está en el orden, A va primero
                if (indexA !== -1) return -1;
                // Si solo B está en el orden, B va primero
                if (indexB !== -1) return 1;
                // Si ninguno está en el orden, mantener orden original
                return 0;
            });
        }
        
        renderVMs();
        updateHeader();
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('vm-grid').innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p style="color: #ef4444; font-weight: 600;">⚠️ Error al cargar las VMs</p>
                <button class="btn btn-primary" onclick="refreshData()" style="margin-top: 15px;">
                    🔄 Reintentar
                </button>
            </div>
        `;
    }
}

function renderVMs() {
    const container = document.getElementById('vm-grid');
    const visibleVMs = vmsData.filter(vm => showHidden || vm.is_visible);
    
    if (visibleVMs.length === 0) {
        container.innerHTML = `
            <div class="loading">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #60a5fa; margin: 0 auto 20px;">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                <p style="font-size: 16px; color: #94a3b8;">No hay VMs para mostrar</p>
                <p style="font-size: 13px; color: #64748b; margin-top: 8px;">
                    ${showHidden ? 'No hay VMs registradas' : 'Activa "Mostrar ocultas" para ver todas'}
                </p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = visibleVMs.map(vm => createVMCard(vm)).join('');
    
    // Habilitar drag and drop
    enableDragAndDrop();
}

function createVMCard(vm) {
    const status = vm.latest_status;
    const isCollapsed = collapsedVMs.has(vm.id);
    
    // Lógica de estado
    let statusCircleClass = 'status-circle';
    let lastUpdateFormatted = 'Sin datos';
    let statusText = 'Desconocido';
    const isTrulyStale = vm.is_stale || !status;
    
    if (status) {
        const date = new Date(status.timestamp);
        lastUpdateFormatted = date.toLocaleString('es-AR', { 
            year: 'numeric', month: '2-digit', day: '2-digit', 
            hour: '2-digit', minute: '2-digit', second: '2-digit' 
        });
        
        if (vm.is_stale) {
            statusCircleClass += ' stale-offline';
            statusText = '🔴 Offline';
        } else {
            statusCircleClass += ' online';
            statusText = '🟢 Online';
        }
    } else {
        statusCircleClass += ' stale-offline';
        statusText = '🔴 Sin datos';
    }

    // Sin datos de estado
    if (!status) {
        return `
            <div class="vm-card ${vm.is_visible ? '' : 'hidden'} ${isTrulyStale ? 'stale-card' : ''} ${isCollapsed ? 'collapsed' : ''}" 
                 data-vm-id="${vm.id}" draggable="true">
                <div class="vm-header">
                    <div class="vm-title-group">
                        <span class="drag-handle" title="Arrastrar para reordenar">⋮⋮</span>
                        <h3>${vm.hostname}</h3>
                        <span class="${statusCircleClass}" title="${statusText}"></span>
                    </div>
                    <div class="vm-actions">
                        <button class="icon-btn" onclick="toggleCollapse(${vm.id})" 
                                title="${isCollapsed ? 'Expandir' : 'Contraer'}">
                            ${isCollapsed ? '📂' : '📁'}
                        </button>
                        <button class="icon-btn" onclick="toggleVisibility(${vm.id})" 
                                title="${vm.is_visible ? 'Ocultar VM' : 'Mostrar VM'}">
                            ${vm.is_visible ? '👁️' : '👁️‍🗨️'}
                        </button>
                        <a href="/vm/${vm.id}/" class="icon-btn" title="Ver detalles">
                            📊
                        </a>
                    </div>
                </div>
                <div class="vm-meta-row">
                    <div class="vm-last-update">
                        ⏱️ ${lastUpdateFormatted}
                    </div>
                    <div class="vm-ip">
                        📍 ${vm.ip_address || 'IP no disponible'}
                    </div>
                </div>
                <div class="vm-os">🖥️ ${vm.os_version || 'OS desconocido'}</div>
                <div style="text-align: center; padding: 40px 20px; color: #64748b; font-size: 13px;">
                    <div style="font-size: 48px; opacity: 0.3; margin-bottom: 10px;">⚠️</div>
                    <div style="font-weight: 600; margin-bottom: 4px;">Sin datos disponibles</div>
                    <div style="font-size: 11px;">Esperando primer reporte del sistema</div>
                </div>
                <div class="vm-footer">
                    <span class="updates-badge unknown">
                        ⚪ Sin estado
                    </span>
                </div>
            </div>
        `;
    }
    
    // Con datos de estado
    const cpuColor = getStatusColor(status.cpu_usage);
    const ramColor = getStatusColor(status.ram_percent);
    const diskColor = getStatusColor(status.disk_percent);
    const updateBadge = getUpdateBadge(status.update_count);
    
    return `
        <div class="vm-card ${vm.is_visible ? '' : 'hidden'} ${isTrulyStale ? 'stale-card' : ''} ${isCollapsed ? 'collapsed' : ''}" 
             data-vm-id="${vm.id}" draggable="true">
            <div class="vm-header">
                <div class="vm-title-group">
                    <span class="drag-handle" title="Arrastrar para reordenar">⋮⋮</span>
                    <h3>${vm.hostname}</h3>
                    <span class="${statusCircleClass}" title="${statusText}"></span>
                </div>
                <div class="vm-actions">
                    <button class="icon-btn" onclick="toggleCollapse(${vm.id})" 
                            title="${isCollapsed ? 'Expandir' : 'Contraer'}">
                        ${isCollapsed ? '📂' : '📁'}
                    </button>
                    <button class="icon-btn" onclick="toggleVisibility(${vm.id})" 
                            title="${vm.is_visible ? 'Ocultar VM' : 'Mostrar VM'}">
                        ${vm.is_visible ? '👁️' : '👁️‍🗨️'}
                    </button>
                    <a href="/vm/${vm.id}/" class="icon-btn" title="Ver detalles">
                        📊
                    </a>
                </div>
            </div>
            
            <div class="vm-meta-row">
                <div class="vm-last-update">
                    ⏱️ ${lastUpdateFormatted}
                </div>
                <div class="vm-ip">
                    📍 ${vm.ip_address || 'IP no disponible'}
                </div>
            </div>
            
            <div class="vm-os">🖥️ ${vm.os_version}</div>
            
            <div class="resource-item">
                <div class="resource-header">
                    <span class="resource-label">⚡ CPU</span>
                    <span class="resource-value ${cpuColor}">${status.cpu_usage.toFixed(1)}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${cpuColor}" style="width: ${status.cpu_usage}%"></div>
                </div>
            </div>
            
            <div class="resource-item">
                <div class="resource-header">
                    <span class="resource-label">💾 RAM</span>
                    <span class="resource-value ${ramColor}">${status.ram_percent.toFixed(1)}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${ramColor}" style="width: ${status.ram_percent}%"></div>
                </div>
                <div style="font-size: 10px; color: #64748b; margin-top: 4px; font-family: 'Courier New', monospace;">
                    ${formatSize(status.ram_used)} / ${formatSize(status.ram_total)}
                </div>
            </div>
            
            <div class="resource-item">
                <div class="resource-header">
                    <span class="resource-label">💿 Disco</span>
                    <span class="resource-value ${diskColor}">${status.disk_percent.toFixed(1)}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${diskColor}" style="width: ${status.disk_percent}%"></div>
                </div>
                <div style="font-size: 10px; color: #64748b; margin-top: 4px; font-family: 'Courier New', monospace;">
                    ${formatSize(status.disk_used)} / ${formatSize(status.disk_total)}
                </div>
            </div>
            
            <div class="vm-footer">
                <span class="updates-badge ${updateBadge.class}">
                    ${updateBadge.icon} ${updateBadge.text}
                </span>
                <a href="/vm/${vm.id}/" class="detail-link">
                    Detalles →
                </a>
            </div>
        </div>
    `;
}

function getStatusColor(percentage) {
    if (percentage <= 50) return 'success';
    if (percentage <= 80) return 'warning';
    return 'danger';
}

function getUpdateBadge(count) {
    if (count === -1) {
        return { 
            class: 'unknown', 
            text: 'N/A',
            icon: '⚪'
        };
    }
    if (count === 0) {
        return { 
            class: 'no-updates', 
            text: 'Actualizado',
            icon: '✓'
        };
    }
    return { 
        class: 'has-updates', 
        text: `${count} updates`,
        icon: '⚠️'
    };
}

function formatSize(mb) {
    if (!mb || mb === 0) return '0 MB';
    
    if (mb >= 1024 * 1024) {
        return (mb / (1024 * 1024)).toFixed(1) + ' TB';
    }
    if (mb >= 1024) {
        return (mb / 1024).toFixed(1) + ' GB';
    }
    return mb.toFixed(0) + ' MB';
}

async function toggleVisibility(vmId) {
    try {
        const response = await fetch(`/api/vms/${vmId}/toggle/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            // Animación suave antes de recargar
            const card = document.querySelector(`[data-vm-id="${vmId}"]`);
            if (card) {
                card.style.transition = 'opacity 0.3s ease';
                card.style.opacity = '0';
            }
            
            setTimeout(() => {
                fetchVMs();
            }, 300);
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al cambiar la visibilidad', 'error');
    }
}

function toggleShowHidden() {
    showHidden = document.getElementById('show-hidden').checked;
    
    // Animación de transición
    const grid = document.getElementById('vm-grid');
    grid.style.opacity = '0.5';
    
    setTimeout(() => {
        renderVMs();
        grid.style.opacity = '1';
    }, 150);
}

function updateHeader() {
    const visibleCount = vmsData.filter(vm => vm.is_visible).length;
    const totalCount = vmsData.length;
    const onlineCount = vmsData.filter(vm => !vm.is_stale && vm.latest_status).length;
    
    document.getElementById('vm-count').textContent = 
        `${onlineCount} online · ${visibleCount} visibles · ${totalCount} total`;
    
    const now = new Date();
    document.getElementById('last-update').textContent = 
        `Actualizado: ${now.toLocaleTimeString('es-AR')}`;
}

function refreshData() {
    const grid = document.getElementById('vm-grid');
    grid.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p style="color: #94a3b8;">Actualizando datos...</p>
        </div>
    `;
    fetchVMs();
}

function showNotification(message, type = 'info') {
    // Crear notificación toast (opcional)
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'error' ? '#ef4444' : '#60a5fa'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 9999;
        font-size: 14px;
        font-weight: 600;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Auto-refresh cada 30 segundos con indicador visual
let refreshInterval;
function startAutoRefresh() {
    refreshInterval = setInterval(() => {
        fetchVMs();
        
        // Pequeño indicador visual de actualización
        const header = document.querySelector('.header');
        header.style.borderColor = 'rgba(96, 165, 250, 0.5)';
        setTimeout(() => {
            header.style.borderColor = 'rgba(96, 165, 250, 0.1)';
        }, 500);
    }, 30000);
}

// Detener auto-refresh cuando la página no está visible
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        clearInterval(refreshInterval);
    } else {
        fetchVMs();
        startAutoRefresh();
    }
});

// Cargar datos al iniciar
loadPreferences();
fetchVMs();
startAutoRefresh();

// Agregar estilos para animaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Función para contraer/expandir una VM individual
function toggleCollapse(vmId) {
    if (collapsedVMs.has(vmId)) {
        collapsedVMs.delete(vmId);
    } else {
        collapsedVMs.add(vmId);
    }
    
    savePreferences();
    renderVMs();
}

// Función para contraer todas las VMs
function collapseAll() {
    vmsData.forEach(vm => collapsedVMs.add(vm.id));
    savePreferences();
    renderVMs();
}

// Función para expandir todas las VMs
function expandAll() {
    collapsedVMs.clear();
    savePreferences();
    renderVMs();
}

// Funciones de Drag and Drop
function enableDragAndDrop() {
    const cards = document.querySelectorAll('.vm-card');
    
    cards.forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('drop', handleDrop);
        card.addEventListener('dragend', handleDragEnd);
        card.addEventListener('dragenter', handleDragEnter);
        card.addEventListener('dragleave', handleDragLeave);
    });
}

let draggedElement = null;

function handleDragStart(e) {
    draggedElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    if (this !== draggedElement) {
        this.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    if (draggedElement !== this) {
        // Obtener IDs
        const draggedId = parseInt(draggedElement.getAttribute('data-vm-id'));
        const targetId = parseInt(this.getAttribute('data-vm-id'));
        
        // Encontrar índices en el array de datos
        const draggedIndex = vmsData.findIndex(vm => vm.id === draggedId);
        const targetIndex = vmsData.findIndex(vm => vm.id === targetId);
        
        // Reordenar array
        const [removed] = vmsData.splice(draggedIndex, 1);
        vmsData.splice(targetIndex, 0, removed);
        
        // Actualizar orden guardado
        vmOrder = vmsData.map(vm => vm.id);
        savePreferences();
        
        // Re-renderizar
        renderVMs();
    }
    
    this.classList.remove('drag-over');
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    
    // Limpiar todas las clases drag-over
    document.querySelectorAll('.vm-card').forEach(card => {
        card.classList.remove('drag-over');
    });
}