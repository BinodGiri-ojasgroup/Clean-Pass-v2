from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from rest_framework import viewsets, permissions

from .models import (
    Washstation, VehicleType, WashPackage, Worker, Shift, 
    Customer, Vehicle, Wash, WashRequest, Appointment, 
    WaitlistItem, PlatformWaitlist
)
from .serializers import (
    WashstationSerializer, VehicleTypeSerializer, WashPackageSerializer, 
    WorkerSerializer, ShiftSerializer, CustomerSerializer, VehicleSerializer, 
    WashSerializer, WashRequestSerializer, AppointmentSerializer, 
    WaitlistItemSerializer, PlatformWaitlistSerializer
)

class IsWorkspaceTenant(permissions.BasePermission):
    """
    Enforces that tenant actions only touch models 
    matching the authenticated active washstation scope.
    """
    def has_object_permission(self, request, view, obj):
        if isinstance(obj, Washstation):
            return obj == request.user.washstation
        return obj.washstation == request.user.washstation


class TenantModelViewSet(viewsets.ModelViewSet):
    """
    Base viewset to auto-filter querysets by the logged in station tenant.
    """
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceTenant]

    def get_queryset(self):
        return self.queryset.filter(washstation=self.request.user.washstation)

    def perform_create(self, serializer):
        serializer.save(washstation=self.request.user.washstation)


# Global platform contexts (unscoped by active single tenants)
class WashstationViewSet(viewsets.ModelViewSet):
    queryset = Washstation.objects.all()
    serializer_class = WashstationSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceTenant]

    def get_queryset(self):
        return Washstation.objects.filter(id=self.request.user.washstation.id)

class PlatformWaitlistViewSet(viewsets.ModelViewSet):
    queryset = PlatformWaitlist.objects.all()
    serializer_class = PlatformWaitlistSerializer
    permission_classes = [permissions.IsAuthenticated]


# Strict Multi-Tenant Isolation viewsets
class VehicleTypeViewSet(TenantModelViewSet):
    queryset = VehicleType.objects.all()
    serializer_class = VehicleTypeSerializer

class WashPackageViewSet(TenantModelViewSet):
    queryset = WashPackage.objects.all()
    serializer_class = WashPackageSerializer

class WorkerViewSet(TenantModelViewSet):
    queryset = Worker.objects.all()
    serializer_class = WorkerSerializer

class ShiftViewSet(TenantModelViewSet):
    queryset = Shift.objects.all()
    serializer_class = ShiftSerializer

