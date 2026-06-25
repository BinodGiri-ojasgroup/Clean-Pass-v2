import csv
from django.http import HttpResponse
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from washstation.models import Wash
from accounts.models import Worker


def ok(data, status_code=200):
    return Response({'success': True, 'data': data}, status=status_code)


def err(error, status_code=400):
    return Response({'success': False, 'error': error}, status=status_code)


class ReportsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'shop_profile'):
            return err('No shop profile linked', 400)
        shop = request.user.shop_profile

        fmt = request.query_params.get('format')
        days = int(request.query_params.get('days', 30))
        since = timezone.now() - timedelta(days=days)

        washes = Wash.objects.filter(
            shop=shop, created_at__gte=since
        ).select_related('vehicle__customer', 'vehicle__vehicle_type', 'package', 'worker').order_by('-created_at')

        if fmt == 'csv':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="cleanpass-report.csv"'
            writer = csv.writer(response)
            writer.writerow(['Date', 'Plate No', 'Vehicle Type', 'Customer', 'Phone', 'Package', 'Price', 'Paid', 'Redeemed'])
            for w in washes:
                writer.writerow([
                    w.created_at.strftime('%Y-%m-%d'),
                    w.vehicle.plate_no,
                    w.vehicle.vehicle_type.name,
                    w.vehicle.customer.name or '',
                    w.vehicle.customer.phone,
                    w.package.name if w.package else 'Manual',
                    w.package.price if w.package else 0,
                    'Yes' if w.paid else 'No',
                    'Yes' if w.redeemed else 'No',
                ])
            return response

        total_revenue = sum((w.package.price if w.package else 0) for w in washes if w.paid)
        unpaid_revenue = sum((w.package.price if w.package else 0) for w in washes if not w.paid and not w.redeemed)
        return ok({
            'washes': washes.count(),
            'revenue': total_revenue,
            'unpaid': unpaid_revenue,
            'redemptions': washes.filter(redeemed=True).count(),
        })


class SummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, 'shop_profile'):
            return err('No shop profile linked', 400)
        shop = request.user.shop_profile

        date_str = request.query_params.get('date', timezone.now().date().isoformat())
        start = timezone.datetime.fromisoformat(date_str + 'T00:00:00').replace(tzinfo=timezone.get_current_timezone())
        end = timezone.datetime.fromisoformat(date_str + 'T23:59:59').replace(tzinfo=timezone.get_current_timezone())

        washes = Wash.objects.filter(
            shop=shop, created_at__gte=start, created_at__lte=end, status='done'
        ).select_related('package', 'worker')

        by_method = {}
        for w in washes:
            m = w.payment_method or 'cash'
            if m not in by_method:
                by_method[m] = {'count': 0, 'amount': 0}
            by_method[m]['count'] += 1
            by_method[m]['amount'] += w.package.price if w.package else 0

        workers = Worker.objects.filter(shop=shop)
        worker_map = {str(w.id): w for w in workers}
        by_worker = {}
        for w in washes:
            if not w.worker_id:
                continue
            wid = str(w.worker_id)
            worker = worker_map.get(wid)
            if not worker:
                continue
            if wid not in by_worker:
                by_worker[wid] = {'name': worker.name, 'count': 0, 'commission': 0}
            by_worker[wid]['count'] += 1
            by_worker[wid]['commission'] += worker.commission

        return ok({
            'date': date_str,
            'totalWashes': washes.count(),
            'totalRevenue': sum((w.package.price if w.package else 0) for w in washes if w.paid),
            'totalUnpaid': sum((w.package.price if w.package else 0) for w in washes if not w.paid),
            'byMethod': by_method,
            'byWorker': list(by_worker.values()),
            'redeemed': washes.filter(redeemed=True).count(),
        })
