from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView
from datetime import datetime, timedelta
from django.utils import timezone
from .models import VirtualMachine, VMStatus, Partition
from .serializers import (
    VirtualMachineSerializer, 
    VMStatusSerializer, 
    VMStatusInputSerializer
)


# Las vistas HTML han sido eliminadas para ser reemplazadas por un frontend en Svelte.
# La API se mantiene intacta a continuación.


@method_decorator(csrf_exempt, name='dispatch')
class StatusAPIView(APIView):
    """API para recibir estados de las VMs"""
    
    def post(self, request):
        """Recibe y procesa datos de monitoreo"""
        # El cliente envía un array de datos
        if not isinstance(request.data, list):
            return Response(
                {'error': 'Se esperaba un array de datos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        results = []
        
        for vm_data in request.data:
            serializer = VMStatusInputSerializer(data=vm_data)
            
            if serializer.is_valid():
                data = serializer.validated_data
                
                # Buscar o crear la VM por machine_id (si viene), con fallback a hostname
                machine_id = data.get('machine_id')
                hostname = data['hostname']
                created = False

                if machine_id:
                    try:
                        vm = VirtualMachine.objects.get(machine_id=machine_id)
                    except VirtualMachine.DoesNotExist:
                        # Reporter nuevo en máquina ya registrada por hostname → migrar
                        try:
                            vm = VirtualMachine.objects.get(hostname=hostname, machine_id__isnull=True)
                            vm.machine_id = machine_id
                        except VirtualMachine.DoesNotExist:
                            vm = VirtualMachine(machine_id=machine_id)
                            created = True
                else:
                    # Reporter viejo sin machine_id → fallback a hostname
                    vm, created = VirtualMachine.objects.get_or_create(hostname=hostname)

                vm.hostname = hostname
                vm.os_version = data['os_version']
                vm.ip_address = data.get('ip_address')
                vm.last_seen = timezone.now()
                vm.save()
                
                # Crear registro de estado
                vm_status = VMStatus.objects.create(
                    vm=vm,
                    timestamp=data['timestamp'],
                    cpu_usage=data['cpu_usage'],
                    ram_total=data['ram_total'],
                    ram_used=data['ram_used'],
                    ram_percent=data['ram_percent'],
                    disk_total=data['disk_total'],
                    disk_used=data['disk_used'],
                    disk_percent=data['disk_percent'],
                    update_count=data['update_count']
                )
                
                # Crear particiones
                for partition_data in data.get('partitions', []):
                    Partition.objects.create(
                        status=vm_status,
                        mountpoint=partition_data['mountpoint'],
                        total_mb=partition_data['total_mb'],
                        used_mb=partition_data['used_mb'],
                        used_percent=partition_data['used_percent']
                    )
                
                results.append({
                    'hostname': vm.hostname,
                    'created': created,
                    'status': 'success'
                })
            else:
                results.append({
                    'hostname': vm_data.get('hostname', 'unknown'),
                    'status': 'error',
                    'errors': serializer.errors
                })
        
        return Response({
            'message': f'Procesados {len(results)} registros',
            'results': results
        }, status=status.HTTP_200_OK)


@api_view(['GET'])
def vm_list(request):
    """Lista todas las VMs con su último estado"""
    vms = VirtualMachine.objects.all()
    serializer = VirtualMachineSerializer(vms, many=True)
    return Response(serializer.data)


@api_view(['GET'])
def vm_history(request, vm_id):
    """Obtiene el historial de estados de una VM"""
    vm = get_object_or_404(VirtualMachine, id=vm_id)
    
    # Obtener parámetros de tiempo
    hours = int(request.GET.get('hours', 24))
    since = timezone.now() - timedelta(hours=hours)
    
    # Obtener historial
    history = VMStatus.objects.filter(
        vm=vm,
        timestamp__gte=since
    ).prefetch_related('partitions')
    
    serializer = VMStatusSerializer(history, many=True)
    return Response(serializer.data)


@api_view(['PATCH'])
def vm_toggle_visibility(request, vm_id):
    """Alterna la visibilidad de una VM"""
    vm = get_object_or_404(VirtualMachine, id=vm_id)
    vm.is_visible = not vm.is_visible
    vm.save()
    
    return Response({
        'id': vm.id,
        'hostname': vm.hostname,
        'is_visible': vm.is_visible
    })


@api_view(['PATCH'])
def vm_bulk_visibility(request):
    """Actualiza la visibilidad de varias VMs a la vez"""
    vm_ids = request.data.get('vm_ids', [])
    visible = request.data.get('is_visible', True)
    
    if not isinstance(vm_ids, list):
        return Response(
            {'error': 'vm_ids debe ser una lista'},
            status=status.HTTP_400_BAD_REQUEST
        )
        
    VirtualMachine.objects.filter(id__in=vm_ids).update(is_visible=visible)
    
    return Response({
        'message': f'Se ha actualizado la visibilidad de {len(vm_ids)} VMs',
        'is_visible': visible
    })


@api_view(['GET'])
def vm_stats(request, vm_id):
    """Obtiene estadísticas de una VM para gráficos"""
    vm = get_object_or_404(VirtualMachine, id=vm_id)

    hours = int(request.GET.get('hours', 24))
    since = timezone.now() - timedelta(hours=hours)

    history = VMStatus.objects.filter(
        vm=vm,
        timestamp__gte=since
    ).order_by('timestamp').values('timestamp', 'cpu_usage', 'ram_percent', 'disk_percent')

    return Response(list(history))


@api_view(['PATCH'])
def vm_update(request, vm_id):
    """Actualiza campos editables de una VM (descripción, alias, etc.)"""
    vm = get_object_or_404(VirtualMachine, id=vm_id)
    fields_changed = []
    if 'description' in request.data:
        vm.description = request.data['description']
        fields_changed.append('description')
    if 'display_name' in request.data:
        vm.display_name = request.data['display_name']
        fields_changed.append('display_name')
    if fields_changed:
        vm.save(update_fields=fields_changed)
    return Response({'id': vm.id, 'description': vm.description, 'display_name': vm.display_name})