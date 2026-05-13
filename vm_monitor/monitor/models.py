from django.db import models
from django.utils import timezone
from datetime import timedelta


class VirtualMachine(models.Model):
    """Modelo para almacenar información de las VMs"""
    machine_id = models.CharField(max_length=64, null=True, blank=True)
    hostname = models.CharField(max_length=255)
    display_name = models.CharField(max_length=255, blank=True, default='')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    os_version = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    is_visible = models.BooleanField(default=True)
    first_seen = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['hostname']
        verbose_name = 'Máquina Virtual'
        verbose_name_plural = 'Máquinas Virtuales'

    def __str__(self):
        return self.hostname

    @property
    def is_stale(self):
        """Devuelve True si la VM no se ha actualizado en los últimos 5 minutos."""
        latest_status = self.status_history.order_by('-timestamp').first()

        if latest_status:
            last_update = latest_status.timestamp
            now = timezone.now()
            time_difference = now - last_update
            STALE_THRESHOLD = timedelta(minutes=5)
            return time_difference > STALE_THRESHOLD

        return True


class VMStatus(models.Model):
    """Modelo para almacenar el estado histórico de las VMs"""
    vm = models.ForeignKey(VirtualMachine, on_delete=models.CASCADE, related_name='status_history')
    timestamp = models.DateTimeField()
    cpu_usage = models.FloatField()
    ram_total = models.FloatField()
    ram_used = models.FloatField()
    ram_percent = models.FloatField()
    disk_total = models.FloatField()
    disk_used = models.FloatField()
    disk_percent = models.FloatField()
    update_count = models.IntegerField(default=-1)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Estado de VM'
        verbose_name_plural = 'Estados de VMs'
        indexes = [
            models.Index(fields=['vm', '-timestamp']),
        ]

    def __str__(self):
        return f"{self.vm.hostname} - {self.timestamp}"

    def get_status_color(self, percentage):
        """Retorna el color según el porcentaje"""
        if percentage <= 50:
            return 'success'
        elif percentage <= 80:
            return 'warning'
        else:
            return 'danger'


class Partition(models.Model):
    """Modelo para almacenar información de particiones"""
    status = models.ForeignKey(VMStatus, on_delete=models.CASCADE, related_name='partitions')
    mountpoint = models.CharField(max_length=255)
    total_mb = models.FloatField()
    used_mb = models.FloatField()
    used_percent = models.FloatField()

    class Meta:
        verbose_name = 'Partición'
        verbose_name_plural = 'Particiones'

    def __str__(self):
        return f"{self.status.vm.hostname} - {self.mountpoint}"
