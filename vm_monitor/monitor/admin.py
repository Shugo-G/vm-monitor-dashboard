from django.contrib import admin
from .models import VirtualMachine, VMStatus, Partition


@admin.register(VirtualMachine)
class VirtualMachineAdmin(admin.ModelAdmin):
    list_display = ['hostname', 'ip_address', 'os_version', 'is_visible', 'last_seen']
    list_filter = ['is_visible', 'os_version']
    search_fields = ['hostname', 'ip_address']
    readonly_fields = ['first_seen', 'last_seen']

    def delete_model(self, request, obj):
        # Borra los registros de estado primero para evitar timeout en admin
        obj.status_history.all().delete()
        obj.delete()

    def delete_queryset(self, request, queryset):
        for vm in queryset:
            vm.status_history.all().delete()
        queryset.delete()


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
    show_full_result_count = False


@admin.register(Partition)
class PartitionAdmin(admin.ModelAdmin):
    list_display = ['status', 'mountpoint', 'used_percent', 'total_mb', 'used_mb']
    list_filter = ['mountpoint']
    search_fields = ['status__vm__hostname', 'mountpoint']
