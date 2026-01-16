#!/bin/bash

# Exit on error
set -e

# Run migrations
echo "Running migrations..."
python manage.py migrate --noinput

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Start Gunicorn
echo "Starting Gunicorn..."
exec gunicorn vm_monitor.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --log-level info
