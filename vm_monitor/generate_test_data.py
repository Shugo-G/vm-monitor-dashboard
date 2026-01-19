import os
import django
import random
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vm_monitor.settings')
django.setup()

from monitor.models import VirtualMachine, VMStatus, Partition
from django.utils import timezone

def generate_test_vms():
    os_versions = [
        'Ubuntu 20.04 LTS',
        'Ubuntu 22.04 LTS',
        'Debian 11',
        'Debian 12',
        'CentOS 7',
        'Rocky Linux 8',
        'Fedora 38',
        'AlmaLinux 9'
    ]
    
    for i in range(1, 9):
        hostname = f'test-vm-{i:02d}'
        ip = f'192.168.1.{100 + i}'
        
        vm, created = VirtualMachine.objects.get_or_create(
            hostname=hostname,
            defaults={
                'ip_address': ip,
                'os_version': random.choice(os_versions),
                'webmin_url': f'https://{ip}:10000',
                'is_visible': True
            }
        )
        
        if created:
            print(f'✓ Creada VM: {hostname}')
        else:
            print(f'○ VM ya existe: {hostname}')
        
        status = VMStatus.objects.create(
            vm=vm,
            timestamp=timezone.now(),
            cpu_usage=round(random.uniform(5, 95), 2),
            ram_total=round(random.uniform(2048, 16384), 2),
            ram_used=0,
            ram_percent=round(random.uniform(20, 90), 2),
            disk_total=round(random.uniform(20480, 102400), 2),
            disk_used=0,
            disk_percent=round(random.uniform(30, 85), 2),
            update_count=random.randint(1, 100)
        )
        
        status.ram_used = round(status.ram_total * status.ram_percent / 100, 2)
        status.disk_used = round(status.disk_total * status.disk_percent / 100, 2)
        status.save()
        
        num_partitions = random.randint(2, 5)
        mountpoints = ['/', '/home', '/var', '/tmp', '/opt', '/boot']
        selected_mounts = random.sample(mountpoints, num_partitions)
        
        for mount in selected_mounts:
            total = round(random.uniform(5120, 51200), 2)
            percent = round(random.uniform(20, 85), 2)
            used = round(total * percent / 100, 2)
            
            Partition.objects.create(
                status=status,
                mountpoint=mount,
                total_mb=total,
                used_mb=used,
                used_percent=percent
            )
        
        print(f'  └─ Estado y {num_partitions} particiones creadas')

if __name__ == '__main__':
    print('Generando 8 VMs de prueba...\n')
    generate_test_vms()
    print('\n✓ Proceso completado')