from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    Washstation, VehicleType, WashPackage, Worker, Shift,
    Customer, Vehicle, Wash, WashRequest, Appointment,
    WaitlistItem, PlatformWaitlist
)

# --- AUTH SERIALIZERS ---
class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=50, required=False, allow_blank=True)
    address = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("User with this email already exists.")
        return value.lower().strip()

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        washstation = Washstation.objects.create(
            user=user,
            name=validated_data['name'],
            phone=validated_data.get('phone', ''),
            address=validated_data.get('address', '')
        )
        return user, washstation


# --- SHOP SERIALIZERS ---
class WashstationSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = Washstation
        fields = [
            'id', 'name', 'email', 'address', 'phone', 'plan', 'plan_expires_at',
            'active', 'free_limit', 'washstation_logo', 'theme_color', 'qr_code',
            'wifi_name', 'wifi_password', 'wifi_type', 'wifi_hidden', 'sms_enabled',
            'sms_api_key', 'sms_sender_id', 'esewa_id', 'khalti_id', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'sms_api_key': {'write_only': True},
        }


class ShopUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Washstation
        fields = [
            'name', 'address', 'phone', 'washstation_logo', 'theme_color',
            'wifi_name', 'wifi_password', 'wifi_type', 'wifi_hidden',
            'sms_enabled', 'sms_api_key', 'sms_sender_id'
        ]
        extra_kwargs = {
            'sms_api_key': {'write_only': True},
        }


# --- STANDARD CRUD SERIALIZERS ---
class VehicleTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleType
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'washstation']

class WashPackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = WashPackage
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'washstation']

class WorkerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Worker
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'washstation']
        extra_kwargs = {
            'pin': {'write_only': True},
        }

class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'washstation']

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'washstation']

class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'washstation']

class WashSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wash
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'washstation']

class WashRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = WashRequest
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'washstation']

class AppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'washstation']

class WaitlistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = WaitlistItem
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'washstation']

# 👇 THIS WAS MISSING - ADDED NOW
class PlatformWaitlistSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformWaitlist
        fields = '__all__'
        read_only_fields = ['id', 'created_at']  # No washstation field on this model