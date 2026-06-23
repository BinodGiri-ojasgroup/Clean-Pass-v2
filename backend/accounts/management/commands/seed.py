"""Management command: python manage.py seed"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta


class Command(BaseCommand):
    help = 'Seed the database with demo data'

    def handle(self, *args, **kwargs):
        from accounts.models import User, Shop, Worker
        from customers.models import Customer
        from vehicles.models import VehicleType, Vehicle
        from washstations.models import WashPackage, Wash

        # Create demo user + shop
        email = 'demo@cleanpass.com'
        if not User.objects.filter(username=email).exists():
            user = User.objects.create_user(username=email, email=email, password='demo1234')
            shop = Shop.objects.create(
                user=user, name='Shine Auto Wash', email=email,
                address='Thamel, Kathmandu', phone='9801234567',
                plan='basic', plan_expires_at=timezone.now() + timedelta(days=365),
                theme_color='#0ea5e9',
            )
            self.stdout.write(self.style.SUCCESS('Created demo shop'))
        else:
            user = User.objects.get(username=email)
            shop = user.shop_profile

        # Vehicle types
        vt_car, _ = VehicleType.objects.get_or_create(shop=shop, name='Car', defaults={'icon': '🚗', 'wash_goal': 8})
        vt_moto, _ = VehicleType.objects.get_or_create(shop=shop, name='Motorcycle', defaults={'icon': '🏍️', 'wash_goal': 10})
        vt_suv, _ = VehicleType.objects.get_or_create(shop=shop, name='Jeep / SUV', defaults={'icon': '🚙', 'wash_goal': 8})

        # Packages
        pkg_basic, _ = WashPackage.objects.get_or_create(shop=shop, name='Basic Wash', defaults={'description': 'Exterior wash + rinse', 'price': 200, 'stamp_value': 1, 'color': '#0ea5e9'})
        pkg_premium, _ = WashPackage.objects.get_or_create(shop=shop, name='Premium Wash', defaults={'description': 'Exterior + interior vacuum', 'price': 350, 'stamp_value': 1, 'color': '#8b5cf6'})
        pkg_full, _ = WashPackage.objects.get_or_create(shop=shop, name='Full Detail', defaults={'description': 'Complete inside-out detailing', 'price': 600, 'stamp_value': 2, 'color': '#f59e0b'})

        # Worker
        worker, _ = Worker.objects.get_or_create(shop=shop, name='Bikash Tamang', defaults={'phone': '9812345678', 'pin': '1234', 'commission': 30})

        # Customers
        ram, _ = Customer.objects.get_or_create(phone='9801111111', shop=shop, defaults={'name': 'Ram Bahadur'})
        sita, _ = Customer.objects.get_or_create(phone='9802222222', shop=shop, defaults={'name': 'Sita Rana'})
        hari, _ = Customer.objects.get_or_create(phone='9803333333', shop=shop, defaults={'name': 'Hari Shrestha'})

        # Vehicles
        ram_car, _ = Vehicle.objects.get_or_create(plate_no='BA 1 PA 2345', shop=shop, defaults={'customer': ram, 'vehicle_type': vt_car, 'make': 'Toyota', 'color': 'White'})
        sita_moto, _ = Vehicle.objects.get_or_create(plate_no='BA 77 PA 8888', shop=shop, defaults={'customer': sita, 'vehicle_type': vt_moto, 'make': 'Honda', 'color': 'Red'})
        hari_suv, _ = Vehicle.objects.get_or_create(plate_no='GA 1 JA 5555', shop=shop, defaults={'customer': hari, 'vehicle_type': vt_suv, 'make': 'Hyundai', 'color': 'Black'})

        # Historical washes
        if not Wash.objects.filter(shop=shop, vehicle=ram_car).exists():
            for i in range(5):
                Wash.objects.create(shop=shop, vehicle=ram_car, package=pkg_basic, worker=worker, paid=True, payment_method='cash', status='done', wash_done_at=timezone.now())
        if not Wash.objects.filter(shop=shop, vehicle=sita_moto).exists():
            for i in range(8):
                Wash.objects.create(shop=shop, vehicle=sita_moto, package=pkg_premium, worker=worker, paid=i > 0, payment_method='esewa' if i > 0 else 'credit', status='done', wash_done_at=timezone.now())
        if not Wash.objects.filter(shop=shop, vehicle=hari_suv).exists():
            for i in range(3):
                Wash.objects.create(shop=shop, vehicle=hari_suv, package=pkg_full, worker=worker, paid=True, payment_method='khalti', status='done', wash_done_at=timezone.now())
            # One in queue
            Wash.objects.create(shop=shop, vehicle=hari_suv, package=pkg_basic, worker=worker, paid=False, status='queued')

        self.stdout.write(self.style.SUCCESS(f"""
Seed complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Login: demo@cleanpass.com / demo1234
  Shop ID: {shop.id}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""))
