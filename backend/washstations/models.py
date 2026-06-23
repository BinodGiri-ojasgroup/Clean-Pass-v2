import uuid
from django.db import models
from accounts.models import Shop, Worker
from vehicles.models import Vehicle, VehicleType
from washstations.managers import WashPackageManager


class WashPackage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='packages')
    vehicle_type = models.ForeignKey(VehicleType, on_delete=models.SET_NULL, null=True, blank=True, related_name='packages')
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    price = models.IntegerField()
    stamp_value = models.IntegerField(default=1)
    color = models.CharField(max_length=50, default='#0ea5e9')
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Wash(models.Model):
    STATUS_CHOICES = [
        ('queued', 'Queued'),
        ('washing', 'Washing'),
        ('done', 'Done'),
    ]
    PAYMENT_CHOICES = [
        ('cash', 'Cash'), ('esewa', 'eSewa'), ('khalti', 'Khalti'),
        ('credit', 'Credit'), ('free', 'Free Wash'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='washes')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='washes')
    package = models.ForeignKey(WashPackage, on_delete=models.SET_NULL, null=True, blank=True, related_name='washes')
    worker = models.ForeignKey(Worker, on_delete=models.SET_NULL, null=True, blank=True, related_name='washes')
    paid = models.BooleanField(default=True)
    payment_method = models.CharField(max_length=50, default='cash', choices=PAYMENT_CHOICES)
    redeemed = models.BooleanField(default=False)
    redeemed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=50, default='done', choices=STATUS_CHOICES)
    wash_start_at = models.DateTimeField(null=True, blank=True)
    wash_done_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Wash'
        verbose_name_plural = 'Washes'

    def __str__(self):
        return f"{self.vehicle.plate_no} - {self.status}"


class WashRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='wash_requests')
    phone = models.CharField(max_length=50)
    plate_no = models.CharField(max_length=100)
    vehicle_type = models.ForeignKey(VehicleType, on_delete=models.SET_NULL, null=True, blank=True, related_name='requests')
    package = models.ForeignKey(WashPackage, on_delete=models.SET_NULL, null=True, blank=True, related_name='requests')
    customer = models.ForeignKey('customers.Customer', on_delete=models.SET_NULL, null=True, blank=True, related_name='wash_requests')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='requests')
    status = models.CharField(max_length=50, default='pending')
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Appointment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='appointments')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='appointments')
    package = models.ForeignKey(WashPackage, on_delete=models.SET_NULL, null=True, blank=True, related_name='appointments')
    date = models.CharField(max_length=100)
    time_slot = models.CharField(max_length=100)
    status = models.CharField(max_length=50, default='pending')
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
