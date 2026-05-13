from rest_framework import serializers
from .models import VirtualMachine, VMStatus, Partition


class PartitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Partition
        fields = ['mountpoint', 'total_mb', 'used_mb', 'used_percent']


class VMStatusSerializer(serializers.ModelSerializer):
    partitions = PartitionSerializer(many=True, read_only=True)

    class Meta:
        model = VMStatus
        fields = [
            'id', 'timestamp', 'cpu_usage', 'ram_total', 'ram_used',
            'ram_percent', 'disk_total', 'disk_used', 'disk_percent',
            'update_count', 'partitions'
        ]


class VirtualMachineSerializer(serializers.ModelSerializer):
    latest_status = serializers.SerializerMethodField()
    is_stale = serializers.BooleanField(read_only=True)

    class Meta:
        model = VirtualMachine
        fields = [
            'id', 'hostname', 'display_name', 'ip_address', 'os_version', 'description',
            'is_visible', 'first_seen', 'last_seen', 'latest_status', 'is_stale',
        ]

    def get_latest_status(self, obj):
        latest = obj.status_history.first()
        if latest:
            return VMStatusSerializer(latest).data
        return None


class VMStatusInputSerializer(serializers.Serializer):
    """Serializer para recibir datos del cliente de monitoreo"""
    hostname = serializers.CharField(max_length=255)
    ip_address = serializers.CharField(max_length=45, required=False, allow_blank=True, allow_null=True)
    os_version = serializers.CharField(max_length=255)
    cpu_usage = serializers.FloatField()
    ram_total = serializers.FloatField()
    ram_used = serializers.FloatField()
    ram_percent = serializers.FloatField()
    disk_total = serializers.FloatField()
    disk_used = serializers.FloatField()
    disk_percent = serializers.FloatField()
    machine_id = serializers.CharField(max_length=64, required=False, allow_blank=True, allow_null=True)
    update_count = serializers.IntegerField(default=-1)
    timestamp = serializers.DateTimeField()
    partitions = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list
    )
