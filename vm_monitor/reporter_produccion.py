#!/usr/bin/env python3
"""
VM Monitoring Client — Producción
Envía estadísticas del sistema a https://shugovision.dposs.gob.ar
"""

import psutil
import socket
import platform
import requests
from datetime import datetime
import sys
import subprocess
import uuid
from pathlib import Path

API_URL = "https://shugovision.dposs.gob.ar/api/status/"


def get_machine_id():
    """Obtiene un identificador estable de la máquina."""
    if platform.system() == 'Linux':
        try:
            return Path('/etc/machine-id').read_text().strip()
        except OSError:
            pass
    elif platform.system() == 'Windows':
        try:
            import winreg
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE,
                                 r'SOFTWARE\Microsoft\Cryptography')
            value, _ = winreg.QueryValueEx(key, 'MachineGuid')
            winreg.CloseKey(key)
            return value
        except Exception:
            pass
    # Fallback: UUID persistido en un archivo local junto al script
    id_file = Path(__file__).parent / '.machine-id'
    try:
        if id_file.exists():
            return id_file.read_text().strip()
        new_id = str(uuid.uuid4())
        id_file.write_text(new_id)
        return new_id
    except OSError:
        return None


def get_hostname():
    return socket.gethostname()


def get_ip_address():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return None


def get_os_version():
    try:
        if platform.system() == "Linux":
            with open('/etc/os-release', 'r') as f:
                for line in f:
                    if line.startswith('PRETTY_NAME='):
                        return line.split('=')[1].strip().strip('"')
        return f"{platform.system()} {platform.release()}"
    except Exception:
        return f"{platform.system()} {platform.release()}"


def get_cpu_usage():
    return round(psutil.cpu_percent(interval=1), 1)


def get_ram_info():
    mem = psutil.virtual_memory()
    return {
        'total': round(mem.total / (1024 * 1024), 2),
        'used': round(mem.used / (1024 * 1024), 2),
        'percent': round(mem.percent, 1),
    }


def get_disk_info():
    partitions_info = []
    total_disk = used_disk = 0
    for partition in psutil.disk_partitions(all=False):
        if 'loop' in partition.device or partition.fstype in ['tmpfs', 'devtmpfs']:
            continue
        try:
            usage = psutil.disk_usage(partition.mountpoint)
            partitions_info.append({
                'mountpoint': partition.mountpoint,
                'total_mb': round(usage.total / (1024 * 1024), 2),
                'used_mb': round(usage.used / (1024 * 1024), 2),
                'used_percent': round(usage.percent, 1),
            })
            total_disk += usage.total
            used_disk += usage.used
        except (PermissionError, OSError):
            continue
    return {
        'total': round(total_disk / (1024 * 1024), 2),
        'used': round(used_disk / (1024 * 1024), 2),
        'percent': round(used_disk / total_disk * 100, 2) if total_disk > 0 else 0,
        'partitions': partitions_info,
    }


def get_update_count():
    try:
        if platform.system() == "Linux":
            result = subprocess.run(
                ['apt', 'list', '--upgradable'],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                return len(lines) - 1 if len(lines) > 1 else 0
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    return -1


def collect_stats():
    ram = get_ram_info()
    disk = get_disk_info()
    return {
        'machine_id': get_machine_id(),
        'hostname': get_hostname(),
        'ip_address': get_ip_address(),
        'os_version': get_os_version(),
        'cpu_usage': get_cpu_usage(),
        'ram_total': ram['total'],
        'ram_used': ram['used'],
        'ram_percent': ram['percent'],
        'disk_total': disk['total'],
        'disk_used': disk['used'],
        'disk_percent': disk['percent'],
        'update_count': get_update_count(),
        'timestamp': datetime.now().astimezone().isoformat(),
        'partitions': disk['partitions'],
    }


def send_to_server(data):
    try:
        response = requests.post(
            API_URL,
            json=[data],
            timeout=15,
            verify=True,   # Certificado SSL válido (Let's Encrypt vía NPM)
        )
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Datos enviados: {result.get('message', 'OK')}")
            return True
        else:
            print(f"✗ Error del servidor: {response.status_code} - {response.text}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"✗ Error de conexión: {e}")
        return False


def main():
    print("=" * 60)
    print("VM Monitoring Client — Producción")
    print("=" * 60)

    print("Recopilando estadísticas del sistema...")
    stats = collect_stats()

    print(f"\nHostname:  {stats['hostname']}")
    print(f"IP:        {stats['ip_address'] or 'No disponible'}")
    print(f"OS:        {stats['os_version']}")
    print(f"CPU:       {stats['cpu_usage']}%")
    print(f"RAM:       {stats['ram_percent']}% ({stats['ram_used']:.0f}/{stats['ram_total']:.0f} MB)")
    print(f"Disco:     {stats['disk_percent']}% ({stats['disk_used']:.0f}/{stats['disk_total']:.0f} MB)")
    print(f"Upd:       {stats['update_count'] if stats['update_count'] >= 0 else 'N/A'}")
    print(f"Particiones: {len(stats['partitions'])}")

    print(f"\nEnviando datos a {API_URL}...")
    success = send_to_server(stats)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
