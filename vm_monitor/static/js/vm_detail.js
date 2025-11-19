let cpuChart = null;
let ramChart = null;

async function loadVMData() {
    try {
        // Cargar datos básicos
        const vmResponse = await fetch(`/api/vms/`);
        const vms = await vmResponse.json();
        const vm = vms.find(v => v.id === VM_ID);
        
        if (vm && vm.latest_status) {
            updatePartitions(vm.latest_status.partitions);
        }
        
        // Cargar estadísticas para gráficos
        await loadCharts(24);
        
        // Cargar historial
        await loadHistory(24);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

async function loadCharts(hours) {
    try {
        const response = await fetch(`/api/vms/${VM_ID}/stats/?hours=${hours}`);
        const data = await response.json();
        
        if (data.length === 0) {
            console.log('No hay datos para los gráficos');
            return;
        }
        
        const labels = data.map(d => {
            const date = new Date(d.timestamp);
            return date.toLocaleString('es-AR', { 
                day: '2-digit', 
                month: '2-digit', 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        });
        
        const cpuData = data.map(d => d.cpu_usage);
        const ramData = data.map(d => d.ram_percent);
        
        // Destruir gráficos existentes
        if (cpuChart) cpuChart.destroy();
        if (ramChart) ramChart.destroy();
        
        // Crear gráfico de CPU
        const cpuCtx = document.getElementById('cpu-chart').getContext('2d');
        cpuChart = new Chart(cpuCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Uso de CPU (%)',
                    data: cpuData,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
        
        // Crear gráfico de RAM
        const ramCtx = document.getElementById('ram-chart').getContext('2d');
        ramChart = new Chart(ramCtx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Uso de RAM (%)',
                    data: ramData,
                    borderColor: '#764ba2',
                    backgroundColor: 'rgba(118, 75, 162, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('Error al cargar gráficos:', error);
    }
}

async function loadHistory(hours) {
    const container = document.getElementById('history-container');
    container.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Cargando historial...</p>
        </div>
    `;
    
    // Actualizar botones activos
    document.querySelectorAll('.time-filters .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event?.target?.classList.add('active');
    
    try {
        const response = await fetch(`/api/vms/${VM_ID}/history/?hours=${hours}`);
        const history = await response.json();
        
        if (history.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999;">No hay datos en este período</p>';
            return;
        }
        
        const rows = history.map(h => {
            const date = new Date(h.timestamp);
            const cpuColor = getStatusColor(h.cpu_usage);
            const ramColor = getStatusColor(h.ram_percent);
            const diskColor = getStatusColor(h.disk_percent);
            
            return `
                <tr>
                    <td>${date.toLocaleString('es-AR')}</td>
                    <td><span class="resource-value ${cpuColor}">${h.cpu_usage}%</span></td>
                    <td><span class="resource-value ${ramColor}">${h.ram_percent}%</span></td>
                    <td><span class="resource-value ${diskColor}">${h.disk_percent}%</span></td>
                    <td>${h.update_count >= 0 ? h.update_count : 'N/A'}</td>
                </tr>
            `;
        }).join('');
        
        container.innerHTML = `
            <div style="overflow-x: auto;">
                <table class="history-table">
                    <thead>
                        <tr>
                            <th>Fecha/Hora</th>
                            <th>CPU</th>
                            <th>RAM</th>
                            <th>Disco</th>
                            <th>Actualizaciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;
        
        // También actualizar gráficos
        await loadCharts(hours);
        
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<p style="text-align: center; color: #dc3545;">Error al cargar el historial</p>';
    }
}

function updatePartitions(partitions) {
    const container = document.getElementById('partitions-container');
    
    if (!partitions || partitions.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999;">No hay información de particiones</p>';
        return;
    }
    
    container.innerHTML = partitions.map(p => {
        const color = getStatusColor(p.used_percent);
        
        return `
            <div class="partition-card">
                <div class="partition-header">
                    <span class="mountpoint">💿 ${p.mountpoint}</span>
                    <span class="partition-size">${formatSize(p.used_mb)} / ${formatSize(p.total_mb)} MB</span>
                </div>
                <div class="resource-item">
                    <div class="resource-header">
                        <span class="resource-label">Uso</span>
                        <span class="resource-value ${color}">${p.used_percent}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${color}" style="width: ${p.used_percent}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function getStatusColor(percentage) {
    if (percentage <= 50) return 'success';
    if (percentage <= 80) return 'warning';
    return 'danger';
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

function refreshData() {
    loadVMData();
}

// Auto-refresh cada 30 segundos
setInterval(loadVMData, 30000);

// Cargar datos al iniciar
loadVMData();