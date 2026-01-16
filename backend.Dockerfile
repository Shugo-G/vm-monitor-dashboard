# Use official Python image as base
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY vm_monitor/ /app/

# Create directory for static files and database volume
RUN mkdir -p /app/static_root /app/data

# Environment variable for database path
ENV DB_PATH=/app/data/db.sqlite3

# Run migrations and collect static files would typically happen at runtime or during compose
# For now, we prepare the environment
EXPOSE 8000

# Entrypoint script to handle migrations and gunicorn
COPY backend-entrypoint.sh /app/
RUN chmod +x /app/backend-entrypoint.sh

ENTRYPOINT ["/app/backend-entrypoint.sh"]
