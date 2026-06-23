import uuid
from django.utils import timezone
from django.db.models import Sum
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from accounts.models import Shop, Worker
from vehicles.models import Vehicle, VehicleType
from customers.models import Customer
from .models import Wash, WashPackage, WashRequest, Appointment


def ok(data, status_code=200):
    return Response({'success': True, 'data': data}, status=status_code)


def err(error, status_code=400):
    return Response({'success': False, 'error': error}, status=status_code)


def get_shop(request):
    if not hasattr(request.user, 'shop_profile'):
        return None
    return request.user.shop_profile


def normalize_plate(plate):
    return plate.upper().replace('  ', ' ').strip()


def normalize_phone(phone):
    p = phone.replace(' ', '').replace('-', '').replace('(', '').replace(')', '').strip()
    if p.startswith('+'):
        p = p[1:]
    if p.startswith('977'):
        p = p[3:]
    if p.startswith('0'):
        p = p[1:]
    return p


def serialize_wash(w):
    return {
        'id': str(w.id),
        'status': w.status,
        'paid': w.paid,
        'notes': w.notes,
        'plateNo': w.vehicle.plate_no,
        'customerName': w.vehicle.customer.name,
        'customerPhone': w.vehicle.customer.phone,
        'packageName': w.package.name if w.package else None,
        'packagePrice': w.package.price if w.package else None,
        'packageColor': w.package.color if w.package else None,
        'vehicleType': {
            'name': w.vehicle.vehicle_type.name,
            'icon': w.vehicle.vehicle_type.icon,
        },
        'worker': {'id': str(w.worker.id), 'name': w.worker.name} if w.worker else None,
        'createdAt': w.created_at.isoformat(),
        'washStartAt': w.wash_start_at.isoformat() if w.wash_start_at else None,
        'paymentMethod': w.payment_method,
        'redeemed': w.redeemed,
    }


# --- QUEUE ---

class QueueView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile linked', 400)
        washes = Wash.objects.filter(
            shop=shop, status__in=['queued', 'washing']
        ).select_related('vehicle__customer', 'vehicle__vehicle_type', 'package', 'worker').order_by('created_at')
        return ok([serialize_wash(w) for w in washes])


class QueueDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile linked', 400)
        try:
            wash = Wash.objects.get(id=pk, shop=shop)
        except Wash.DoesNotExist:
            return err('Wash not found', 404)

        data = request.data
        if 'status' in data:
            wash.status = data['status']
            if data['status'] == 'washing' and not wash.wash_start_at:
                wash.wash_start_at = timezone.now()
            if data['status'] == 'done':
                wash.wash_done_at = timezone.now()
                # SMS notification
                if shop.sms_enabled and shop.sms_api_key and wash.vehicle.customer.phone:
                    try:
                        import requests as http_requests
                        msg = f"CleanPass: Your {wash.vehicle.vehicle_type.name} ({wash.vehicle.plate_no}) wash is complete at {shop.name}. Ready for pickup!"
                        http_requests.post('https://api.sparrowsms.com/v2/sms/', json={
                            'token': shop.sms_api_key,
                            'identity': shop.sms_sender_id or 'CleanPass',
                            'to': wash.vehicle.customer.phone,
                            'text': msg,
                        }, timeout=5)
                    except Exception:
                        pass

        if 'workerId' in data:
            wash.worker_id = data['workerId'] or None
        if 'paid' in data:
            wash.paid = data['paid']
        if 'paymentMethod' in data:
            wash.payment_method = data['paymentMethod']
        if 'notes' in data:
            wash.notes = data['notes']

        wash.save()
        return ok(serialize_wash(wash))


# --- PACKAGES ---

class PackageListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile linked', 404)
        packages = WashPackage.objects.filter(shop=shop).select_related('vehicle_type').order_by('created_at')
        data = [{'id': str(p.id), 'name': p.name, 'description': p.description, 'price': p.price, 'stampValue': p.stamp_value, 'color': p.color, 'active': p.active, 'vehicleTypeId': str(p.vehicle_type_id) if p.vehicle_type_id else None, 'vehicleType': {'id': str(p.vehicle_type.id), 'name': p.vehicle_type.name} if p.vehicle_type else None} for p in packages]
        return ok(data)

    def post(self, request):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile linked', 404)
        name = (request.data.get('name') or '').strip()
        price = request.data.get('price')
        if not name or not price:
            return err('Name and price required')
        pkg = WashPackage.objects.create(
            shop=shop,
            name=name,
            description=(request.data.get('description') or '').strip() or None,
            price=int(price),
            stamp_value=int(request.data.get('stampValue', 1)),
            color=request.data.get('color', '#0ea5e9'),
            vehicle_type_id=request.data.get('vehicleTypeId') or None,
        )
        return ok({'id': str(pkg.id), 'name': pkg.name, 'price': pkg.price, 'stampValue': pkg.stamp_value, 'color': pkg.color}, 201)


class PackageDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile linked', 404)
        updated = WashPackage.objects.filter(id=pk, shop=shop).update(
            **{k: v for k, v in {
                'name': request.data.get('name'),
                'description': request.data.get('description'),
                'price': int(request.data['price']) if 'price' in request.data else None,
                'stamp_value': int(request.data['stampValue']) if 'stampValue' in request.data else None,
                'color': request.data.get('color'),
                'active': request.data.get('active'),
                'vehicle_type_id': request.data.get('vehicleTypeId'),
            }.items() if v is not None}
        )
        if not updated:
            return err('Not found', 404)
        return ok({'updated': True})

    def delete(self, request, pk):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile linked', 404)
        WashPackage.objects.filter(id=pk, shop=shop).update(active=False)
        return ok({'deleted': True})


# --- WASH REQUESTS (APPROVALS) ---

class RequestListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile linked', 404)
        requests = WashRequest.objects.filter(shop=shop, status='pending').select_related('package').order_by('created_at')
        packages = WashPackage.objects.filter(shop=shop, active=True)
        data = {
            'requests': [{'id': str(r.id), 'phone': r.phone, 'plateNo': r.plate_no, 'createdAt': r.created_at.isoformat(), 'package': {'name': r.package.name, 'price': r.package.price, 'color': r.package.color} if r.package else None} for r in requests],
            'packages': [{'id': str(p.id), 'name': p.name, 'price': p.price, 'color': p.color} for p in packages],
        }
        return ok(data)


class RequestDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile linked', 404)
        action = request.data.get('action')
        if action not in ('approve', 'reject'):
            return err('Invalid action')

        try:
            wash_request = WashRequest.objects.get(id=pk, shop=shop, status='pending')
        except WashRequest.DoesNotExist:
            return err('Request not found or already resolved', 404)

        if action == 'reject':
            wash_request.status = 'rejected'
            wash_request.resolved_at = timezone.now()
            wash_request.save()
            return ok({'message': 'Request rejected'})

        # Approve: upsert customer + vehicle, create wash entry (queued)
        package_id = request.data.get('packageId') or wash_request.package_id
        is_paid = request.data.get('paid', True)

        customer, _ = Customer.objects.get_or_create(
            phone=wash_request.phone, shop=shop,
            defaults={'name': None}
        )

        vehicle_type_id = str(wash_request.vehicle_type_id) if wash_request.vehicle_type_id else None
        if not vehicle_type_id:
            vt = VehicleType.objects.filter(shop=shop, active=True).first()
            vehicle_type_id = str(vt.id) if vt else None
        if not vehicle_type_id:
            return err('No vehicle type found', 400)

        vehicle, _ = Vehicle.objects.get_or_create(
            plate_no=wash_request.plate_no, shop=shop,
            defaults={'customer': customer, 'vehicle_type_id': vehicle_type_id}
        )

        vehicle_type = VehicleType.objects.get(id=vehicle_type_id)
        wash_goal = vehicle_type.wash_goal

        # Auto-redeem if card is full
        current_active = Wash.objects.filter(vehicle=vehicle, shop=shop, redeemed=False, status='done').count()
        if current_active >= wash_goal:
            to_redeem = list(Wash.objects.filter(vehicle=vehicle, shop=shop, redeemed=False, status='done').order_by('created_at')[:wash_goal])
            Wash.objects.filter(id__in=[w.id for w in to_redeem]).update(redeemed=True, redeemed_at=timezone.now())

        stamp_value = 1
        pkg = None
        if package_id:
            try:
                pkg = WashPackage.objects.get(id=package_id, shop=shop)
                stamp_value = pkg.stamp_value
            except WashPackage.DoesNotExist:
                pass

        for _ in range(stamp_value):
            Wash.objects.create(shop=shop, vehicle=vehicle, package=pkg, paid=is_paid, status='queued')

        wash_request.status = 'approved'
        wash_request.resolved_at = timezone.now()
        wash_request.customer = customer
        wash_request.vehicle = vehicle
        wash_request.save()

        active_washes = Wash.objects.filter(vehicle=vehicle, shop=shop, redeemed=False, status='done').count()
        return ok({'message': 'Approved — added to queue', 'vehicle': {'plateNo': vehicle.plate_no}, 'activeWashes': active_washes, 'washGoal': wash_goal, 'isRewardReady': active_washes >= wash_goal, 'paid': is_paid})


