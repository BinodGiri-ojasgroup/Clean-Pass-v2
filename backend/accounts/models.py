import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    groups = models.ManyToManyField(
        'auth.Group', related_name='custom_user_set', blank=True,
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission', related_name='custom_user_set', blank=True,
    )

    def __str__(self):
        return self.username


class Shop(models.Model):
    PLAN_CHOICES = [("free", "Free"), ("basic", "Basic"), ("premium", "Premium")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, null=True, blank=True, related_name='shop_profile'
    )
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    address = models.TextField(null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    plan = models.CharField(max_length=50, choices=PLAN_CHOICES, default="free")
    plan_expires_at = models.DateTimeField(null=True, blank=True)
    active = models.BooleanField(default=True)
    free_limit = models.IntegerField(default=50)
    shop_logo = models.CharField(max_length=500, null=True, blank=True)
    theme_color = models.CharField(max_length=50, default="#0ea5e9")
    qr_code = models.TextField(null=True, blank=True)
    wifi_name = models.CharField(max_length=255, null=True, blank=True)
    wifi_password = models.CharField(max_length=255, null=True, blank=True)
    wifi_type = models.CharField(max_length=50, null=True, blank=True)
    wifi_hidden = models.BooleanField(default=False)
    sms_enabled = models.BooleanField(default=False)
    sms_api_key = models.CharField(max_length=255, null=True, blank=True)
    sms_sender_id = models.CharField(max_length=50, default="CleanPass")
    esewa_id = models.CharField(max_length=255, null=True, blank=True)
    khalti_id = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    def is_plan_active(self):
        if self.plan == 'free':
            return True
        if not self.plan_expires_at:
            return False
        from django.utils import timezone
        return self.plan_expires_at > timezone.now()

    def get_vehicle_limit(self):
        if self.plan == 'free':
            return self.free_limit
        return None  # unlimited


class Worker(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='workers')
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50, null=True, blank=True)
    pin = models.CharField(max_length=10, default="0000")
    active = models.BooleanField(default=True)
    commission = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Shift(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='shifts')
    worker = models.ForeignKey(Worker, on_delete=models.CASCADE, related_name='shifts')
    clock_in = models.DateTimeField(auto_now_add=True)
    clock_out = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.worker.name} @ {self.clock_in}"
