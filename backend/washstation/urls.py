from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WashstationViewSet, VehicleTypeViewSet, WashPackageViewSet,
    WorkerViewSet, ShiftViewSet, CustomerViewSet, VehicleViewSet,
    WashViewSet, WashRequestViewSet, AppointmentViewSet,
    WaitlistItemViewSet, PlatformWaitlistViewSet, GoogleLoginView
)

router = DefaultRouter()
router.register(r'profile', WashstationViewSet, basename='station-profile')
router.register(r'vehicle-types', VehicleTypeViewSet, basename='station-vehicle-types')
router.register(r'packages', WashPackageViewSet, basename='station-packages')
router.register(r'workers', WorkerViewSet, basename='station-workers')
router.register(r'shifts', ShiftViewSet, basename='station-shifts')
router.register(r'customers', CustomerViewSet, basename='station-customers')
router.register(r'vehicles', VehicleViewSet, basename='station-vehicles')
router.register(r'washes', WashViewSet, basename='station-washes')
router.register(r'requests', WashRequestViewSet, basename='station-requests')
router.register(r'appointments', AppointmentViewSet, basename='station-appointments')
router.register(r'waitlist-items', WaitlistItemViewSet, basename='station-waitlist-items')
router.register(r'platform-waitlist', PlatformWaitlistViewSet, basename='platform-waitlist')

urlpatterns = [
    # Explicitly map the Google OAuth endpoint ahead of the router inclusion
    path('auth/google/', GoogleLoginView.as_view(), name='google_login'),
    
    # Standard router urls fallback
    path('', include(router.urls)),
]