# --- REPORTS ---

class ReportsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile linked', 404)
        days = int(request.query_params.get('days', 30))
        fmt = request.query_params.get('format')
        since = timezone.now() - __import__('datetime').timedelta(days=days)
        washes = Wash.objects.filter(shop=shop, created_at__gte=since).select_related(
            'vehicle__customer', 'vehicle__vehicle_type', 'package'
        ).order_by('-created_at')

        if fmt == 'csv':
            lines = ['Date,Plate No,Vehicle Type,Customer,Phone,Package,Price,Paid,Redeemed']
            for w in washes:
                lines.append(','.join([
                    w.created_at.strftime('%Y-%m-%d'),
                    w.vehicle.plate_no, w.vehicle.vehicle_type.name,
                    w.vehicle.customer.name or '', w.vehicle.customer.phone,
                    w.package.name if w.package else 'Manual',
                    str(w.package.price if w.package else 0),
                    'Yes' if w.paid else 'No', 'Yes' if w.redeemed else 'No',
                ]))
            from django.http import HttpResponse
            return HttpResponse('\n'.join(lines), content_type='text/csv', headers={'Content-Disposition': 'attachment; filename="cleanpass-report.csv"'})

        total_revenue = sum(w.package.price if w.package and w.paid else 0 for w in washes)
        unpaid_revenue = sum(w.package.price if w.package and not w.paid and not w.redeemed else 0 for w in washes)
        return ok({'washes': washes.count(), 'revenue': total_revenue, 'unpaid': unpaid_revenue, 'redemptions': sum(1 for w in washes if w.redeemed)})


# --- SUMMARY ---

class SummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile linked', 404)
        date = request.query_params.get('date', timezone.now().strftime('%Y-%m-%d'))
        from datetime import datetime
        start = timezone.make_aware(datetime.strptime(date + 'T00:00:00', '%Y-%m-%dT%H:%M:%S'))
        end = timezone.make_aware(datetime.strptime(date + 'T23:59:59', '%Y-%m-%dT%H:%M:%S'))
        washes = list(Wash.objects.filter(shop=shop, created_at__range=(start, end), status='done').select_related('package', 'worker'))

        by_method = {}
        for w in washes:
            m = w.payment_method or 'cash'
            if m not in by_method:
                by_method[m] = {'count': 0, 'amount': 0}
            by_method[m]['count'] += 1
            by_method[m]['amount'] += w.package.price if w.package else 0

        workers = {str(w.id): w for w in Worker.objects.filter(shop=shop)}
        by_worker = {}
        for w in washes:
            if not w.worker_id:
                continue
            wid = str(w.worker_id)
            worker = workers.get(wid)
            if not worker:
                continue
            if wid not in by_worker:
                by_worker[wid] = {'name': worker.name, 'count': 0, 'commission': 0}
            by_worker[wid]['count'] += 1
            by_worker[wid]['commission'] += worker.commission

        return ok({
            'date': date,
            'totalWashes': len(washes),
            'totalRevenue': sum(w.package.price if w.package and w.paid else 0 for w in washes),
            'totalUnpaid': sum(w.package.price if w.package and not w.paid else 0 for w in washes),
            'byMethod': by_method,
            'byWorker': list(by_worker.values()),
            'redeemed': sum(1 for w in washes if w.redeemed),
        })