class CustomerViewSet(TenantModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer

class VehicleViewSet(TenantModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer

class WashViewSet(TenantModelViewSet):
    queryset = Wash.objects.all()
    serializer_class = WashSerializer

class WashRequestViewSet(TenantModelViewSet):
    queryset = WashRequest.objects.all()
    serializer_class = WashRequestSerializer

class AppointmentViewSet(TenantModelViewSet):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer

class WaitlistItemViewSet(TenantModelViewSet):
    queryset = WaitlistItem.objects.all()
    serializer_class = WaitlistItemSerializer


# Google Authentication API Endpoint View
class GoogleLoginView(APIView):
    permission_classes = [AllowAny]  # Allow unauthenticated users to hit this view

    def post(self, request):
        token = request.data.get('token')
        if not token:
            return Response({
                'success': False,
                'error': 'Token payload is missing'
            }, status=400)

        try:
            # Verify authenticity of the Google JWT token
            idinfo = id_token.verify_oauth2_token(
                token, 
                google_requests.Request(), 
                settings.GOOGLE_CLIENT_ID
            )

            email = idinfo.get('email')
            first_name = idinfo.get('given_name', '')
            last_name = idinfo.get('family_name', '')

            # Authenticate or instantiate a core user record
            user, created = User.objects.get_or_create(
                username=email,
                defaults={
                    'email': email,
                    'first_name': first_name,
                    'last_name': last_name
                }
            )

            # Issue standard SimpleJWT authentication infrastructure tokens
            refresh = RefreshToken.for_user(user)
            
            # Check if user has an associated washstation workspace tenant profile linked
            has_workspace = hasattr(user, 'washstation') and user.washstation is not None

            # 🚀 Wrapped cleanly inside 'success' and 'data' blocks for Next.js
            return Response({
                'success': True,
                'data': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                    'isNewShop': not has_workspace,  # Redirects to onboarding if no profile exists
                    'user': {
                        'id': user.id,
                        'email': user.email,
                        'name': f"{user.first_name} {user.last_name}".strip()
                    }
                }
            })

        except ValueError:
            return Response({
                'success': False,
                'error': 'Invalid Google account token verification failed'
            }, status=400)


# 📊 Aggregated Tenant Dashboard Metrics View
class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Gracefully guard against users logging in who haven't set up a shop yet
        if not hasattr(request.user, 'washstation') or request.user.washstation is None:
            return Response({
                'success': True,
                'data': {
                    'totalVehicles': 0, 'totalWashes': 0, 'totalRedemptions': 0,
                    'pendingRequests': 0, 'todayWashes': 0, 'unpaidWashes': 0,
                    'upcomingAppts': 0, 'revenue30d': 0,
                    'days7': [{'date': (timezone.now() - timedelta(days=i)).strftime('%a'), 'count': 0} for i in range(6, -1, -1)]
                }
            })

        station = request.user.washstation
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)

        # 1. Gather real-time metric counters scoped to this workspace
        total_vehicles = Vehicle.objects.filter(washstation=station).count()
        total_washes = Wash.objects.filter(washstation=station).count()
        total_redemptions = Wash.objects.filter(washstation=station, redeemed=True).count()
        pending_requests = WashRequest.objects.filter(washstation=station, status='pending').count()
        today_washes = Wash.objects.filter(washstation=station, created_at__date=now.date()).count()
        unpaid_washes = Wash.objects.filter(washstation=station, paid=False).count()
        upcoming_appts = Appointment.objects.filter(washstation=station, date__gte=now.date()).count()

        # 2. Extract 30-day aggregate revenue matching decimal fields safely
        revenue_data = Wash.objects.filter(
            washstation=station, 
            paid=True, 
            created_at__gte=thirty_days_ago
        ).aggregate(total=Sum('package__price'))
        revenue_30d = float(revenue_data['total']) if revenue_data['total'] else 0.0

        # 3. Construct chronological 7-day sparkline metrics
        days_7 = []
        for i in range(6, -1, -1):
            day_date = (now - timedelta(days=i)).date()
            day_count = Wash.objects.filter(washstation=station, created_at__date=day_date).count()
            days_7.append({
                'date': day_date.strftime('%a'), # e.g. "Mon", "Tue"
                'count': day_count
            })

        # Return exact layout structure expected by src/app/dashboard/page.tsx
        return Response({
            'success': True,
            'data': {
                'totalVehicles': total_vehicles,
                'totalWashes': total_washes,
                'totalRedemptions': total_redemptions,
                'pendingRequests': pending_requests,
                'todayWashes': today_washes,
                'unpaidWashes': unpaid_washes,
                'upcomingAppts': upcoming_appts,
                'revenue30d': int(revenue_30d),
                'days7': days_7
            }
        })
    
# 🚗 Live Workspace Wash Queue & Worker Assignment Roster Endpoint
class LiveWashQueueView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 1. Gracefully handle un-onboarded profile structures with safe arrays
        if not hasattr(request.user, 'washstation') or request.user.washstation is None:
            # If the specific request path asks for workers, return a list directly
            if 'workers' in request.path:
                return Response([])
            # Otherwise return an empty queue list array
            return Response([])

        station = request.user.washstation

        # 2. Handle a worker list inquiry route: GET /api/auth/workers/
        if 'workers' in request.path:
            workers = Worker.objects.filter(washstation=station, active=True)
            return Response(WorkerSerializer(workers, many=True).data)

        # 3. Handle queue tracking route: GET /api/washstations/queue/
        # Fetch operational washes and bundle them cleanly into a unified list
        active_washes = Wash.objects.filter(
            washstation=station, 
            status__in=['queued', 'washing', 'in_progress']
        )
        return Response(WashSerializer(active_washes, many=True).data)