import io
import qrcode
import base64
from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Shop, Worker, Shift
from .serializers import (
    RegisterSerializer, ShopSerializer, ShopUpdateSerializer,
    WorkerSerializer, ShiftSerializer,
)


def ok(data, status_code=200):
    return Response({'success': True, 'data': data}, status=status_code)


def err(error, status_code=400):
    return Response({'success': False, 'error': error}, status=status_code)


def get_shop(request):
    if not hasattr(request.user, 'shop_profile'):
        return None
    return request.user.shop_profile


# --- AUTH ---

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            first_error = next(iter(serializer.errors.values()))[0]
            return err(str(first_error))
        user, shop = serializer.save()
        refresh = RefreshToken.for_user(user)
        return ok({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'shopId': str(shop.id),
            'name': shop.name,
        }, 201)


class LoginView(APIView):
    """JWT login by email+password (returns access+refresh tokens)."""
    permission_classes = [AllowAny]

    def post(self, request):
        from django.contrib.auth import authenticate
        email = (request.data.get('email') or '').lower().strip()
        password = request.data.get('password', '')
        if not email or not password:
            return err('Email and password required')
        try:
            shop = Shop.objects.get(email=email)
        except Shop.DoesNotExist:
            return err('No account found with this email')
        user = authenticate(request, username=shop.user.username, password=password)
        if not user:
            return err('Incorrect password')
        refresh = RefreshToken.for_user(user)
        return ok({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'shopId': str(shop.id),
            'name': shop.name,
        })


# --- SHOP PROFILE ---

class ShopMeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile linked', 404)
        serializer = ShopSerializer(shop)
        return ok(serializer.data)

    def patch(self, request):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile linked', 404)
        serializer = ShopUpdateSerializer(shop, data=request.data, partial=True)
        if not serializer.is_valid():
            return err(str(serializer.errors))
        serializer.save()
        return ok(ShopSerializer(shop).data)


# --- QR CODE ---

class QRCodeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile linked', 404)
        base_url = getattr(settings, 'NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
        scan_url = f"{base_url}/scan/{shop.id}"
        buffer = io.BytesIO()
        img = qrcode.make(scan_url, box_size=10, border=2)
        img.save(buffer, format='PNG')
        qr_data_url = "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode()
        shop.qr_code = qr_data_url
        shop.save(update_fields=['qr_code'])
        return ok({'qrCode': qr_data_url, 'scanUrl': scan_url})


# --- WIFI ---

class WifiView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile linked', 404)
        if not shop.wifi_name:
            return ok({'configured': False})
        wifi_str = f"WIFI:T:{shop.wifi_type or 'WPA'};S:{shop.wifi_name};P:{shop.wifi_password or ''};H:{'true' if shop.wifi_hidden else 'false'};;"
        buffer = io.BytesIO()
        img = qrcode.make(wifi_str, box_size=10, border=2)
        img.save(buffer, format='PNG')
        qr_data_url = "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode()
        return ok({
            'configured': True,
            'ssid': shop.wifi_name,
            'password': shop.wifi_password,
            'qrCode': qr_data_url,
        })

    def patch(self, request):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile linked', 404)
        for field in ['wifi_name', 'wifi_password', 'wifi_type', 'wifi_hidden']:
            camel = ''.join(w.capitalize() if i else w for i, w in enumerate(field.split('_')))
            if camel in request.data:
                setattr(shop, field, request.data[camel])
        shop.save()
        return ok({'saved': True})


# --- WORKERS ---

class WorkerListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile linked', 404)
        workers = Worker.objects.filter(shop=shop, active=True).prefetch_related('washes', 'shifts').order_by('created_at')
        serializer = WorkerSerializer(workers, many=True)
        return ok(serializer.data)

    def post(self, request):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile linked', 404)
        name = (request.data.get('name') or '').strip()
        if not name:
            return err('Name required')
        worker = Worker.objects.create(
            shop=shop,
            name=name,
            phone=(request.data.get('phone') or '').strip() or None,
            pin=request.data.get('pin', '0000'),
            commission=int(request.data.get('commission', 0)),
        )
        return ok(WorkerSerializer(worker).data, 201)


class WorkerDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile linked', 404)
        try:
            worker = Worker.objects.get(id=pk, shop=shop)
        except Worker.DoesNotExist:
            return err('Worker not found', 404)
        for field in ['name', 'phone', 'pin', 'commission']:
            if field in request.data:
                setattr(worker, field, request.data[field])
        worker.save()
        return ok({'updated': True})

    def delete(self, request, pk):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile linked', 404)
        Worker.objects.filter(id=pk, shop=shop).update(active=False)
        return ok({'deleted': True})


class ShiftView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile linked', 404)
        worker_id = request.data.get('workerId')
        action = request.data.get('action')  # 'in' or 'out'
        try:
            worker = Worker.objects.get(id=worker_id, shop=shop)
        except Worker.DoesNotExist:
            return err('Worker not found', 404)
        if action == 'in':
            if Shift.objects.filter(worker=worker, clock_out__isnull=True).exists():
                return err('Worker already clocked in')
            shift = Shift.objects.create(shop=shop, worker=worker)
            return ok({'id': str(shift.id), 'clockIn': shift.clock_in.isoformat()})
        else:
            shift = Shift.objects.filter(worker=worker, clock_out__isnull=True).order_by('-clock_in').first()
            if not shift:
                return err('No active shift found')
            shift.clock_out = timezone.now()
            shift.save()
            return ok({'id': str(shift.id), 'clockIn': shift.clock_in.isoformat(), 'clockOut': shift.clock_out.isoformat()})


# --- DASHBOARD STATS ---

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile linked', 400)

        from django.db.models import Sum
        from datetime import timedelta
        from washstations.models import Wash, WashRequest, Appointment
        from vehicles.models import Vehicle

        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        past_30_days = now - timedelta(days=30)
        past_7_days = now - timedelta(days=6)

        total_vehicles = Vehicle.objects.filter(shop=shop).count()
        total_washes = Wash.objects.filter(shop=shop, redeemed=False).count()
        total_redemptions = Wash.objects.filter(shop=shop, redeemed=True).count()
        pending_requests = WashRequest.objects.filter(shop=shop, status='pending').count()
        today_washes = Wash.objects.filter(shop=shop, created_at__gte=today_start, status='done').count()
        unpaid_washes = Wash.objects.filter(shop=shop, paid=False, redeemed=False).exclude(status='done').count()
        upcoming_appts = Appointment.objects.filter(shop=shop, status__in=['pending', 'confirmed']).count()

        revenue_q = Wash.objects.filter(shop=shop, paid=True, created_at__gte=past_30_days).aggregate(total=Sum('package__price'))
        revenue_30d = revenue_q['total'] or 0

        days_7 = []
        for i in range(7):
            target_day = past_7_days + timedelta(days=i)
            day_start = target_day.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = target_day.replace(hour=23, minute=59, second=59, microsecond=999999)
            count = Wash.objects.filter(
                shop=shop, status='done',
                created_at__range=(day_start, day_end)
            ).count()
            days_7.append({'date': target_day.strftime('%a'), 'count': count})

        return ok({
            'totalVehicles': total_vehicles,
            'totalWashes': total_washes,
            'totalRedemptions': total_redemptions,
            'pendingRequests': pending_requests,
            'todayWashes': today_washes,
            'unpaidWashes': unpaid_washes,
            'upcomingAppts': upcoming_appts,
            'revenue30d': revenue_30d,
            'days7': days_7,
        })