# --- PUBLIC ENDPOINTS ---

class PublicScanView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        shop_id = request.query_params.get('shopId')
        if not shop_id:
            return err('shopId required')
        try:
            shop = Shop.objects.get(id=shop_id)
        except (Shop.DoesNotExist, Exception):
            return err('Wash station not found', 404)
        if not shop.active:
            return err('Wash station not active', 404)

        v_types = VehicleType.objects.filter(shop=shop, active=True)
        packages = WashPackage.objects.filter(shop=shop, active=True)

        return ok({
            'id': str(shop.id),
            'name': shop.name,
            'address': shop.address,
            'shopLogo': shop.shop_logo,
            'themeColor': shop.theme_color,
            'active': shop.active,
            'vehicleTypes': [{'id': str(vt.id), 'name': vt.name, 'icon': vt.icon, 'washGoal': vt.wash_goal} for vt in v_types],
            'packages': [{'id': str(p.id), 'name': p.name, 'description': p.description, 'price': p.price, 'stampValue': p.stamp_value, 'color': p.color, 'vehicleTypeId': str(p.vehicle_type_id) if p.vehicle_type_id else None} for p in packages],
        })


class PublicTrackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        raw_plate = request.query_params.get('plateNo', '')
        shop_id = request.query_params.get('shopId')
        if not raw_plate:
            return err('plateNo required')
        plate_no = normalize_plate(raw_plate)

        try:
            vehicle = Vehicle.objects.filter(
                plate_no=plate_no,
                **({'shop_id': shop_id} if shop_id else {})
            ).select_related('vehicle_type', 'customer', 'shop').order_by('-created_at').first()
        except Exception:
            return ok({'found': False, 'plateNo': plate_no})

        if not vehicle:
            # Check pending request
            if shop_id:
                pending = WashRequest.objects.filter(plate_no=plate_no, shop_id=shop_id, status='pending').order_by('-created_at').first()
                if pending:
                    shop = Shop.objects.filter(id=shop_id).first()
                    return ok({'found': True, 'plateNo': plate_no, 'shop': {'name': shop.name, 'themeColor': shop.theme_color} if shop else None, 'activeWash': {'status': 'pending_approval', 'packageName': None, 'workerName': None, 'createdAt': pending.created_at.isoformat()}, 'queuePosition': None, 'recentWashes': [], 'activeStamps': 0, 'washGoal': 8, 'isRewardReady': False})
            return ok({'found': False, 'plateNo': plate_no})

        pending_request = WashRequest.objects.filter(vehicle=vehicle, status='pending').order_by('-created_at').first()
        active_wash = Wash.objects.filter(vehicle=vehicle, status__in=['queued', 'washing']).select_related('package', 'worker').order_by('-created_at').first()

        queue_position = None
        if active_wash:
            queue_position = Wash.objects.filter(shop=vehicle.shop, status__in=['queued', 'washing'], created_at__lt=active_wash.created_at).count() + 1

        recent_washes = list(Wash.objects.filter(vehicle=vehicle, status='done').select_related('package').order_by('-created_at')[:5])
        active_stamps = Wash.objects.filter(vehicle=vehicle, shop=vehicle.shop, redeemed=False, status='done').count()
        wash_goal = vehicle.vehicle_type.wash_goal
        is_reward_ready = active_stamps >= wash_goal

        display_wash = None
        if active_wash:
            display_wash = {'status': active_wash.status, 'packageName': active_wash.package.name if active_wash.package else None, 'workerName': active_wash.worker.name if active_wash.worker else None, 'startedAt': active_wash.wash_start_at.isoformat() if active_wash.wash_start_at else None, 'createdAt': active_wash.created_at.isoformat()}
        elif pending_request:
            display_wash = {'status': 'pending_approval', 'packageName': None, 'workerName': None, 'startedAt': None, 'createdAt': pending_request.created_at.isoformat()}

        return ok({
            'found': True, 'plateNo': plate_no,
            'shop': {'name': vehicle.shop.name, 'themeColor': vehicle.shop.theme_color, 'phone': vehicle.shop.phone},
            'vehicle': {'make': vehicle.make, 'color': vehicle.color},
            'vehicleType': {'name': vehicle.vehicle_type.name, 'icon': vehicle.vehicle_type.icon, 'washGoal': wash_goal},
            'customer': {'name': vehicle.customer.name},
            'activeWash': display_wash,
            'queuePosition': queue_position,
            'recentWashes': [{'id': str(w.id), 'createdAt': w.created_at.isoformat(), 'packageName': w.package.name if w.package else None, 'paid': w.paid, 'paymentMethod': w.payment_method, 'redeemed': w.redeemed} for w in recent_washes],
            'activeStamps': active_stamps,
            'washGoal': wash_goal,
            'isRewardReady': is_reward_ready,
        })


