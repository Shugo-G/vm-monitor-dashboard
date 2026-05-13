#!/bin/bash
# Instalador del agente ShugoVision
# Soporta Ubuntu 12.04+ (cron) y sistemas con systemd (timer)

set -e

echo "=== Instalación del agente ShugoVision ==="

SCRIPT_DIR="/opt/shugovision"
SCRIPT_PATH="$SCRIPT_DIR/server-reporter.py"
DOWNLOAD_URL="http://server-monitor.ushuaia.gob.ar/server-reporter.py"
LOG_FILE="/var/log/shugovision.log"

# Detectar systemd
if [ -d /run/systemd/system ]; then
    HAS_SYSTEMD=true
else
    HAS_SYSTEMD=false
fi

# ─────────────────────────────────────────────
# 1) Instalar Python 3 y dependencias
# ─────────────────────────────────────────────
echo "[1/4] Instalando Python 3 y dependencias..."

if [ -f /etc/debian_version ]; then
    # apt-get es compatible desde Ubuntu 12.04; apt solo desde 16.04
    sudo apt-get update
    # Intentar instalar paquetes del sistema (preferido, evita problemas de entorno)
    sudo apt-get install -y python3 wget \
        python3-psutil python3-requests 2>/dev/null || {
        # Fallback para distros viejas donde esos paquetes no existen en repos
        echo "  → Paquetes apt no disponibles, usando pip..."
        sudo apt-get install -y python3 python3-pip wget
        sudo python3 -m pip install psutil requests \
            --break-system-packages 2>/dev/null \
            || sudo python3 -m pip install psutil requests
    }
elif [ -f /etc/redhat-release ]; then
    sudo yum install -y python3 python3-pip wget
    sudo python3 -m pip install psutil requests
else
    echo "Distribución no reconocida. Instalá python3, psutil y requests manualmente."
    exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
    echo "Error: python3 no está disponible tras la instalación."
    exit 1
fi

PYTHON_BIN="$(command -v python3)"
echo "  → Python: $PYTHON_BIN ($($PYTHON_BIN --version 2>&1))"

# ─────────────────────────────────────────────
# 2) Descargar el script reporter
# ─────────────────────────────────────────────
echo "[2/4] Descargando script reporter desde $DOWNLOAD_URL..."

sudo mkdir -p "$SCRIPT_DIR"
sudo wget -q --show-progress -O "$SCRIPT_PATH" "$DOWNLOAD_URL" || {
    echo "Error: no se pudo descargar $DOWNLOAD_URL"
    exit 1
}
sudo chmod +x "$SCRIPT_PATH"
echo "  → Guardado en $SCRIPT_PATH"

# ─────────────────────────────────────────────
# 3) Crear servicio o cron según el sistema
# ─────────────────────────────────────────────
if $HAS_SYSTEMD; then
    # ── systemd (Ubuntu 15.04+) ──────────────
    echo "[3/4] Creando servicio systemd shugovision..."

    sudo bash -c "cat > /etc/systemd/system/shugovision.service" <<EOF
[Unit]
Description=ShugoVision Reporting Agent
After=network.target

[Service]
Type=oneshot
ExecStart=$PYTHON_BIN $SCRIPT_PATH
StandardOutput=journal
StandardError=journal
EOF

    sudo bash -c "cat > /etc/systemd/system/shugovision.timer" <<EOF
[Unit]
Description=Ejecutar ShugoVision cada minuto

[Timer]
OnCalendar=*:0/1
Persistent=true
Unit=shugovision.service

[Install]
WantedBy=timers.target
EOF

    echo "[4/4] Activando timer systemd..."
    sudo systemctl daemon-reload
    sudo systemctl enable --now shugovision.timer

    echo ""
    echo "=== Instalación completada (systemd) ==="
    echo "  Estado del timer:  systemctl list-timers shugovision.timer"
    echo "  Logs:              journalctl -u shugovision.service -f"

else
    # ── cron (Ubuntu 12.04 / sin systemd) ────
    echo "[3/4] Sistema sin systemd — creando regla cron..."

    CRON_FILE="/etc/cron.d/shugovision"
    sudo bash -c "cat > $CRON_FILE" <<EOF
# ShugoVision — reporta cada minuto
* * * * * root $PYTHON_BIN $SCRIPT_PATH >> $LOG_FILE 2>&1
EOF
    sudo chmod 644 "$CRON_FILE"

    echo "[4/4] Recargando cron..."
    sudo service cron reload 2>/dev/null \
        || sudo service cron restart 2>/dev/null \
        || sudo service crond restart 2>/dev/null \
        || true

    echo ""
    echo "=== Instalación completada (cron) ==="
    echo "  Regla cron:  $CRON_FILE"
    echo "  Logs:        tail -f $LOG_FILE"
fi
