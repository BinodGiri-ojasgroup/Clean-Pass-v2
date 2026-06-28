import sys
import csv
import io
import qrcode
import base64
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.conf import settings
from django.utils import timezone
from datetime import timedelta, datetime
from django.db.models import Sum
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from rest_framework import viewsets, permissions, status
from django.core.exceptions import ValidationError

from .models import (
    Washstation, VehicleType, WashPackage, Worker, Shift,
    Customer, Vehicle, Wash, WashRequest, Appointment,
    WaitlistItem, PlatformWaitlist, WashStatus, RequestStatus,
    PaymentMethod, AppointmentStatus
)
from .serializers import (
    RegisterSerializer, WashstationSerializer, ShopUpdateSerializer,
    VehicleTypeSerializer, WashPackageSerializer, WorkerSerializer,
    ShiftSerializer, CustomerSerializer, VehicleSerializer,
    WashSerializer, WashRequestSerializer, AppointmentSerializer,
    WaitlistItemSerializer, PlatformWaitlistSerializer
)


# --- HELPERS ---
def ok(data, status_code=200):
    return Response({'success': True, 'data': data}, status=status_code)

def err(error, status_code=400):
    return Response({'success': False, 'error': error}, status=status_code)

def get_washstation(request):
    """Safely get the washstation linked to the current user."""
    if hasattr(request.user, 'washstation') and request.user.washstation is not None:
        return request.user.washstation
    return None


# --- PERMISSIONS ---
class IsWorkspaceTenant(permissions.BasePermission):
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated
                and hasattr(request.user, 'washstation')
                and request.user.washstation is not None)

    def has_object_permission(self, request, view, obj):
        station = get_washstation(request)
        if not station:
            return False
        if isinstance(obj, Washstation):
            return obj == station
        return obj.washstation == station


class TenantModelViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceTenant]

    def get_queryset(self):
        station = get_washstation(self.request)
        if not station:
            return self.queryset.none()
        return self.queryset.filter(washstation=station)

    def perform_create(self, serializer):
        serializer.save(washstation=get_washstation(self.request))


# --- VIEWSETS ---
class WashstationViewSet(viewsets.ModelViewSet):
    serializer_class = WashstationSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkspaceTenant]

    def get_queryset(self):
        station = get_washstation(self.request)
        if not station:
            return Washstation.objects.none()
        return Washstation.objects.filter(id=station.id)

class PlatformWaitlistViewSet(viewsets.ModelViewSet):
    queryset = PlatformWaitlist.objects.all()
    serializer_class = PlatformWaitlistSerializer
    permission_classes = [permissions.IsAuthenticated]

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


# --- AUTH VIEWS ---
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            first_error = next(iter(serializer.errors.values()))[0]
            return err(str(first_error), 400)

        user, washstation = serializer.save()
        refresh = RefreshToken.for_user(user)
        return ok({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {'id': user.id, 'email': user.email, 'name': washstation.name}
        }, 201)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').lower().strip()
        password = request.data.get('password', '')
        if not email or not password:
            return err('Email and password are required.', 400)

        user = authenticate(username=email, password=password)
        if not user:
            return err('Invalid credentials.', 401)

        refresh = RefreshToken.for_user(user)
        station = get_washstation(request) if hasattr(request, 'user') else None
        # Re-fetch user since request.user might be anonymous
        user = User.objects.get(pk=user.pk)
        has_workspace = hasattr(user, 'washstation') and user.washstation is not None

        return ok({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'isNewShop': not has_workspace,
            'user': {
                'id': user.id,
                'email': user.email,
                'name': user.washstation.name if has_workspace else user.first_name
            }
        })


class GoogleLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('credential') or request.data.get('token')
        if not token:
            return err('Token payload is missing.', 400)

        try:
            idinfo = id_token.verify_oauth2_token(
                token, google_requests.Request(), settings.GOOGLE_CLIENT_ID
            )
            email = idinfo.get('email')
            first_name = idinfo.get('given_name', '')
            last_name = idinfo.get('family_name', '')

            user, created = User.objects.get_or_create(
                username=email,
                defaults={'email': email, 'first_name': first_name, 'last_name': last_name}
            )

            refresh = RefreshToken.for_user(user)
            has_workspace = hasattr(user, 'washstation') and user.washstation is not None

            return ok({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'isNewShop': not has_workspace,
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'name': f"{user.first_name} {user.last_name}".strip() or email
                }
            })
        except ValueError as e:
            print(f"❌ Google Token Error: {e}", file=sys.stderr)
            return err(f'Invalid Google token: {str(e)}', 400)
        except Exception as e:
            print(f"❌ Google Auth Error: {e}", file=sys.stderr)
            return err(f'Authentication failed: {str(e)}', 400)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        return ok({'message': 'Logged out successfully'})


