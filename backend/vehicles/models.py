import uuid
from django.db import models
from accounts.models import Shop
from customers.models import Customer


class VehicleType(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='vehicle_types')
    name = models.CharField(max_length=255)
    icon = models.CharField(max_length=50, default='🚗')
    wash_goal = models.IntegerField(default=8)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.shop.name})"


class Vehicle(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plate_no = models.CharField(max_length=100)
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='vehicles')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='vehicles')
    vehicle_type = models.ForeignKey(VehicleType, on_delete=models.CASCADE, related_name='vehicles')
    make = models.CharField(max_length=100, null=True, blank=True)
    color = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('plate_no', 'shop')

    def __str__(self):
        return self.plate_no
