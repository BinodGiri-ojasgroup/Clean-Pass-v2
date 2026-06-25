import uuid
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User  # 👈 Import Django User

def generate_cuid_fallback():
    """
    Generates a production fallback alphanumeric key if the frontend 
    omits client-side CUID strings. Strips hyphens to fit max 30-char constraints.
    """
    return str(uuid.uuid4()).replace('-', '')[:30]


class Washstation(models.Model):
    id = models.CharField(primary_key=True, max_length=30)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='washstation', null=True, blank=True)
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=255)
    address = models.CharField(max_length=255, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    plan = models.CharField(max_length=50, default="free")
    plan_expires_at = models.DateTimeField(null=True, blank=True)
    active = models.BooleanField(default=True)
    free_limit = models.IntegerField(default=50)
    washstation_logo = models.CharField(max_length=500, null=True, blank=True)
    theme_color = models.CharField(max_length=7, default="#0ea5e9")
    qr_code = models.CharField(max_length=500, null=True, blank=True)
    wifi_name = models.CharField(max_length=255, null=True, blank=True)
    wifi_password = models.CharField(max_length=255, null=True, blank=True)
    wifi_type = models.CharField(max_length=50, null=True, blank=True)
    wifi_hidden = models.BooleanField(default=False)
    sms_enabled = models.BooleanField(default=False)
    sms_api_key = models.CharField(max_length=255, null=True, blank=True)
    sms_sender_id = models.CharField(max_length=50, default="CleanPass")
    esewa_id = models.CharField(max_length=100, null=True, blank=True)
    khalti_id = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = generate_cuid_fallback()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class VehicleType(models.Model):
    id = models.CharField(primary_key=True, max_length=30)
    washstation = models.ForeignKey(Washstation, on_delete=models.CASCADE, related_name='vehicle_types')
    name = models.CharField(max_length=255)
    icon = models.CharField(max_length=50, default="🚗")
    wash_goal = models.IntegerField(default=8)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = generate_cuid_fallback()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.washstation.name})"


class WashPackage(models.Model):
    id = models.CharField(primary_key=True, max_length=30)
    washstation = models.ForeignKey(Washstation, on_delete=models.CASCADE, related_name='packages')
    vehicle_type = models.ForeignKey(VehicleType, on_delete=models.SET_NULL, null=True, blank=True, related_name='packages')
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    price = models.IntegerField()
    stamp_value = models.IntegerField(default=1)
    color = models.CharField(max_length=7, default="#0ea5e9")
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = generate_cuid_fallback()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} - {self.washstation.name}"


class Worker(models.Model):
    id = models.CharField(primary_key=True, max_length=30)
    washstation = models.ForeignKey(Washstation, on_delete=models.CASCADE, related_name='workers')
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50, null=True, blank=True)
    pin = models.CharField(max_length=10, default="0000")
    active = models.BooleanField(default=True)
    commission = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = generate_cuid_fallback()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.washstation.name})"


class Shift(models.Model):
    id = models.CharField(primary_key=True, max_length=30)
    washstation = models.ForeignKey(Washstation, on_delete=models.CASCADE, related_name='shifts')
    worker = models.ForeignKey(Worker, on_delete=models.CASCADE, related_name='shifts')
    clock_in = models.DateTimeField(default=timezone.now)
    clock_out = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = generate_cuid_fallback()
        super().save(*args, **kwargs)


class Customer(models.Model):
    id = models.CharField(primary_key=True, max_length=30)
    phone = models.CharField(max_length=50)
    name = models.CharField(max_length=255, null=True, blank=True)
    washstation = models.ForeignKey(Washstation, on_delete=models.CASCADE, related_name='customers')
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ('phone', 'washstation')

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = generate_cuid_fallback()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name or self.phone


class Vehicle(models.Model):
    id = models.CharField(primary_key=True, max_length=30)
    plate_no = models.CharField(max_length=50)
    washstation = models.ForeignKey(Washstation, on_delete=models.CASCADE, related_name='vehicles')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='vehicles')
    vehicle_type = models.ForeignKey(VehicleType, on_delete=models.CASCADE, related_name='vehicles')
    make = models.CharField(max_length=100, null=True, blank=True)
    color = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ('plate_no', 'washstation')

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = generate_cuid_fallback()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.plate_no


class Wash(models.Model):
    id = models.CharField(primary_key=True, max_length=30)
    washstation = models.ForeignKey(Washstation, on_delete=models.CASCADE, related_name='washes')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='washes')
    package = models.ForeignKey(WashPackage, on_delete=models.SET_NULL, null=True, blank=True, related_name='washes')
    worker = models.ForeignKey(Worker, on_delete=models.SET_NULL, null=True, blank=True, related_name='washes')
    paid = models.BooleanField(default=True)
    payment_method = models.CharField(max_length=50, default="cash", null=True, blank=True)
    redeemed = models.BooleanField(default=False)
    redeemed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=50, default="done")
    wash_start_at = models.DateTimeField(null=True, blank=True)
    wash_done_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = generate_cuid_fallback()
        super().save(*args, **kwargs)


class WashRequest(models.Model):
    id = models.CharField(primary_key=True, max_length=30)
    washstation = models.ForeignKey(Washstation, on_delete=models.CASCADE, related_name='wash_requests')
    phone = models.CharField(max_length=50)
    plate_no = models.CharField(max_length=50)
    vehicle_type = models.ForeignKey(VehicleType, on_delete=models.SET_NULL, null=True, blank=True, related_name='wash_requests')
    package = models.ForeignKey(WashPackage, on_delete=models.SET_NULL, null=True, blank=True, related_name='wash_requests')
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='wash_requests')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='wash_requests')
    status = models.CharField(max_length=50, default="pending")
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = generate_cuid_fallback()
        super().save(*args, **kwargs)


class Appointment(models.Model):
    id = models.CharField(primary_key=True, max_length=30)
    washstation = models.ForeignKey(Washstation, on_delete=models.CASCADE, related_name='appointments')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='appointments')
    package = models.ForeignKey(WashPackage, on_delete=models.SET_NULL, null=True, blank=True, related_name='appointments')
    date = models.CharField(max_length=50)  
    time_slot = models.CharField(max_length=50)
    status = models.CharField(max_length=50, default="pending")
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = generate_cuid_fallback()
        super().save(*args, **kwargs)


class WaitlistItem(models.Model):
    id = models.CharField(primary_key=True, max_length=30)
    contact = models.CharField(max_length=255)
    washstation = models.ForeignKey(Washstation, on_delete=models.CASCADE, null=True, blank=True, related_name='waitlist_items')
    created_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = generate_cuid_fallback()
        super().save(*args, **kwargs)


class PlatformWaitlist(models.Model):
    id = models.CharField(primary_key=True, max_length=30)
    contact = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = generate_cuid_fallback()
        super().save(*args, **kwargs)