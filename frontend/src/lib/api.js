const BASE_URL = '';

export async function getVMs() {
    const response = await fetch(`${BASE_URL}/api/vms/`);
    return await response.json();
}

export async function getVMHistory(vmId, hours = 24) {
    const response = await fetch(`${BASE_URL}/api/vms/${vmId}/history/?hours=${hours}`);
    return await response.json();
}

export async function toggleVMVisibility(vmId) {
    const response = await fetch(`${BASE_URL}/api/vms/${vmId}/toggle/`, {
        method: 'PATCH'
    });
    return await response.json();
}

export async function getVMStats(vmId, hours = 24) {
    const response = await fetch(`${BASE_URL}/api/vms/${vmId}/stats/?hours=${hours}`);
    return await response.json();
}

export async function bulkToggleVMVisibility(vmIds, isVisible) {
    const response = await fetch(`${BASE_URL}/api/vms/bulk-visibility/`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ vm_ids: vmIds, is_visible: isVisible })
    });
    return await response.json();
}
