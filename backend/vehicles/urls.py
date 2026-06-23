from django.urls import path
from .views import VehicleTypeListCreateView, VehicleListView, VehicleDetailView

urlpatterns = [
    path('vehicle-types/', VehicleTypeListCreateView.as_view(), name='vehicle-types'),
    path('vehicles/', VehicleListView.as_view(), name='vehicles'),
    path('vehicles/<uuid:pk>/', VehicleDetailView.as_view(), name='vehicle-detail'),
]