class PublicCustomerView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        shop_id = request.query_params.get('shopId')
        raw_phone = request.query_params.get('phone')
        raw_plate = request.query_params.get('plateNo')
        if not shop_id:
            return err('shopId required')

        try:
            shop = Shop.objects.get(id=shop_id)
        except Shop.DoesNotExist:
            return err('Shop not found', 404)

        if raw_plate:
            plate_no = normalize_plate(raw_plate)
            try:
                vehicle = Vehicle.objects.get(plate_no=plate_no, shop=shop)
            except Vehicle.DoesNotExist:
                return ok({'exists': False, 'shopName': shop.name})
            washes = list(vehicle.washes.filter(status='done').select_related('package').order_by('-created_at')[:20])
            active_washes = [w for w in washes if not w.redeemed]
            unpaid = [w for w in active_washes if not w.paid]
            return ok({
                'exists': True, 'shopName': shop.name, 'themeColor': shop.theme_color,
                'customer': {'name': vehicle.customer.name, 'phone': vehicle.customer.phone},
                'vehicle': {'plateNo': vehicle.plate_no, 'make': vehicle.make, 'color': vehicle.color},
                'vehicleType': {'name': vehicle.vehicle_type.name, 'icon': vehicle.vehicle_type.icon, 'washGoal': vehicle.vehicle_type.wash_goal},
                'activeWashes': len(active_washes), 'totalWashes': len(washes),
                'totalRedemptions': sum(1 for w in washes if w.redeemed),
                'unpaidCount': len(unpaid),
                'isRewardReady': len(active_washes) >= vehicle.vehicle_type.wash_goal,
                'history': [{'id': str(w.id), 'createdAt': w.created_at.isoformat(), 'redeemed': w.redeemed, 'paid': w.paid, 'packageName': w.package.name if w.package else None} for w in washes[:10]],
            })

        if raw_phone:
            phone = normalize_phone(raw_phone)
            try:
                customer = Customer.objects.get(phone=phone, shop=shop)
            except Customer.DoesNotExist:
                return ok({'exists': False, 'shopName': shop.name})
            vehicles = Vehicle.objects.filter(customer=customer, shop=shop).select_related('vehicle_type').prefetch_related('washes')
            return ok({'exists': True, 'shopName': shop.name, 'customer': {'name': customer.name, 'phone': customer.phone}, 'vehicles': [{'id': str(v.id), 'plateNo': v.plate_no, 'vehicleTypeName': v.vehicle_type.name, 'vehicleTypeIcon': v.vehicle_type.icon, 'washGoal': v.vehicle_type.wash_goal, 'activeWashes': v.washes.filter(redeemed=False).count()} for v in vehicles]})

        return err('phone or plateNo required')


