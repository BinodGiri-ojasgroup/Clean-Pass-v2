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
from django.db.models import Sum, F
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from rest_framework import viewsets, permissions, status
from django.core.exceptions import ValidationError

from .models import (
    Washstation, VehicleType, WashPackage, WashService, Worker, Shift,
    Customer, Vehicle, Wash, WashRequest, Appointment,
    WaitlistItem, PlatformWaitlist, WashStatus, RequestStatus,
    PaymentMethod, AppointmentStatus
)
from .serializers import (
    RegisterSerializer, WashstationSerializer, ShopUpdateSerializer,
    VehicleTypeSerializer, WashPackageSerializer, WashServiceSerializer, WorkerSerializer,
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


class WashServiceViewSet(TenantModelViewSet):
    queryset = WashService.objects.all()
    serializer_class = WashServiceSerializer


class WorkerViewSet(TenantModelViewSet):
    queryset = Worker.objects.all()
    serializer_class = WorkerSerializer
    
    def list(self, request, *args, **kwargs):
        station = get_washstation(request)
        if not station:
            return ok([])
        now = timezone.now()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        start_of_week = now - timedelta(days=now.weekday())
        workers = Worker.objects.filter(washstation=station, active=True)
        worker_data = []
        for worker in workers:
            active_shift = Shift.objects.filter(worker=worker, clock_out__isnull=True).order_by('-clock_in').first()
            washes_this_month = Wash.objects.filter(worker=worker, washstation=station, created_at__gte=start_of_month)
            revenue_this_month = sum(w.package.price for w in washes_this_month if w.paid and w.package)
            commission_earned = washes_this_month.count() * worker.commission
            shifts_this_week = Shift.objects.filter(worker=worker, clock_in__gte=start_of_week).count()
            worker_dict = WorkerSerializer(worker).data
            worker_dict['activeShift'] = {'clockIn': active_shift.clock_in.isoformat()} if active_shift else None
            worker_dict['washesThisMonth'] = washes_this_month.count()
            worker_dict['revenueThisMonth'] = revenue_this_month
            worker_dict['commissionEarned'] = commission_earned
            worker_dict['shiftsThisWeek'] = shifts_this_week
            worker_data.append(worker_dict)
        return ok(worker_data)

class ShiftViewSet(TenantModelViewSet):
    queryset = Shift.objects.all()
    serializer_class = ShiftSerializer

class CustomerViewSet(TenantModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    
    def list(self, request, *args, **kwargs):
        station = get_washstation(request)
        if not station:
            return ok([])
        search = request.query_params.get('search', '')
        customers = Customer.objects.filter(washstation=station)
        if search:
            customers = customers.filter(name__icontains=search) | customers.filter(phone__icontains=search)
        customer_data = []
        for customer in customers:
            customer_dict = CustomerSerializer(customer).data
            vehicles = Vehicle.objects.filter(customer=customer, washstation=station)
            vehicle_list = []
            for v in vehicles:
                vt = v.vehicle_type
                washes = Wash.objects.filter(vehicle=v, washstation=station)
                active_washes = washes.count()
                vehicle_list.append({
                    'id': str(v.id),
                    'plateNo': v.plate_no,
                    'vehicleTypeName': vt.name if vt else '',
                    'vehicleTypeIcon': vt.icon if vt else '🚗',
                    'washGoal': vt.wash_goal if vt else 8,
                    'activeWashes': active_washes
                })
            customer_dict['vehicles'] = vehicle_list
            customer_data.append(customer_dict)
        return ok(customer_data)

class VehicleViewSet(TenantModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    
    def list(self, request, *args, **kwargs):
        station = get_washstation(request)
        if not station:
            return ok([])
        search = request.query_params.get('search', '')
        vehicles = Vehicle.objects.filter(washstation=station)
        if search:
            vehicles = vehicles.filter(plate_no__icontains=search) | vehicles.filter(customer__name__icontains=search) | vehicles.filter(customer__phone__icontains=search)
        vehicle_data = []
        for vehicle in vehicles:
            vt = vehicle.vehicle_type
            washes = Wash.objects.filter(vehicle=vehicle, washstation=station)
            active_washes = washes.count()
            unpaid_washes = washes.filter(paid=False, redeemed=False).count()
            is_reward_ready = vt and active_washes >= vt.wash_goal
            vehicle_dict = VehicleSerializer(vehicle).data
            vehicle_dict['plateNo'] = vehicle.plate_no
            vehicle_dict['vehicleType'] = VehicleTypeSerializer(vt).data if vt else {
                'id': None, 'name': 'Unknown', 'icon': '🚗', 'washGoal': 8, 'active': True
            }
            vehicle_dict['customer'] = CustomerSerializer(vehicle.customer).data if vehicle.customer else {
                'id': None, 'name': None, 'phone': 'Unknown', 'washstation': None, 'createdAt': None
            }
            vehicle_dict['activeWashes'] = active_washes
            vehicle_dict['unpaidWashes'] = unpaid_washes
            vehicle_dict['isRewardReady'] = is_reward_ready
            vehicle_data.append(vehicle_dict)
        return ok(vehicle_data)
        
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        washes = Wash.objects.filter(vehicle=instance, washstation=get_washstation(request))
        wash_data = []
        for w in washes:
            w_dict = WashSerializer(w).data
            w_dict['createdAt'] = w.created_at.isoformat()
            wash_data.append(w_dict)
        data = VehicleSerializer(instance).data
        data['washes'] = wash_data
        return ok(data)
        
    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        station = get_washstation(request)
        action = request.data.get('action')
        
        if action == 'mark_paid':
            wash_id = request.data.get('washId')
            payment_method = request.data.get('paymentMethod', PaymentMethod.CASH)
            if wash_id:
                wash = Wash.objects.get(id=wash_id, washstation=station)
                wash.paid = True
                wash.payment_method = payment_method
                wash.save()
            return self.retrieve(request, *args, **kwargs)
            
        elif action == 'mark_all_paid':
            payment_method = request.data.get('paymentMethod', PaymentMethod.CASH)
            washes = Wash.objects.filter(vehicle=instance, washstation=station, paid=False, redeemed=False)
            for w in washes:
                w.paid = True
                w.payment_method = payment_method
                w.save()
            return self.retrieve(request, *args, **kwargs)
            
        elif action == 'add' or action == 'remove' or action == 'set':
            vt = instance.vehicle_type
            current_count = Wash.objects.filter(vehicle=instance, washstation=station).count()
            new_count = current_count
            if action == 'add':
                new_count += 1
            elif action == 'remove':
                new_count = max(0, new_count -1)
            elif action == 'set':
                new_count = int(request.data.get('targetCount', 0))
                
            # Adjust washes to reach new count
            diff = new_count - current_count
            if diff > 0:
                for _ in range(diff):
                    Wash.objects.create(
                        vehicle=instance,
                        washstation=station,
                        status=WashStatus.DONE,
                        paid=True,
                        payment_method=PaymentMethod.CASH
                    )
            elif diff < 0:
                washes_to_delete = Wash.objects.filter(vehicle=instance, washstation=station).order_by('-created_at')[:abs(diff)]
                for w in washes_to_delete:
                    w.delete()
                    
            return self.retrieve(request, *args, **kwargs)
            
        return super().partial_update(request, *args, **kwargs)

class WashViewSet(TenantModelViewSet):
    queryset = Wash.objects.all()
    serializer_class = WashSerializer

class WashRequestViewSet(TenantModelViewSet):
    queryset = WashRequest.objects.all()
    serializer_class = WashRequestSerializer

class AppointmentViewSet(TenantModelViewSet):
    queryset = Appointment.objects.all()
    serializer_class = AppointmentSerializer
    
    def list(self, request, *args, **kwargs):
        station = get_washstation(request)
        if not station:
            return ok([])
        date = request.query_params.get('date', timezone.now().date().isoformat())
        appointments = Appointment.objects.filter(washstation=station, date=date)
        appt_data = []
        for a in appointments:
            appt_dict = AppointmentSerializer(a).data
            appt_dict['timeSlot'] = a.time_slot
            appt_dict['vehicle'] = VehicleSerializer(a.vehicle).data if a.vehicle else None
            appt_data.append(appt_dict)
        return ok(appt_data)

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

        # Calculate total revenue: package price + sum of service prices
        washes_30d = Wash.objects.filter(washstation=station, paid=True, created_at__gte=thirty_days_ago)
        revenue_30d = 0
        for wash in washes_30d:
            if not wash.redeemed:  # Don't count redeemed washes
                # Add package price if available
                if wash.package:
                    revenue_30d += wash.package.price
                # Add sum of service prices
                for service in wash.services.all():
                    revenue_30d += service.price

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


# --- WORKER SHIFT ---
class WorkerShiftView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        station = get_washstation(request)
        if not station:
            return err('Shop not found')
        
        worker_id = request.data.get('workerId')
        action = request.data.get('action')
        
        try:
            worker = Worker.objects.get(id=worker_id, washstation=station)
        except Worker.DoesNotExist:
            return err('Worker not found')
            
        if action == 'in':
            active_shift = Shift.objects.filter(worker=worker, clock_out__isnull=True).first()
            if active_shift:
                return err('Worker already clocked in')
            Shift.objects.create(worker=worker, washstation=station)
        elif action == 'out':
            active_shift = Shift.objects.filter(worker=worker, clock_out__isnull=True).order_by('-clock_in').first()
            if active_shift:
                active_shift.clock_out = timezone.now()
                active_shift.save()
                
        return ok({'message': 'Shift updated'})

# --- LIVE QUEUE ---
class LiveWashQueueView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        station = get_washstation(request)
        if not station:
            return Response([])

        if 'workers' in request.path:
            workers = Worker.objects.filter(washstation=station, active=True)
            worker_data = []
            for w in workers:
                worker_dict = WorkerSerializer(w).data
                active_shift = Shift.objects.filter(worker=w, clock_out__isnull=True).first()
                worker_dict['activeShift'] = {'clockIn': active_shift.clock_in.isoformat()} if active_shift else None
                worker_data.append(worker_dict)
            return ok(worker_data)

        active_washes = Wash.objects.filter(
            washstation=station,
            status__in=[WashStatus.QUEUED, WashStatus.WASHING, WashStatus.READY]
        ).prefetch_related('services')
        wash_data = []
        for w in active_washes:
            w_dict = WashSerializer(w).data
            w_dict['plateNo'] = w.vehicle.plate_no if w.vehicle else ''
            w_dict['vehicleType'] = VehicleTypeSerializer(w.vehicle.vehicle_type).data if (w.vehicle and w.vehicle.vehicle_type) else {'name': 'Car', 'icon': '🚗'}
            w_dict['customerName'] = w.vehicle.customer.name if (w.vehicle and w.vehicle.customer) else None
            w_dict['customerPhone'] = w.vehicle.customer.phone if (w.vehicle and w.vehicle.customer) else ''
            w_dict['packageName'] = w.package.name if w.package else None
            w_dict['packagePrice'] = w.package.price if w.package else None
            w_dict['packageColor'] = w.package.color if w.package else '#0ea5e9'
            w_dict['services'] = WashServiceSerializer(w.services.all(), many=True).data
            w_dict['worker'] = WorkerSerializer(w.worker).data if w.worker else None
            w_dict['washStartAt'] = w.wash_start_at.isoformat() if w.wash_start_at else None
            w_dict['createdAt'] = w.created_at.isoformat()
            wash_data.append(w_dict)
        return ok(wash_data)
        
    def patch(self, request, pk=None):
        station = get_washstation(request)
        if not station:
            return err('Shop not found')
            
        try:
            wash = Wash.objects.get(id=pk, washstation=station)
        except Wash.DoesNotExist:
            return err('Wash not found', 404)
            
        if 'status' in request.data:
            wash.status = request.data['status']
            if request.data['status'] == WashStatus.WASHING and not wash.wash_start_at:
                wash.wash_start_at = timezone.now()
            wash.save()
        if 'workerId' in request.data:
            worker_id = request.data['workerId']
            if worker_id:
                worker = Worker.objects.get(id=worker_id, washstation=station)
                wash.worker = worker
            else:
                wash.worker = None
            wash.save()
        if 'paymentMethod' in request.data:
            wash.payment_method = request.data['paymentMethod']
            wash.save()
        if 'paid' in request.data:
            wash.paid = request.data['paid']
            wash.save()
            
        return ok(WashSerializer(wash).data)
        
# --- WASH REQUESTS ---
class WashRequestsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        station = get_washstation(request)
        if not station:
            return err('Shop not found')
            
        pending_requests = WashRequest.objects.filter(
            washstation=station,
            status=RequestStatus.PENDING
        ).order_by('-created_at')
        
        packages = WashPackage.objects.filter(washstation=station, active=True)
        services = WashService.objects.filter(washstation=station, active=True)
        
        return ok({
            'requests': WashRequestSerializer(pending_requests, many=True).data,
            'packages': WashPackageSerializer(packages, many=True).data,
            'services': WashServiceSerializer(services, many=True).data
        })
        
    def patch(self, request, pk=None):
        station = get_washstation(request)
        if not station:
            return err('Shop not found')
            
        try:
            wash_request = WashRequest.objects.get(id=pk, washstation=station)
        except WashRequest.DoesNotExist:
            return err('Request not found', 404)
            
        action = request.data.get('action')
        
        if action == 'approve':
            package_id = request.data.get('packageId')
            package = None
            if package_id:
                try:
                    package = WashPackage.objects.get(id=package_id, washstation=station)
                except WashPackage.DoesNotExist:
                    package = None
            paid = request.data.get('paid', True)
            
            # Create wash
            wash = Wash.objects.create(
                washstation=station,
                vehicle=wash_request.vehicle,
                package=package,
                status=WashStatus.QUEUED,
                paid=paid
            )
            
            # Copy services from request to wash
            wash.services.add(*wash_request.services.all())
            
            # Mark request as resolved
            wash_request.status = RequestStatus.RESOLVED
            wash_request.resolved_at = timezone.now()
            wash_request.save()
            
            return ok({'message': 'Request approved, wash added to queue'})
            
        elif action == 'reject':
            wash_request.status = RequestStatus.CANCELLED
            wash_request.resolved_at = timezone.now()
            wash_request.save()
            
            return ok({'message': 'Request rejected'})
            
        return err('Invalid action')


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
        ).prefetch_related('services').order_by('-created_at')

        if export_format == 'csv':
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow([
                'Date', 'Plate No', 'Vehicle Type', 'Customer', 'Phone',
                'Package', 'Package Price', 'Services', 'Services Total', 'Total Price', 'Paid', 'Redeemed'
            ])
            for w in washes:
                services_str = ', '.join([s.name for s in w.services.all()])
                services_total = sum(s.price for s in w.services.all())
                package_price = w.package.price if w.package else 0
                total_price = package_price + services_total
                writer.writerow([
                    w.created_at.strftime('%Y-%m-%d'),
                    w.vehicle.plate_no if w.vehicle else '',
                    w.vehicle.vehicle_type.name if w.vehicle and w.vehicle.vehicle_type else '',
                    w.vehicle.customer.name if w.vehicle and w.vehicle.customer else '',
                    w.vehicle.customer.phone if w.vehicle and w.vehicle.customer else '',
                    w.package.name if w.package else 'Manual',
                    package_price,
                    services_str,
                    services_total,
                    total_price,
                    'Yes' if w.paid else 'No',
                    'Yes' if w.redeemed else 'No'
                ])

            from django.http import HttpResponse
            response = HttpResponse(output.getvalue(), content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="cleanpass-report-{days}days.csv"'
            return response

        total_revenue = 0
        unpaid_revenue = 0
        for w in washes:
            if w.paid and not w.redeemed:
                if w.package:
                    total_revenue += w.package.price
                for service in w.services.all():
                    total_revenue += service.price
            if not w.paid and not w.redeemed:
                if w.package:
                    unpaid_revenue += w.package.price
                for service in w.services.all():
                    unpaid_revenue += service.price
        redemptions = washes.filter(redeemed=True).count()

        return ok({
            'washes': washes.count(),
            'revenue': total_revenue,
            'unpaid': unpaid_revenue,
            'redemptions': redemptions
        })
class PublicCustomerView(APIView):
    """
    Public endpoint to fetch customer's loyalty card info.
    No login required, uses shopId and phone/plateNo.
    """
    permission_classes = [AllowAny]

    def get(self, request, shop_id):
        raw_phone = request.GET.get('phone')
        raw_plate_no = request.GET.get('plateNo')

        if not raw_phone and not raw_plate_no:
            return err('Phone or plate number is required.', 400)

        try:
            station = Washstation.objects.get(id=shop_id, active=True)
        except (Washstation.DoesNotExist, ValidationError, ValueError):
            return err('Shop not found or inactive.', 404)

        if raw_plate_no:
            # Look up by plate number
            try:
                vehicle = Vehicle.objects.get(
                    washstation=station, plate_no=raw_plate_no
                )
            except Vehicle.DoesNotExist:
                return ok({
                    'exists': False,
                    'vehicle': None,
                    'vehicles': []
                })
            customer = vehicle.customer
            vehicles = [vehicle]
        else:
            # Look up by phone
            try:
                customer = Customer.objects.get(
                    washstation=station, phone=raw_phone
                )
            except Customer.DoesNotExist:
                return ok({
                    'exists': False,
                    'vehicle': None,
                    'vehicles': []
                })
            vehicles = Vehicle.objects.filter(
                washstation=station, customer=customer
            )

        # Build response data
        if raw_plate_no and len(vehicles) >= 1:
            vehicle = vehicles[0]
            washes = Wash.objects.filter(
                washstation=station, vehicle=vehicle
            )
            active_washes = washes.count()
            vehicle_type = vehicle.vehicle_type
            wash_goal = vehicle_type.wash_goal if vehicle_type else 8
            is_reward_ready = wash_goal and active_washes >= wash_goal

            # Calculate total washes, redemptions, unpaid count
            all_washes = Wash.objects.filter(washstation=station, vehicle=vehicle).order_by('-created_at')
            total_washes = all_washes.count()
            total_redemptions = all_washes.filter(redeemed=True).count()
            unpaid_count = all_washes.filter(paid=False, redeemed=False).count()

            return ok({
                'exists': True,
                'shop': {'id': str(station.id), 'name': station.name},
                'vehicle': {
                    'plateNo': vehicle.plate_no,
                    'make': vehicle.make,
                    'color': vehicle.color,
                    'vehicleTypeName': vehicle_type.name if vehicle_type else 'Unknown',
                    'vehicleTypeIcon': vehicle_type.icon if vehicle_type else '🚗',
                },
                'vehicleType': {
                    'name': vehicle_type.name if vehicle_type else 'Unknown',
                    'icon': vehicle_type.icon if vehicle_type else '🚗',
                    'washGoal': wash_goal
                },
                'customer': {
                    'name': customer.name,
                    'phone': customer.phone
                },
                'activeWashes': active_washes,
                'totalWashes': total_washes,
                'totalRedemptions': total_redemptions,
                'unpaidCount': unpaid_count,
                'washGoal': wash_goal,
                'isRewardReady': is_reward_ready,
                'history': [
                    {
                        'id': str(w.id),
                        'createdAt': w.created_at.isoformat(),
                        'paid': w.paid,
                        'paymentMethod': w.payment_method,
                        'redeemed': w.redeemed,
                        'packageName': w.package.name if w.package else None
                    }
                    for w in all_washes
                ],
                'vehicles': None
            })
        else:
            # Return list of vehicles for phone lookup
            vehicle_list = []
            for v in vehicles:
                vt = v.vehicle_type
                vehicle_list.append({
                    'id': str(v.id),
                    'plateNo': v.plate_no,
                    'make': v.make,
                    'color': v.color,
                    'vehicleTypeName': vt.name if vt else 'Unknown',
                    'vehicleTypeIcon': vt.icon if vt else '🚗',
                    'washGoal': vt.wash_goal if vt else 8,
                    'activeWashes': Wash.objects.filter(washstation=station, vehicle=v).count()
                })
            return ok({
                'exists': True,
                'vehicle': None,
                'vehicles': vehicle_list
            })


class PublicTrackView(APIView):
    """
    Public endpoint to track wash status by plate number.
    No login required.
    """
    permission_classes = [AllowAny]

    def get(self, request, shop_id):
        try:
            station = Washstation.objects.get(id=shop_id, active=True)
        except (Washstation.DoesNotExist, ValidationError, ValueError):
            return err('Shop not found or inactive.', 404)

        plate_no = request.GET.get('plateNo')
        if not plate_no:
            return err('Plate number is required.', 400)

        # Try to get the vehicle
        try:
            vehicle = Vehicle.objects.get(washstation=station, plate_no=plate_no)
        except Vehicle.DoesNotExist:
            return ok({'found': False, 'shop': None, 'activeWash': None, 'queuePosition': None, 'activeStamps': 0, 'washGoal': 8, 'isRewardReady': False, 'recentWashes': []})

        # Get recent washes
        recent_washes = Wash.objects.filter(washstation=station, vehicle=vehicle).order_by('-created_at')[:10]
        total_washes = recent_washes.count()
        
        # Get wash goal from vehicle type
        vehicle_type = vehicle.vehicle_type
        wash_goal = vehicle_type.wash_goal if vehicle_type else 8

        # Calculate active stamps
        active_stamps = total_washes
        is_reward_ready = active_stamps >= wash_goal

        # Find active wash (status not done or no_wash)
        active_wash = None
        queue_position = None
        for wash in recent_washes:
            if wash.status not in ['done', 'no_wash']:
                active_wash = wash
                break
        
        # If no active wash, check pending requests
        if not active_wash:
            pending_requests = WashRequest.objects.filter(washstation=station, vehicle=vehicle, status='pending').order_by('-created_at')[:1]
            if pending_requests.exists():
                req = pending_requests.first()
                # Count pending requests before this one for queue position
                queue_pos = WashRequest.objects.filter(washstation=station, status='pending', created_at__lt=req.created_at).count() + 1
                return ok({
                    'found': True,
                    'shop': {'id': str(station.id), 'name': station.name},
                    'activeWash': {
                        'id': str(req.id),
                        'status': 'pending',
                        'packageName': req.package.name if req.package else None,
                        'workerName': None,
                        'createdAt': req.created_at.isoformat()
                    },
                    'queuePosition': queue_pos,
                    'activeStamps': active_stamps,
                    'washGoal': wash_goal,
                    'isRewardReady': is_reward_ready,
                    'recentWashes': []
                })

        # If there is an active wash, find queue position only if status is queued
        worker_name = None
        if active_wash:
            if active_wash.status == 'queued':
                queue_position = Wash.objects.filter(washstation=station, status='queued', created_at__lt=active_wash.created_at).count() + 1
            worker_name = active_wash.worker.name if active_wash.worker else None

        return ok({
            'found': True,
            'shop': {'id': str(station.id), 'name': station.name},
            'activeWash': {
                'id': str(active_wash.id) if active_wash else None,
                'status': active_wash.status if active_wash else 'no_wash',
                'packageName': active_wash.package.name if active_wash and active_wash.package else None,
                'workerName': worker_name if active_wash else None,
                'createdAt': active_wash.created_at.isoformat() if active_wash else None
            } if active_wash else None,
            'queuePosition': queue_position,
            'activeStamps': active_stamps,
            'washGoal': wash_goal,
            'isRewardReady': is_reward_ready,
            'recentWashes': [
                {
                    'id': str(w.id),
                    'createdAt': w.created_at.isoformat(),
                    'paid': w.paid,
                    'paymentMethod': w.payment_method,
                    'redeemed': w.redeemed,
                    'packageName': w.package.name if w.package else None
                }
                for w in recent_washes
            ]
        })


class PublicWashRequestView(APIView):
    permission_classes = [AllowAny] # No login required!

    def post(self, request, shop_id):
        try:
            try:
                station = Washstation.objects.get(id=shop_id, active=True)
            except (Washstation.DoesNotExist, ValidationError, ValueError):
                return err('Shop not found or inactive.', 404)

            phone = request.data.get('phone')
            plate_no = request.data.get('plate_no')
            service_ids = request.data.get('serviceIds', [])
            
            if not phone or not plate_no:
                return err('Phone and plate number are required.', 400)

            # 1. Create or get the customer
            customer, _ = Customer.objects.get_or_create(
                washstation=station, phone=phone,
                defaults={'name': f'Customer {phone[-4:]}'}
            )

            # 2. Create or get the vehicle
            normalized_plate = plate_no.replace(' ', '').upper()
            vehicle, _ = Vehicle.objects.get_or_create(
                washstation=station, plate_no=normalized_plate,
                defaults={'customer': customer}
            )

            # 3. Create the wash request
            wash_request = WashRequest.objects.create(
                washstation=station, phone=phone, plate_no=normalized_plate,
                customer=customer, vehicle=vehicle, status=RequestStatus.PENDING
            )
            
            # Add selected services
            if service_ids:
                services = WashService.objects.filter(id__in=service_ids, washstation=station)
                wash_request.services.add(*services)

            return ok({
                'message': 'Wash request submitted successfully!',
                'requestId': str(wash_request.id)
            }, 201)
        except Exception as e:
            import traceback
            print(f"ERROR creating wash request: {str(e)}")
            print(traceback.format_exc())
            return err(f'Something went wrong: {str(e)}', 500)
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
        ).select_related('package', 'worker', 'vehicle', 'vehicle__customer', 'vehicle__vehicle_type').prefetch_related('services')

        # Build wash list data
        wash_list = []
        for w in washes:
            w_dict = WashSerializer(w).data
            w_dict['plateNo'] = w.vehicle.plate_no if w.vehicle else ''
            w_dict['vehicleType'] = VehicleTypeSerializer(w.vehicle.vehicle_type).data if (w.vehicle and w.vehicle.vehicle_type) else {'name': 'Car', 'icon': '🚗'}
            w_dict['customerName'] = w.vehicle.customer.name if (w.vehicle and w.vehicle.customer) else None
            w_dict['customerPhone'] = w.vehicle.customer.phone if (w.vehicle and w.vehicle.customer) else ''
            w_dict['packageName'] = w.package.name if w.package else None
            w_dict['packagePrice'] = w.package.price if w.package else None
            w_dict['packageColor'] = w.package.color if w.package else '#0ea5e9'
            w_dict['services'] = WashServiceSerializer(w.services.all(), many=True).data
            w_dict['worker'] = WorkerSerializer(w.worker).data if w.worker else None
            w_dict['createdAt'] = w.created_at.isoformat()
            # Calculate total price
            total_price = 0
            if w.package:
                total_price += w.package.price
            for service in w.services.all():
                total_price += service.price
            w_dict['totalPrice'] = total_price
            wash_list.append(w_dict)

        # Payment method breakdown
        by_method = {}
        for w in washes:
            m = w.payment_method or 'cash'
            if m not in by_method:
                by_method[m] = {'count': 0, 'amount': 0}
            by_method[m]['count'] += 1
            amount = w.package.price if w.package else 0
            for service in w.services.all():
                amount += service.price
            by_method[m]['amount'] += amount

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
        total_revenue = 0
        total_unpaid = 0
        for w in washes:
            if w.paid and not w.redeemed:
                if w.package:
                    total_revenue += w.package.price
                for service in w.services.all():
                    total_revenue += service.price
            if not w.paid:
                if w.package:
                    total_unpaid += w.package.price
                for service in w.services.all():
                    total_unpaid += service.price
        redeemed = washes.filter(redeemed=True).count()

        return ok({
            'date': date_str,
            'totalWashes': total_washes,
            'totalRevenue': total_revenue,
            'totalUnpaid': total_unpaid,
            'redeemed': redeemed,
            'byMethod': by_method,
            'byWorker': list(by_worker.values()),
            'washes': wash_list
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

        services = WashService.objects.filter(washstation=station, active=True)
        service_data = WashServiceSerializer(services, many=True).data

        # Return only safe, public-facing data
        return ok({
            'id': str(station.id),
            'name': station.name,
            'logo': station.washstation_logo,
            'themeColor': station.theme_color,
            'wifiName': station.wifi_name,
            'wifiPassword': station.wifi_password,
            'wifiType': station.wifi_type,
            'wifiHidden': station.wifi_hidden,
            'services': service_data,
        })