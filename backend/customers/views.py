from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Customer


def ok(data):
    return Response({'success': True, 'data': data})


def err(error, status_code=400):
    return Response({'success': False, 'error': error}, status=status_code)


class CustomerListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'shop_profile'):
            return err('No shop profile linked', 404)
        shop = request.user.shop_profile
        search = request.query_params.get('search', '')

        customers = Customer.objects.filter(shop=shop).prefetch_related(
            'vehicles', 'vehicles__vehicle_type', 'vehicles__washes'
        ).order_by('-created_at')

        if search:
            customers = customers.filter(
                name__icontains=search
            ) | Customer.objects.filter(shop=shop, phone__icontains=search).prefetch_related(
                'vehicles', 'vehicles__vehicle_type', 'vehicles__washes'
            )
            customers = customers.order_by('-created_at')

        data = []
        for c in customers:
            vehicles = []
            for v in c.vehicles.all():
                active_washes = [w for w in v.washes.all() if not w.redeemed]
                vehicles.append({
                    'id': str(v.id),
                    'plateNo': v.plate_no,
                    'vehicleTypeName': v.vehicle_type.name,
                    'vehicleTypeIcon': getattr(v.vehicle_type, 'icon', '🚗'),
                    'washGoal': v.vehicle_type.wash_goal,
                    'activeWashes': len(active_washes),
                })
            data.append({
                'id': str(c.id),
                'phone': c.phone,
                'name': c.name,
                'createdAt': c.created_at.isoformat(),
                'vehicles': vehicles,
            })

        return ok({'customers': data})
