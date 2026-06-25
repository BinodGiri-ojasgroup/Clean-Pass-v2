from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, Shop, Worker, Shift


class ShopSerializer(serializers.ModelSerializer):
    plan_active = serializers.SerializerMethodField()

    class Meta:
        model = Shop
        exclude = ['user']

    def get_plan_active(self, obj):
        return obj.is_plan_active()


class ShopUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = [
            'name', 'address', 'phone', 'shop_logo', 'theme_color',
            'wifi_name', 'wifi_password', 'wifi_type', 'wifi_hidden',
            'sms_enabled', 'sms_api_key', 'sms_sender_id', 'qr_code',
        ]


class RegisterSerializer(serializers.Serializer):
    name = serializers.CharField()
    email = serializers.EmailField()
    password = serializers.CharField(min_length=6, write_only=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)

    def validate_email(self, value):
        email = value.lower().strip()
        if Shop.objects.filter(email=email).exists():
            raise serializers.ValidationError("An account with this email already exists")
        return email

    def create(self, validated_data):
        email = validated_data['email']
        user = User.objects.create_user(
            username=email,
            email=email,
            password=validated_data['password'],
        )
        shop = Shop.objects.create(
            user=user,
            name=validated_data['name'].strip(),
            email=email,
            phone=validated_data.get('phone', '').strip() or None,
            address=validated_data.get('address', '').strip() or None,
        )
        # Seed default vehicle types
        from vehicles.models import VehicleType
        VehicleType.objects.bulk_create([
            VehicleType(shop=shop, name='Car', icon='🚗', wash_goal=8),
            VehicleType(shop=shop, name='Motorcycle', icon='🏍️', wash_goal=10),
            VehicleType(shop=shop, name='Jeep / SUV', icon='🚙', wash_goal=8),
            VehicleType(shop=shop, name='Bus / Microbus', icon='🚌', wash_goal=6),
        ])
        # Seed default wash packages
        from washstation.models import WashPackage
        WashPackage.objects.bulk_create([
            WashPackage(shop=shop, name='Basic Wash', description='Exterior wash + rinse', price=200, stamp_value=1, color='#0ea5e9'),
            WashPackage(shop=shop, name='Premium Wash', description='Exterior + interior vacuum', price=350, stamp_value=1, color='#8b5cf6'),
            WashPackage(shop=shop, name='Full Detail', description='Complete inside-out detailing', price=600, stamp_value=2, color='#f59e0b'),
        ])
        return user, shop


class WorkerSerializer(serializers.ModelSerializer):
    washes_this_month = serializers.SerializerMethodField()
    revenue_this_month = serializers.SerializerMethodField()
    commission_earned = serializers.SerializerMethodField()
    active_shift = serializers.SerializerMethodField()
    shifts_this_week = serializers.SerializerMethodField()

    class Meta:
        model = Worker
        fields = [
            'id', 'name', 'phone', 'pin', 'commission', 'active', 'created_at',
            'washes_this_month', 'revenue_this_month', 'commission_earned',
            'active_shift', 'shifts_this_week',
        ]

    def get_washes_this_month(self, obj):
        from django.utils import timezone
        from datetime import timedelta
        since = timezone.now() - timedelta(days=30)
        return obj.washes.filter(created_at__gte=since).count()

    def get_revenue_this_month(self, obj):
        from django.utils import timezone
        from datetime import timedelta
        from django.db.models import Sum
        since = timezone.now() - timedelta(days=30)
        result = obj.washes.filter(created_at__gte=since).aggregate(total=Sum('package__price'))
        return result['total'] or 0

    def get_commission_earned(self, obj):
        from django.utils import timezone
        from datetime import timedelta
        since = timezone.now() - timedelta(days=30)
        count = obj.washes.filter(created_at__gte=since).count()
        return count * obj.commission

    def get_active_shift(self, obj):
        shift = obj.shifts.filter(clock_out__isnull=True).first()
        if shift:
            return {'id': str(shift.id), 'clock_in': shift.clock_in.isoformat()}
        return None

    def get_shifts_this_week(self, obj):
        from django.utils import timezone
        from datetime import timedelta
        since = timezone.now() - timedelta(days=7)
        return obj.shifts.filter(clock_in__gte=since).count()


class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = ['id', 'worker', 'clock_in', 'clock_out']
