# backend/washstation/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter


from .views import (
    WashstationViewSet, VehicleTypeViewSet, WashPackageViewSet, WashServiceViewSet,
    WorkerViewSet, ShiftViewSet, CustomerViewSet, VehicleViewSet,
    WashViewSet, WashRequestViewSet, AppointmentViewSet, 
    WaitlistItemViewSet, PlatformWaitlistViewSet,

)

# Register all tenant-scoped ViewSets
router = DefaultRouter()
router.register(r'shops', WashstationViewSet, basename='shop')
router.register(r'vehicle-types', VehicleTypeViewSet, basename='vehicle-type')
router.register(r'packages', WashPackageViewSet, basename='package')
router.register(r'services', WashServiceViewSet, basename='service')
router.register(r'workers', WorkerViewSet, basename='worker')
router.register(r'shifts', ShiftViewSet, basename='shift')
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'vehicles', VehicleViewSet, basename='vehicle')
router.register(r'washes', WashViewSet, basename='wash')
router.register(r'wash-requests', WashRequestViewSet, basename='wash-request')
router.register(r'appointments', AppointmentViewSet, basename='appointment')
router.register(r'waitlist', WaitlistItemViewSet, basename='waitlist')
router.register(r'platform-waitlist', PlatformWaitlistViewSet, basename='platform-waitlist')

urlpatterns = [
    # The router URLs are mounted at the root of this file.
    # Because config/urls.py includes this file at 'api/', 
    # these will resolve to /api/vehicles/, /api/customers/, etc.
    path('', include(router.urls)),
]