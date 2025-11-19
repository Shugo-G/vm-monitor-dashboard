# 🖥️ VM Monitoring Dashboard

Sistema de monitoreo en tiempo real para máquinas virtuales y servidores, desarrollado con Django y REST Framework.

![Dashboard Preview](https://via.placeholder.com/800x400/0a0e27/60a5fa?text=VM+Monitoring+Dashboard)

## ✨ Características

- 📊 **Dashboard en tiempo real** con auto-refresh cada 30 segundos
- 🎨 **Interfaz moderna** con tema oscuro tipo "cyberpunk/tech"
- 📈 **Visualización de recursos**: CPU, RAM y Disco con indicadores de color
- 🔄 **Auto-registro**: Las VMs se agregan automáticamente al enviar datos
- 👁️ **Control de visibilidad**: Oculta/muestra VMs individualmente
- 📉 **Historial detallado** con gráficos de CPU y RAM
- 💾 **Información de particiones** de cada servidor
- ⚡ **Estado en tiempo real**: Indicador visual de VMs online/offline
- 🔔 **Alertas visuales**: Bordes rojos para VMs sin conexión (>5 min)
- 📱 **Diseño responsive** para móviles y tablets

## 🎯 Indicadores de Estado

| Color | Rango | Estado |
|-------|-------|--------|
| 🟢 Verde | 0-50% | Óptimo |
| 🟡 Amarillo | 51-80% | Advertencia |
| 🔴 Rojo | 81-100% | Crítico |

## 🚀 Instalación Rápida

### Requisitos

- Python 3.8+
- Django 4.2+
- PostgreSQL o MySQL (recomendado para producción)

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/vm-monitoring.git
cd vm-monitoring
```

### 2. Crear entorno virtual

```bash
python3 -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
```

### 3. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 4. Configurar base de datos

Edita `vm_monitoring/settings.py`:

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'vm_monitoring',
        'USER': 'tu_usuario',
        'PASSWORD': 'tu_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

O usa SQLite para desarrollo rápido (ya configurado por defecto).

### 5. Crear base de datos y superusuario

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
```

### 6. Ejecutar servidor

```bash
python manage.py runserver 0.0.0.0:8000
```

Accede a: `http://localhost:8000`

## 💻 Instalación del Cliente (en cada VM)

### 1. Instalar dependencias en la VM

```bash
sudo apt update
sudo apt install python3 python3-pip
pip3 install psutil requests
```

### 2. Descargar y configurar el script

```bash
wget https://raw.githubusercontent.com/tu-usuario/vm-monitoring/main/client/vm_reporter.py
chmod +x vm_reporter.py
```

Edita `vm_reporter.py` y cambia la URL del servidor:

```python
API_URL = "http://tu-servidor:8000/api/status/"
```

### 3. Probar manualmente

```bash
python3 vm_reporter.py
```

### 4. Automatizar con Cron

```bash
sudo crontab -e
```

Agregar para ejecutar cada 2 minutos:

```cron
*/2 * * * * /usr/bin/python3 /ruta/al/vm_reporter.py >> /var/log/vm_reporter.log 2>&1
```

## 📁 Estructura del Proyecto

```
vm-monitoring/
├── vm_monitoring/          # Configuración principal de Django
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── monitor/                # Aplicación de monitoreo
│   ├── models.py          # Modelos: VirtualMachine, VMStatus, Partition
│   ├── views.py           # Vistas y APIs
│   ├── serializers.py     # Serializadores REST
│   ├── urls.py            # URLs de la app
│   ├── admin.py           # Panel de administración
│   └── templates/
│       └── monitor/
│           ├── dashboard.html
│           └── vm_detail.html
├── static/                 # Archivos estáticos
│   ├── css/
│   │   └── dashboard.css
│   └── js/
│       └── dashboard.js
├── client/                 # Script cliente para VMs
│   └── vm_reporter.py
├── requirements.txt
├── .gitignore
└── README.md
```

## 🔌 API Endpoints

### Recibir estado de VMs (POST)
```
POST /api/status/
Content-Type: application/json

[
  {
    "hostname": "servidor-01",
    "ip_address": "192.168.1.100",
    "os_version": "Ubuntu 22.04 LTS",
    "cpu_usage": 45.2,
    "ram_total": 16000,
    "ram_used": 8000,
    "ram_percent": 50.0,
    "disk_total": 500000,
    "disk_used": 250000,
    "disk_percent": 50.0,
    "update_count": 5,
    "timestamp": "2025-01-15T10:30:00-03:00",
    "webmin": "https://servidor-01:10000",
    "partitions": [...]
  }
]
```

### Listar todas las VMs (GET)
```
GET /api/vms/
```

### Historial de una VM (GET)
```
GET /api/vms/{vm_id}/history/?hours=24
```

### Toggle visibilidad (PATCH)
```
PATCH /api/vms/{vm_id}/toggle/
```

### Estadísticas para gráficos (GET)
```
GET /api/vms/{vm_id}/stats/?hours=24
```

## 🛡️ Seguridad en Producción

### 1. Variables de entorno

Crea un archivo `.env`:

```bash
SECRET_KEY=tu-secret-key-aqui
DEBUG=False
ALLOWED_HOSTS=tudominio.com,www.tudominio.com
DATABASE_URL=postgresql://user:pass@localhost/dbname
```

### 2. Configurar HTTPS con Nginx

```nginx
server {
    listen 443 ssl;
    server_name monitoring.tudominio.com;
    
    ssl_certificate /etc/letsencrypt/live/tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tudominio.com/privkey.pem;
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /static/ {
        alias /ruta/a/staticfiles/;
    }
}
```

### 3. Autenticación API (Opcional)

Implementa tokens de autenticación para el endpoint `/api/status/`.

## 🧹 Mantenimiento

### Limpiar datos antiguos

```bash
python manage.py cleanup_old_data --days=30
```

Automatizar con cron (diariamente a las 2 AM):

```cron
0 2 * * * cd /ruta/a/vm_monitoring && /ruta/a/venv/bin/python manage.py cleanup_old_data --days=30
```

### Backup de base de datos

```bash
# PostgreSQL
pg_dump vm_monitoring > backup_$(date +%Y%m%d).sql

# SQLite
sqlite3 db.sqlite3 ".backup backup_$(date +%Y%m%d).db"
```

## 📸 Screenshots

### Dashboard Principal
![Dashboard](docs/screenshots/dashboard.png)

### Vista de Historial
![History](docs/screenshots/history.png)

### Vista Detallada de VM
![Detail](docs/screenshots/detail.png)

## 📝 To-Do

- [ ] Autenticación de usuarios
- [ ] Notificaciones por email/Slack
- [ ] Exportar datos a CSV/Excel
- [ ] Dashboard de comparación entre VMs
- [ ] Alertas configurables por umbral
- [ ] Soporte para Docker containers
- [ ] Multi-tenancy
- [ ] Dark/Light theme toggle
- [ ] Gráficos de red y I/O

## 👨‍💻 Autor
**Hugo Giovanetti**
- GitHub: [@Shugo-G](https://github.com/Shugo-G)
- Email: hugo_giovanetti@hotmail.com.com

## 🙏 Agradecimientos

- Django Framework
- Django REST Framework
- Chart.js para visualizaciones

---

## 💬 Soporte

Para reportar bugs o solicitar features, por favor abre un [issue](https://github.com/tu-usuario/vm-monitoring/issues).