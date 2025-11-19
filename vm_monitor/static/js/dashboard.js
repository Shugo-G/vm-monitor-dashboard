let vmsData = [];
let showHidden = false;

async function fetchVMs() {
    try {
        const response = await fetch('/api/vms/');
        if (!response.ok) throw new Error('Error al cargar datos');
        vmsData = await response.json();
        renderVMs();
        updateHeader();
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('vm-grid').innerHTML = `
            <div class="loading">
                <p style="color: #dc3545;">❌ Error al cargar las VMs</p>
                <button class="btn btn-primary" onclick="refreshData()">Reintentar</button>
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
                <p>No hay VMs para mostrar</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = visibleVMs.map(vm => createVMCard(vm)).join('');
}

function createVMCard(vm) {
    const status = vm.latest_status;
    
    // --- LÓGICA DE ESTADO Y FECHA ---
    let statusCircleClass = 'status-circle';
    let lastUpdateFormatted = 'Nunca actualizado';
    let statusText = 'Sin datos';
    const isTrulyStale = vm.is_stale || !status; // Determina si la tarjeta debe tener borde rojo
    
    if (status) {
        const date = new Date(status.timestamp);
        // Formato de fecha y hora completa
        lastUpdateFormatted = date.toLocaleString('es-AR', { 
            year: 'numeric', month: '2-digit', day: '2-digit', 
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false // <-- ¡Esto fuerza el formato de 24 horas!
        });
        
        if (vm.is_stale) {
            statusCircleClass += ' stale-offline'; // Rojo
            statusText = 'Desactualizado (más de 5 min)';
        } else {
            statusCircleClass += ' online'; // Verde
            statusText = 'Online';
        }
    } else {
        // No hay status data, por lo que es stale
        statusCircleClass += ' stale-offline'; // Rojo
        statusText = 'Sin datos';
    }
    // ---------------------------------

    // CASO 1: Sin datos de estado
    if (!status) {
        return `
            <div class="vm-card ${vm.is_visible ? '' : 'hidden'} ${isTrulyStale ? 'stale-card' : ''}">
                <div class="vm-header">
                    <div class="vm-title-group">
                        <h3>${vm.hostname}</h3>
                        <span class="${statusCircleClass}" title="${statusText}"></span>
                    </div>
                    <div class="vm-actions">
                        <button class="icon-btn" onclick="toggleVisibility(${vm.id})" title="${vm.is_visible ? 'Ocultar' : 'Mostrar'}">
                            ${vm.is_visible ? '👁️' : '👁️‍🗨️'}
                        </button>
                    </div>
                    <div class="vm-meta-row">
                        <span class="vm-ip">📍 ${vm.ip_address || 'IP no disponible'}</span>
                        <div class="vm-last-update">
                            Última actualización: ${lastUpdateFormatted}
                        </div>
                    </div>
                </div>
                <div class="vm-os">🖥️ ${vm.os_version}</div>
                <p style="text-align: center; color: #999; padding: 40px 0;">
                    Sin datos disponibles
                </p>
                <div class="vm-footer">
                    <span class="updates-badge unknown">
                        Sin datos de estado
                    </span>
                    <a href="/vm/${vm.id}/" class="detail-link">Ver detalles →</a>
                </div>
            </div>
        `;
    }
    
    // CASO 2: Con datos de estado
    const cpuColor = getStatusColor(status.cpu_usage);
    const ramColor = getStatusColor(status.ram_percent);
    const diskColor = getStatusColor(status.disk_percent);
    
    const updateBadge = getUpdateBadge(status.update_count);
    
    return `
        <div class="vm-card ${vm.is_visible ? '' : 'hidden'} ${isTrulyStale ? 'stale-card' : ''}">
            <div class="vm-header">
                <div class="vm-title-group">
                    <h3>${vm.hostname}</h3>
                    <span class="${statusCircleClass}" title="${statusText}"></span>
                </div>
                <div class="vm-actions">
                    <button class="icon-btn" onclick="toggleVisibility(${vm.id})" title="${vm.is_visible ? 'Ocultar' : 'Mostrar'}">
                        ${vm.is_visible ? '👁️' : '👁️‍🗨️'}
                    </button>
                </div>
                
                <div class="vm-meta-row">
                    <div class="vm-last-update">
                        Última actualización: ${lastUpdateFormatted}
                    </div>
                    <span class="vm-ip">📍 ${vm.ip_address || 'IP no disponible'}</span>
                </div>
            </div>
            
            <div class="vm-os">🖥️ ${vm.os_version}</div>
            
            <div class="resource-item">
                <div class="resource-header">
                    <span class="resource-label">CPU</span>
                    <span class="resource-value ${cpuColor}">${status.cpu_usage}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${cpuColor}" style="width: ${status.cpu_usage}%"></div>
                </div>
            </div>
            
            <div class="resource-item">
                <div class="resource-header">
                    <span class="resource-label">RAM</span>
                    <span class="resource-value ${ramColor}">${status.ram_percent}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${ramColor}" style="width: ${status.ram_percent}%"></div>
                </div>
                <div style="font-size: 12px; color: #888; margin-top: 5px;">
                    ${formatSize(status.ram_used)} / ${formatSize(status.ram_total)} MB
                </div>
            </div>
            
            <div class="resource-item">
                <div class="resource-header">
                    <span class="resource-label">Disco</span>
                    <span class="resource-value ${diskColor}">${status.disk_percent}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill ${diskColor}" style="width: ${status.disk_percent}%"></div>
                </div>
                <div style="font-size: 12px; color: #888; margin-top: 5px;">
                    ${formatSize(status.disk_used)} / ${formatSize(status.disk_total)} MB
                </div>
            </div>
            
            <div class="vm-footer">
                <span class="updates-badge ${updateBadge.class}">
                    ${updateBadge.text}
                </span>
                <a href="/vm/${vm.id}/" class="detail-link">Ver detalles →</a>
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
        return { class: 'unknown', text: 'Actualizaciones: N/A' };
    }
    if (count === 0) {
        return { class: 'no-updates', text: '✓ Sin actualizaciones' };
    }
    return { class: 'has-updates', text: `⚠️ ${count} actualizaciones` };
}

