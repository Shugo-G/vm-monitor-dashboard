# 🖥️ ShugoVision - Dashboard de Monitoreo de VMs

Sistema de monitoreo en tiempo real para máquinas virtuales y servidores, desarrollado con Django (Backend) y Svelte (Frontend).

![Dashboard Preview](https://via.placeholder.com/800x400/0a0e27/60a5fa?text=ShugoVision+Dashboard)

## ✨ Características

- 📊 **Dashboard en tiempo real** con auto-refresh optimizado.
- 🎨 **Interfaz moderna** con tema oscuro y diseño intuitivo.
- 📈 **Visualización de recursos**: CPU, RAM y Disco con indicadores visuales.
- 🔄 **Auto-registro**: Las VMs se agregan automáticamente al recibir datos.
- 👁️ **Control de visibilidad**: Oculta/muestra VMs individualmente desde el dashboard.
- 📉 **Historial detallado** con gráficos interactivos.
- ⚡ **Indicadores de estado**: Identificación visual de VMs online/offline.
- 📱 **Diseño responsive** para acceso desde cualquier dispositivo.

## 📁 Estructura del Proyecto

```
ShugoVision/
├── vm_monitor/             # Backend Django
│   ├── monitor/            # App principal de monitoreo
│   ├── vm_monitor/         # Configuración del proyecto Django
│   ├── reporter_shugovision.py # Script cliente para las VMs
│   └── manage.py
├── frontend/               # Frontend Svelte + Vite
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── requirements.txt        # Dependencias de Python
└── .gitignore
```

## 🚀 Instalación y Configuración

### 1. Requisitos
- Python 3.8+
- Node.js & npm

### 2. Configuración del Backend (Django)

```bash
# Ir al directorio raíz
cd ShugoVision

# Crear y activar entorno virtual
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Migraciones y Base de Datos
cd vm_monitor
python manage.py migrate
python manage.py createsuperuser

# Iniciar servidor backend
python manage.py runserver 0.0.0.0:8000
```

### 3. Configuración del Frontend (Svelte)

```bash
# Desde la raíz del proyecto
cd frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

## 💻 Instalación del Cliente (en cada VM a monitorear)

1. Copia el archivo `vm_monitor/reporter_shugovision.py` a la VM.
2. Instala las dependencias necesarias en la VM:
   ```bash
   pip install psutil requests
   ```
3. Ejecuta el script o configúralo como una tarea programada (cron):
   ```bash
   python reporter_shugovision.py
   ```

## 🔌 API Endpoints Principales

- `GET /api/vms/`: Lista todas las VMs.
- `POST /api/status/`: Recibe actualizaciones de estado.
- `GET /api/vms/{id}/history/`: Obtiene el historial de métricas.

## 👨‍💻 Autor
**Hugo Giovanetti**
- GitHub: [@Shugo-G](https://github.com/Shugo-G)

---
*Desarrollado con ❤️ para el monitoreo eficiente.*