# --- SETTINGS / SHOP PROFILE ---
class CurrentShopView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        station = get_washstation(request)
        if not station:
            return Response(
                {'success': False, 'error': 'Shop not found.', 'needs_setup': True},
                status=status.HTTP_404_NOT_FOUND
            )
        return ok(WashstationSerializer(station).data)

    def post(self, request):
        """Create a new shop for the authenticated user (onboarding)."""
        if get_washstation(request):
            return err('Shop already exists.', 400)

        serializer = WashstationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return ok(serializer.data, 201)
        return err(serializer.errors, 400)

    def patch(self, request):
        station = get_washstation(request)
        if not station:
            return err('Shop not found.', 404)

        serializer = ShopUpdateSerializer(station, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return ok(WashstationSerializer(station).data)
        return err(serializer.errors, 400)


# --- QR CODE ---
class QRGeneratorView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        station = get_washstation(request)
        shop_id = str(station.id) if station else '1'
        
        # 🚨 Use FRONTEND_URL so the customer's phone can access the scan page!
        scan_url = f"{settings.FRONTEND_URL}/scan/{shop_id}"
        
        # 1. Generate the real QR code using the qrcode library
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(scan_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        
        # 2. Convert the image into a Base64 string so the frontend <img> tag can read it
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        qr_data_uri = f"data:image/png;base64,{img_base64}"

        # 3. Return the real QR code to the frontend
        return ok({
            "qrCode": qr_data_uri,
            "scanUrl": scan_url
        })


# --- DASHBOARD STATS ---
class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        station = get_washstation(request)
        if not station:
            return ok({
                'totalVehicles': 0, 'totalWashes': 0, 'totalRedemptions': 0,
                'pendingRequests': 0, 'todayWashes': 0, 'unpaidWashes': 0,
                'upcomingAppts': 0, 'revenue30d': 0,
                'days7': [{'date': (timezone.now() - timedelta(days=i)).strftime('%a'), 'count': 0}
                          for i in range(6, -1, -1)]
            })

        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)

        total_vehicles = Vehicle.objects.filter(washstation=station).count()
        total_washes = Wash.objects.filter(washstation=station).count()
        total_redemptions = Wash.objects.filter(washstation=station, redeemed=True).count()
        pending_requests = WashRequest.objects.filter(
            washstation=station, status=RequestStatus.PENDING
        ).count()
        today_washes = Wash.objects.filter(
            washstation=station, created_at__date=now.date()
        ).count()
        unpaid_washes = Wash.objects.filter(washstation=station, paid=False).count()
        upcoming_appts = Appointment.objects.filter(
            washstation=station, date__gte=now.date()
        ).count()

        revenue_data = Wash.objects.filter(
            washstation=station, paid=True, created_at__gte=thirty_days_ago
        ).aggregate(total=Sum('package__price'))
        revenue_30d = float(revenue_data['total'] or 0)

        days_7 = []
        for i in range(6, -1, -1):
            day_date = (now - timedelta(days=i)).date()
            day_count = Wash.objects.filter(
                washstation=station, created_at__date=day_date
            ).count()
            days_7.append({'date': day_date.strftime('%a'), 'count': day_count})

        return ok({
            'totalVehicles': total_vehicles,
            'totalWashes': total_washes,
            'totalRedemptions': total_redemptions,
            'pendingRequests': pending_requests,
            'todayWashes': today_washes,
            'unpaidWashes': unpaid_washes,
            'upcomingAppts': upcoming_appts,
            'revenue30d': int(revenue_30d),
            'days7': days_7
        })


# --- LIVE QUEUE ---
class LiveWashQueueView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        station = get_washstation(request)
        if not station:
            return Response([])

        if 'workers' in request.path:
            workers = Worker.objects.filter(washstation=station, active=True)
            return Response(WorkerSerializer(workers, many=True).data)

        active_washes = Wash.objects.filter(
            washstation=station,
            status__in=[WashStatus.QUEUED, WashStatus.WASHING]
        )
        return Response(WashSerializer(active_washes, many=True).data)


# --- REPORTS ---
class ReportsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        station = get_washstation(request)
        if not station:
            return err('Shop not found.', 404)

        days = int(request.query_params.get('days', 30))
        export_format = request.query_params.get('format')
        since = timezone.now() - timedelta(days=days)

        washes = Wash.objects.filter(
            washstation=station, created_at__gte=since
        ).select_related(
            'vehicle', 'vehicle__customer', 'vehicle__vehicle_type', 'package'
        ).order_by('-created_at')

        if export_format == 'csv':
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow([
                'Date', 'Plate No', 'Vehicle Type', 'Customer', 'Phone',
                'Package', 'Price', 'Paid', 'Redeemed'
            ])
            for w in washes:
                writer.writerow([
                    w.created_at.strftime('%Y-%m-%d'),
                    w.vehicle.plate_no if w.vehicle else '',
                    w.vehicle.vehicle_type.name if w.vehicle and w.vehicle.vehicle_type else '',
                    w.vehicle.customer.name if w.vehicle and w.vehicle.customer else '',
                    w.vehicle.customer.phone if w.vehicle and w.vehicle.customer else '',
                    w.package.name if w.package else 'Manual',
                    w.package.price if w.package else 0,
                    'Yes' if w.paid else 'No',
                    'Yes' if w.redeemed else 'No'
                ])

            from django.http import HttpResponse
            response = HttpResponse(output.getvalue(), content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="cleanpass-report-{days}days.csv"'
            return response

        total_revenue = sum(w.package.price for w in washes if w.paid and w.package)
        unpaid_revenue = sum(
            w.package.price for w in washes
            if not w.paid and not w.redeemed and w.package
        )
        redemptions = washes.filter(redeemed=True).count()

        return ok({
            'washes': washes.count(),
            'revenue': total_revenue,
            'unpaid': unpaid_revenue,
            'redemptions': redemptions
        })
class PublicWashRequestView(APIView):
    permission_classes = [AllowAny] # No login required!

    def post(self, request, shop_id):
        try:
            station = Washstation.objects.get(id=shop_id, active=True)
        except (Washstation.DoesNotExist, ValidationError, ValueError):
            return err('Shop not found or inactive.', 404)

        phone = request.data.get('phone')
        plate_no = request.data.get('plate_no')
        
        if not phone or not plate_no:
            return err('Phone and plate number are required.', 400)

        # 1. Create or get the customer
        customer, _ = Customer.objects.get_or_create(
            washstation=station, phone=phone,
            defaults={'name': f'Customer {phone[-4:]}'}
        )

        # 2. Create or get the vehicle
        vehicle, _ = Vehicle.objects.get_or_create(
            washstation=station, plate_no=plate_no,
            defaults={'customer': customer}
        )

        # 3. Create the wash request
        wash_request = WashRequest.objects.create(
            washstation=station, phone=phone, plate_no=plate_no,
            customer=customer, vehicle=vehicle, status=RequestStatus.PENDING
        )

        return ok({
            'message': 'Wash request submitted successfully!',
            'requestId': str(wash_request.id)
        }, 201)
class DailySummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        station = get_washstation(request)
        if not station:
            return err('Shop not found.', 404)

        date_str = request.query_params.get('date', timezone.now().date().isoformat())
        
        try:
            # 👇 FIXED: Use datetime directly, then make it timezone-aware safely
            start = datetime.fromisoformat(date_str + 'T00:00:00')
            end = datetime.fromisoformat(date_str + 'T23:59:59')
            
            if timezone.is_naive(start):
                start = timezone.make_aware(start)
            if timezone.is_naive(end):
                end = timezone.make_aware(end)
        except ValueError:
            return err('Invalid date format.', 400)

        washes = Wash.objects.filter(
            washstation=station,
            created_at__gte=start,
            created_at__lte=end,
            status=WashStatus.DONE
        ).select_related('package', 'worker')

        # Payment method breakdown
        by_method = {}
        for w in washes:
            m = w.payment_method or 'cash'
            if m not in by_method:
                by_method[m] = {'count': 0, 'amount': 0}
            by_method[m]['count'] += 1
            by_method[m]['amount'] += w.package.price if w.package else 0

        # Worker breakdown
        by_worker = {}
        for w in washes:
            if w.worker:
                name = w.worker.name
                if name not in by_worker:
                    by_worker[name] = {'name': name, 'count': 0, 'commission': 0}
                by_worker[name]['count'] += 1
                by_worker[name]['commission'] += w.worker.commission

        total_washes = washes.count()
        total_revenue = sum(w.package.price for w in washes if w.paid and w.package)
        total_unpaid = sum(w.package.price for w in washes if not w.paid and w.package)
        redeemed = washes.filter(redeemed=True).count()

        return ok({
            'date': date_str,
            'totalWashes': total_washes,
            'totalRevenue': total_revenue,
            'totalUnpaid': total_unpaid,
            'redeemed': redeemed,
            'byMethod': by_method,
            'byWorker': list(by_worker.values()),
        })
class PublicShopInfoView(APIView):
    """
    Public endpoint to fetch basic shop info (name, logo) 
    when a customer scans the QR code. No login required.
    """
    permission_classes = [AllowAny]

    def get(self, request, shop_id):
        try:
            station = Washstation.objects.get(id=shop_id, active=True)
        except (Washstation.DoesNotExist, ValidationError, ValueError):
            return err('Shop not found or inactive.', 404)

        # Return only safe, public-facing data
        return ok({
            'id': str(station.id),
            'name': station.name,
            'logo': station.washstation_logo,
            'themeColor': station.theme_color,
        })