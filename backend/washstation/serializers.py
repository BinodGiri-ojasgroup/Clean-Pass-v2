from rest_framework import serializers
from .models import (
    Washstation, VehicleType, WashPackage, Worker, Shift, 
    Customer, Vehicle, Wash, WashRequest, Appointment, 
    WaitlistItem, PlatformWaitlist
)

class WashstationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Washstation
        fields = '__all__'
        extra_kwargs = {
            'password': {'write_only': True, 'required': False}, 
            'id': {'required': False},
            'user': {'read_only': True, 'required': False}  # 👈 Prevent frontend mutations from crashing it
        }
class VehicleTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleType
        fields = '__all__'
        extra_kwargs = {'id': {'required': False}}

class WashPackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = WashPackage
        fields = '__all__'
        extra_kwargs = {'id': {'required': False}}

class WorkerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Worker
        fields = '__all__'
        extra_kwargs = {'id': {'required': False}}

class ShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shift
        fields = '__all__'
        extra_kwargs = {'id': {'required': False}}

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'
        extra_kwargs = {'id': {'required': False}}

class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = '__all__'
        extra_kwargs = {'id': {'required': False}}

class WashSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wash
        fields = '__all__'
        extra_kwargs = {'id': {'required': False}}

class WashRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = WashRequest
        fields = '__all__'
        extra_kwargs = {'id': {'required': False}}

class AppointmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = '__all__'
        extra_kwargs = {'id': {'required': False}}

class WaitlistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = WaitlistItem
        fields = '__all__'
        extra_kwargs = {'id': {'required': False}}

class PlatformWaitlistSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformWaitlist
        fields = '__all__'
        extra_kwargs = {'id': {'required': False}}