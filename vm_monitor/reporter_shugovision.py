#!/usr/bin/env python3
"""
VM Monitoring Client
Envía estadísticas del sistema al servidor de monitoreo
"""

import psutil
import socket
import platform
import json
import requests
from datetime import datetime
import sys
import subprocess

# Configuración
API_URL = "http://172.20.49.151:8000/api/status/"  # Cambiar por tu URL
#WEBMIN_PORT = 10000  # Puerto de Webmin si está instalado


def get_hostname():
    """Obtiene el hostname del sistema"""
    return socket.gethostname()


def get_ip_address():
    """Obtiene la dirección IP principal del sistema"""
    try:
        # Crear un socket para conectarse a un servidor externo
        # No se establece una conexión real, solo se usa para obtener la IP local
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip_address = s.getsockname()[0]
        s.close()
        return ip_address
    except Exception:
        # Si falla, intentar obtener la IP del hostname
        try:
            return socket.gethostbyname(socket.gethostname())
        except:
            return None


def get_os_version():
    """Obtiene la versión del sistema operativo"""
    try:
        if platform.system() == "Linux":
            with open('/etc/os-release', 'r') as f:
                lines = f.readlines()
                for line in lines:
                    if line.startswith('PRETTY_NAME='):
                        return line.split('=')[1].strip().strip('"')
        return f"{platform.system()} {platform.release()}"
    except:
        return f"{platform.system()} {platform.release()}"


def get_cpu_usage():
    """Obtiene el porcentaje de uso de CPU"""
    return round(psutil.cpu_percent(interval=1), 1)


def get_ram_info():
    """Obtiene información de memoria RAM"""
    mem = psutil.virtual_memory()
    return {
        'total': round(mem.total / (1024 * 1024), 2),  # MB
        'used': round(mem.used / (1024 * 1024), 2),    # MB
        'percent': round(mem.percent, 1)
    }


def get_disk_info():
    """Obtiene información de disco total y particiones"""
    partitions_info = []
    total_disk = 0
    used_disk = 0
    
    for partition in psutil.disk_partitions(all=False):
        if 'loop' in partition.device or partition.fstype in ['tmpfs', 'devtmpfs']:
            continue  # Ignorar particiones virtuales o temporales
        
        try:
            usage = psutil.disk_usage(partition.mountpoint)
            
            partition_data = {
                'mountpoint': partition.mountpoint,
                'total_mb': round(usage.total / (1024 * 1024), 2),
                'used_mb': round(usage.used / (1024 * 1024), 2),
                'used_percent': round(usage.percent, 1)
            }
            partitions_info.append(partition_data)
            
            total_disk += usage.total
            used_disk += usage.used
            
        except (PermissionError, OSError):
            continue
    
    total_disk_mb = round(total_disk / (1024 * 1024), 2)
    used_disk_mb = round(used_disk / (1024 * 1024), 2)
    disk_percent = round((used_disk / total_disk * 100), 2) if total_disk > 0 else 0
    
    return {
        'total': total_disk_mb,
        'used': used_disk_mb,
        'percent': disk_percent,
        'partitions': partitions_info
    }


def get_update_count():
    """Obtiene la cantidad de actualizaciones pendientes (solo Ubuntu/Debian)"""
    try:
        if platform.system() == "Linux":
            # Para sistemas basados en Debian/Ubuntu
            result = subprocess.run(
                ['apt', 'list', '--upgradable'],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                # Contar líneas menos la primera (encabezado)
                lines = result.stdout.strip().split('\n')
                return len(lines) - 1 if len(lines) > 1 else 0
            
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    
    return -1  # -1 indica que no se pudo obtener la información


def get_webmin_url():
    """Genera la URL de Webmin si está disponible"""
    hostname = get_hostname()
    # Intentar obtener el FQDN
#    try:
#        fqdn = socket.getfqdn()
#        if fqdn and fqdn != hostname:
#            hostname = fqdn
#    except:
#        pass
    
    return f"https://{hostname}.ushuaia.gob.ar:10000"


def collect_stats():
    """Recopila todas las estadísticas del sistema"""
    ram_info = get_ram_info()
    disk_info = get_disk_info()
    
    data = {
        'hostname': get_hostname(),
        'ip_address': get_ip_address(),  # ← NUEVO CAMPO
        'os_version': get_os_version(),
        'cpu_usage': get_cpu_usage(),
        'ram_total': ram_info['total'],
        'ram_used': ram_info['used'],
        'ram_percent': ram_info['percent'],
        'disk_total': disk_info['total'],
        'disk_used': disk_info['used'],
        'disk_percent': disk_info['percent'],
        'update_count': get_update_count(),
        'timestamp': datetime.now().astimezone().isoformat(),
        'webmin': get_webmin_url(),
        'partitions': disk_info['partitions']
    }
    
    return data


def send_to_server(data):
    """Envía los datos al servidor"""
    try:
        # Envolver en un array para cumplir con el formato esperado
        payload = [data]
        
        response = requests.post(
            API_URL,
            json=payload,
            timeout=10,
            verify=False  # Cambiar a True en producción con certificados válidos
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✓ Datos enviados correctamente: {result.get('message', 'OK')}")
            return True
        else:
            print(f"✗ Error del servidor: {response.status_code} - {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"✗ Error de conexión: {str(e)}")
        return False


def main():
    """Función principal"""
    print("=" * 60)
    print("VM Monitoring Client")
    print("=" * 60)
    
    # Recopilar estadísticas
    print("Recopilando estadísticas del sistema...")
    stats = collect_stats()
    
    # Mostrar resumen
    print(f"\nHostname: {stats['hostname']}")
    print(f"IP: {stats['ip_address'] or 'No disponible'}")  # ← NUEVO
    print(f"OS: {stats['os_version']}")
    print(f"CPU: {stats['cpu_usage']}%")
    print(f"RAM: {stats['ram_percent']}% ({stats['ram_used']:.0f}/{stats['ram_total']:.0f} MB)")
    print(f"Disco: {stats['disk_percent']}% ({stats['disk_used']:.0f}/{stats['disk_total']:.0f} MB)")
    print(f"Actualizaciones pendientes: {stats['update_count'] if stats['update_count'] >= 0 else 'N/A'}")
    print(f"Particiones: {len(stats['partitions'])}")
    
    # Enviar al servidor
    print(f"\nEnviando datos a {API_URL}...")
    success = send_to_server(stats)
    
    if success:
        print("\n✓ Monitoreo completado exitosamente")
        sys.exit(0)
    else:
        print("\n✗ Error al enviar datos")
        sys.exit(1)


if __name__ == "__main__":
    main()
