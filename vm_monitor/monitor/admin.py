from django.contrib import admin
from .models import VirtualMachine, VMStatus, Partition


@admin.register(VirtualMachine)
class VirtualMachineAdmin(admin.ModelAdmin):
    list_display = ['hostname', 'ip_address', 'os_version', 'is_visible', 'last_seen']
    list_filter = ['is_visible', 'os_version']
    search_fields = ['hostname', 'ip_address']
    readonly_fields = ['first_seen', 'last_seen']


class PartitionInline(admin.TabularInline):
    model = Partition
    extra = 0
    readonly_fields = ['mountpoint', 'total_mb', 'used_mb', 'used_percent']


@admin.register(VMStatus)
class VMStatusAdmin(admin.ModelAdmin):
    list_display = ['vm', 'timestamp', 'cpu_usage', 'ram_percent', 'disk_percent', 'update_count']
    list_filter = ['vm', 'timestamp']
    search_fields = ['vm__hostname']
    readonly_fields = ['vm', 'timestamp']
    inlines = [PartitionInline]
    date_hierarchy = 'timestamp'


@admin.register(Partition)
class PartitionAdmin(admin.ModelAdmin):
    list_display = ['status', 'mountpoint', 'used_percent', 'total_mb', 'used_mb']
    list_filter = ['mountpoint']
    search_fields = ['status__vm__hostname', 'mountpoint']