class PublicWashView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        shop_id = request.data.get('shopId')
        raw_phone = request.data.get('phone', '')
        name = request.data.get('name', '')
        raw_plate = request.data.get('plateNo', '')
        vehicle_type_id = request.data.get('vehicleTypeId')
        package_id = request.data.get('packageId')

        if not shop_id or not raw_phone.strip() or not raw_plate.strip() or not vehicle_type_id:
            return err('shopId, phone, plateNo and vehicleTypeId required')

        phone = normalize_phone(raw_phone)
        plate_no = normalize_plate(raw_plate)

        try:
            shop = Shop.objects.get(id=shop_id)
        except Shop.DoesNotExist:
            return err('Wash station not found', 404)
        if not shop.active:
            return err('Wash station not active', 403)
        if not shop.is_plan_active():
            return err('This wash station is currently inactive', 403)

        # 5-min cooldown
        from datetime import timedelta
        five_min_ago = timezone.now() - timedelta(minutes=5)
        if WashRequest.objects.filter(shop=shop, plate_no=plate_no, status='pending', created_at__gte=five_min_ago).exists():
            return ok({'alreadyPending': True, 'message': 'You already have a pending request.'})

        # Vehicle limit check
        existing_vehicle = Vehicle.objects.filter(plate_no=plate_no, shop=shop).first()
        if not existing_vehicle:
            vehicle_limit = shop.get_vehicle_limit()
            if vehicle_limit is not None:
                count = Vehicle.objects.filter(shop=shop).count()
                if count >= vehicle_limit:
                    return err(f'Limit of {vehicle_limit} vehicles reached.', 403)

        customer, _ = Customer.objects.get_or_create(phone=phone, shop=shop, defaults={'name': name.strip() or None})
        if name.strip() and not customer.name:
            customer.name = name.strip()
            customer.save(update_fields=['name'])

        vehicle, _ = Vehicle.objects.get_or_create(
            plate_no=plate_no, shop=shop,
            defaults={'customer': customer, 'vehicle_type_id': vehicle_type_id}
        )

        WashRequest.objects.create(
            shop=shop, phone=phone, plate_no=plate_no,
            vehicle_type_id=vehicle_type_id, package_id=package_id or None,
            customer=customer, vehicle=vehicle, status='pending'
        )

        active_washes = Wash.objects.filter(vehicle=vehicle, shop=shop, redeemed=False).count()
        vehicle_type = VehicleType.objects.filter(id=vehicle_type_id).first()

        return ok({
            'alreadyPending': False,
            'customer': {'name': customer.name, 'phone': customer.phone},
            'vehicle': {'plateNo': vehicle.plate_no, 'vehicleTypeId': vehicle_type_id},
            'activeWashes': active_washes,
            'washGoal': vehicle_type.wash_goal if vehicle_type else 8,
            'vehicleTypeName': vehicle_type.name if vehicle_type else None,
            'vehicleTypeIcon': vehicle_type.icon if vehicle_type else None,
        })


