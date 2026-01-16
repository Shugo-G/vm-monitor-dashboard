from django.urls import path
from . import views

app_name = 'monitor'

urlpatterns = [
    # API endpoints
    path('api/status/', views.StatusAPIView.as_view(), name='api_status'),
    path('api/vms/', views.vm_list, name='api_vm_list'),
    path('api/vms/<int:vm_id>/history/', views.vm_history, name='api_vm_history'),
    path('api/vms/<int:vm_id>/toggle/', views.vm_toggle_visibility, name='api_vm_toggle'),
    path('api/vms/bulk-visibility/', views.vm_bulk_visibility, name='api_vm_bulk_visibility'),
    #path('api/vms/<int:vm_id>/toggle/', views.ToggleVisibilityAPIView.as_view(), name='api_vm_toggle'),
    path('api/vms/<int:vm_id>/stats/', views.vm_stats, name='api_vm_stats'),
    #path('api/vms/<int:vm_id>/ping/', views.vm_ping, name='api_vm_ping'),
]