from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Vehicle, VehicleType


def ok(data, status_code=200):
    return Response({'success': True, 'data': data}, status=status_code)


def err(error, status_code=400):
    return Response({'success': False, 'error': error}, status=status_code)


def get_shop(request):
    if not hasattr(request.user, 'shop_profile'):
        return None
    return request.user.shop_profile


def serialize_vehicle(v):
    washes = list(v.washes.all())
    done_washes = [w for w in washes if w.status == 'done']
    active_washes = [w for w in done_washes if not w.redeemed]
    unpaid_washes = [w for w in active_washes if not w.paid]
    return {
        'id': str(v.id),
        'plateNo': v.plate_no,
        'make': v.make,
        'color': v.color,
        'vehicleType': {
            'id': str(v.vehicle_type.id),
            'name': v.vehicle_type.name,
            'icon': v.vehicle_type.icon,
            'washGoal': v.vehicle_type.wash_goal,
        },
        'customer': {
            'id': str(v.customer.id),
            'name': v.customer.name,
            'phone': v.customer.phone,
        },
        'activeWashes': len(active_washes),
        'unpaidWashes': len(unpaid_washes),
        'isRewardReady': len(active_washes) >= v.vehicle_type.wash_goal,
        'createdAt': v.created_at.isoformat(),
    }


# --- VEHICLE TYPES ---

class VehicleTypeListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile linked', 404)
        types = VehicleType.objects.filter(shop=shop, active=True).order_by('created_at')
        data = [{'id': str(vt.id), 'name': vt.name, 'icon': vt.icon, 'washGoal': vt.wash_goal, 'active': vt.active} for vt in types]
        return ok(data)

    def post(self, request):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile linked', 404)
        name = (request.data.get('name') or '').strip()
        if not name:
            return err('Name required')
        vt = VehicleType.objects.create(
            shop=shop,
            name=name,
            icon=request.data.get('icon', '🚗'),
            wash_goal=int(request.data.get('washGoal', 8)),
        )
        return ok({'id': str(vt.id), 'name': vt.name, 'icon': vt.icon, 'washGoal': vt.wash_goal}, 201)


# --- VEHICLES ---

class VehicleListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile linked', 404)
        search = request.query_params.get('search', '')
        vehicles = Vehicle.objects.filter(shop=shop).select_related(
            'customer', 'vehicle_type'
        ).prefetch_related('washes').order_by('-created_at')
        if search:
            vehicles = vehicles.filter(plate_no__icontains=search) | \
                Vehicle.objects.filter(shop=shop, customer__name__icontains=search).select_related('customer', 'vehicle_type').prefetch_related('washes') | \
                Vehicle.objects.filter(shop=shop, customer__phone__icontains=search).select_related('customer', 'vehicle_type').prefetch_related('washes')
            vehicles = vehicles.distinct().order_by('-created_at')
        return ok([serialize_vehicle(v) for v in vehicles])


class VehicleDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile linked', 404)
        try:
            v = Vehicle.objects.get(id=pk, shop=shop)
        except Vehicle.DoesNotExist:
            return err('Not found', 404)
        v.washes.all()  # prefetch
        done_washes = list(v.washes.filter(status='done').select_related('package', 'worker').order_by('-created_at')[:50])
        active_washes = [w for w in done_washes if not w.redeemed]
        unpaid_washes = [w for w in active_washes if not w.paid]
        data = {
            'id': str(v.id),
            'plateNo': v.plate_no,
            'make': v.make,
            'color': v.color,
            'vehicleType': {'id': str(v.vehicle_type.id), 'name': v.vehicle_type.name, 'icon': v.vehicle_type.icon, 'washGoal': v.vehicle_type.wash_goal},
            'customer': {'id': str(v.customer.id), 'name': v.customer.name, 'phone': v.customer.phone},
            'activeWashes': len(active_washes),
            'unpaidCount': len(unpaid_washes),
            'unpaidAmount': sum(w.package.price if w.package else 0 for w in unpaid_washes),
            'isRewardReady': len(active_washes) >= v.vehicle_type.wash_goal,
            'washes': [{'id': str(w.id), 'createdAt': w.created_at.isoformat(), 'paid': w.paid, 'paymentMethod': w.payment_method, 'redeemed': w.redeemed, 'packageName': w.package.name if w.package else None, 'workerName': w.worker.name if w.worker else None} for w in done_washes],
        }
        return ok(data)

    def patch(self, request, pk):
        shop = get_shop(request)
        if not shop:
            return err('No shop profile linked', 404)
        try:
            v = Vehicle.objects.get(id=pk, shop=shop)
        except Vehicle.DoesNotExist:
            return err('Not found', 404)

        action = request.data.get('action')
        from washstations.models import Wash, WashPackage

        if action == 'remove':
            last = Wash.objects.filter(vehicle=v, shop=shop, redeemed=False, status='done').order_by('-created_at').first()
            if not last:
                return err('No washes to remove')
            last.delete()

        elif action == 'add':
            Wash.objects.create(
                shop=shop, vehicle=v,
                paid=request.data.get('paid', True),
                status='done', wash_done_at=timezone.now()
            )

        elif action == 'set':
            target_count = int(request.data.get('targetCount', 0))
            current = list(Wash.objects.filter(vehicle=v, shop=shop, redeemed=False, status='done').order_by('-created_at'))
            diff = target_count - len(current)
            if diff > 0:
                Wash.objects.bulk_create([
                    Wash(shop=shop, vehicle=v, paid=True, status='done', wash_done_at=timezone.now())
                    for _ in range(diff)
                ])
            elif diff < 0:
                ids = [w.id for w in current[:abs(diff)]]
                Wash.objects.filter(id__in=ids).delete()

        elif action == 'mark_paid':
            wash_id = request.data.get('washId')
            if not wash_id:
                return err('washId required')
            Wash.objects.filter(id=wash_id, shop=shop).update(
                paid=True, payment_method=request.data.get('paymentMethod', 'cash')
            )

        elif action == 'mark_all_paid':
            Wash.objects.filter(vehicle=v, shop=shop, paid=False, redeemed=False).update(
                paid=True, payment_method=request.data.get('paymentMethod', 'cash')
            )

        new_count = Wash.objects.filter(vehicle=v, shop=shop, redeemed=False, status='done').count()
        unpaid = list(Wash.objects.filter(vehicle=v, shop=shop, paid=False, redeemed=False).select_related('package'))
        return ok({
            'activeWashes': new_count,
            'washGoal': v.vehicle_type.wash_goal,
            'isRewardReady': new_count >= v.vehicle_type.wash_goal,
            'unpaidCount': len(unpaid),
            'unpaidAmount': sum(w.package.price if w.package else 0 for w in unpaid),
        })