class PublicApprovalStatusView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        raw_phone = request.query_params.get('phone', '')
        raw_plate = request.query_params.get('plateNo', '')
        shop_id = request.query_params.get('shopId')
        if not raw_phone or not raw_plate or not shop_id:
            return err('phone, plateNo and shopId required')

        phone = normalize_phone(raw_phone)
        plate_no = normalize_plate(raw_plate)

        req = WashRequest.objects.filter(phone=phone, plate_no=plate_no, shop_id=shop_id).order_by('-created_at').first()
        if not req:
            return ok({'status': 'pending'})
        if req.status == 'pending':
            return ok({'status': 'pending'})
        if req.status == 'rejected':
            return ok({'status': 'rejected'})

        try:
            vehicle = Vehicle.objects.get(plate_no=plate_no, shop_id=shop_id)
            active_washes = Wash.objects.filter(vehicle=vehicle, shop_id=shop_id, redeemed=False).count()
            is_reward_ready = active_washes >= vehicle.vehicle_type.wash_goal
            return ok({'status': 'approved', 'activeWashes': active_washes, 'washGoal': vehicle.vehicle_type.wash_goal, 'isRewardReady': is_reward_ready, 'vehicleTypeName': vehicle.vehicle_type.name, 'vehicleTypeIcon': vehicle.vehicle_type.icon})
        except Vehicle.DoesNotExist:
            return ok({'status': 'approved', 'activeWashes': 1, 'washGoal': 8, 'isRewardReady': False})


class PublicWifiView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        import io, qrcode, base64
        shop_id = request.query_params.get('shopId')
        if not shop_id:
            return err('shopId required')
        try:
            shop = Shop.objects.get(id=shop_id)
        except Shop.DoesNotExist:
            return err('Shop not found', 404)
        if not shop.wifi_name:
            return ok({'configured': False})
        wifi_str = f"WIFI:T:{shop.wifi_type or 'WPA'};S:{shop.wifi_name};P:{shop.wifi_password or ''};H:{'true' if shop.wifi_hidden else 'false'};;"
        buffer = io.BytesIO()
        qrcode.make(wifi_str, box_size=10, border=2).save(buffer, format='PNG')
        qr_data_url = "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode()
        return ok({'configured': True, 'shopName': shop.name, 'ssid': shop.wifi_name, 'qrCode': qr_data_url, 'password': shop.wifi_password if shop.wifi_type != 'nopass' else None})


# --- APPOINTMENTS ---

class AppointmentListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile', 400)
        date = request.query_params.get('date')
        qs = Appointment.objects.filter(shop=shop).select_related(
            'vehicle__customer', 'vehicle__vehicle_type'
        ).order_by('date', 'time_slot')
        if date:
            qs = qs.filter(date=date)
        data = []
        for a in qs:
            data.append({
                'id': str(a.id),
                'date': a.date,
                'timeSlot': a.time_slot,
                'status': a.status,
                'notes': a.notes,
                'createdAt': a.created_at.isoformat(),
                'vehicle': {
                    'plateNo': a.vehicle.plate_no,
                    'vehicleTypeName': a.vehicle.vehicle_type.name,
                    'vehicleTypeIcon': a.vehicle.vehicle_type.icon,
                    'customerName': a.vehicle.customer.name,
                    'customerPhone': a.vehicle.customer.phone,
                },
            })
        return ok(data)

    def post(self, request):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile', 400)
        d = request.data
        try:
            from vehicles.models import Vehicle
            vehicle = Vehicle.objects.get(id=d['vehicleId'], shop=shop)
        except (Vehicle.DoesNotExist, KeyError):
            return err('Vehicle not found', 404)
        appt = Appointment.objects.create(
            shop=shop,
            vehicle=vehicle,
            date=d.get('date', ''),
            time_slot=d.get('timeSlot', ''),
            notes=d.get('notes', '') or '',
            status='pending',
        )
        return ok({'id': str(appt.id)}, 201)


class AppointmentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile', 400)
        try:
            appt = Appointment.objects.get(id=pk, shop=shop)
        except Appointment.DoesNotExist:
            return err('Not found', 404)
        d = request.data
        if 'status' in d:
            appt.status = d['status']
        if 'notes' in d:
            appt.notes = d['notes']
        appt.save()
        return ok({'updated': True})

    def delete(self, request, pk):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile', 400)
        Appointment.objects.filter(id=pk, shop=shop).delete()
        return ok({'deleted': True})