function formatSize(mb) {
    if (mb >= 1024 * 1024) {
        return (mb / (1024 * 1024)).toFixed(2) + ' TB';
    }
    if (mb >= 1024) {
        return (mb / 1024).toFixed(2) + ' GB';
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
            await fetchVMs();
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cambiar la visibilidad');
    }
}

function toggleShowHidden() {
    showHidden = document.getElementById('show-hidden').checked;
    renderVMs();
}

function updateHeader() {
    const visibleCount = vmsData.filter(vm => vm.is_visible).length;
    const totalCount = vmsData.length;
    
    document.getElementById('vm-count').textContent = 
        `${visibleCount} VMs visibles de ${totalCount} totales`;
    
    document.getElementById('last-update').textContent = 
        `Última actualización: ${new Date().toLocaleTimeString('es-AR')}`;
}

function refreshData() {
    document.getElementById('vm-grid').innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Actualizando datos...</p>
        </div>
    `;
    fetchVMs();
}

function initializeTheme() {
    // Obtiene el tema guardado en LocalStorage (por defecto 'light')
    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);
}

/**
 * 2. Aplica el tema (light o dark) actualizando los archivos CSS y el botón.
 * @param {string} theme - 'light' o 'dark'
 */
function applyTheme(theme) {
    const lightLink = document.getElementById('theme-light');
    const darkLink = document.getElementById('theme-dark');
    const toggleButton = document.getElementById('theme-toggle');

    if (!lightLink || !darkLink || !toggleButton) return;

    if (theme === 'dark') {
        lightLink.disabled = true;
        darkLink.disabled = false;
        document.body.classList.add('dark-mode'); 
        toggleButton.innerHTML = '☀️ Cambiar a Claro';
    } else {
        lightLink.disabled = false;
        darkLink.disabled = true;
        document.body.classList.remove('dark-mode');
        toggleButton.innerHTML = '🌙 Cambiar a Oscuro';
    }
    
    // Guarda la preferencia
    localStorage.setItem('theme', theme);
}

/**
 * 3. Alterna entre los temas al hacer click en el botón.
 */
function toggleTheme() {
    const currentTheme = localStorage.getItem('theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(newTheme);
}


// --- Ejecución Inicial ---
// Llama a esta función al inicio de tu script para cargar la preferencia guardada.
document.addEventListener('DOMContentLoaded', initializeTheme);

// Auto-refresh cada 30 segundos
setInterval(fetchVMs, 30000);

// Cargar datos al iniciar
fetchVMs();
