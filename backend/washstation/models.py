import uuid
from django.db import models
from django.contrib.auth.models import User

# --- ENUMS / CHOICES FOR STRICT VALIDATION ---
class WashStatus(models.TextChoices):
    QUEUED = 'queued', 'Queued'
    WASHING = 'washing', 'Washing'
    READY = 'ready', 'Ready'
    DONE = 'done', 'Done'
    CANCELLED = 'cancelled', 'Cancelled'

class PaymentMethod(models.TextChoices):
    CASH = 'cash', 'Cash'
    ESEWA = 'esewa', 'eSewa'
    KHALTI = 'khalti', 'Khalti'
    CREDIT = 'credit', 'Credit'
    FREE = 'free', 'Free'

class RequestStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    RESOLVED = 'resolved', 'Resolved'
    CANCELLED = 'cancelled', 'Cancelled'

class AppointmentStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    CONFIRMED = 'confirmed', 'Confirmed'
    COMPLETED = 'completed', 'Completed'
    CANCELLED = 'cancelled', 'Cancelled'

class PlanType(models.TextChoices):
    FREE = 'free', 'Free'
    BASIC = 'basic', 'Basic'
    PRO = 'pro', 'Pro'
    ENTERPRISE = 'enterprise', 'Enterprise'


# --- MODELS ---
class Washstation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='washstation', null=True, blank=True)
    name = models.CharField(max_length=255)
    # REMOVED: email and password fields. Rely on user.email and user.check_password()
    address = models.CharField(max_length=255, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    plan = models.CharField(max_length=50, choices=PlanType.choices, default=PlanType.FREE)
    plan_expires_at = models.DateTimeField(null=True, blank=True)
    active = models.BooleanField(default=True)
    free_limit = models.IntegerField(default=50)
    washstation_logo = models.TextField(null=True, blank=True) # logo image stored as base64 string (for simplicity)
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
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class VehicleType(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    washstation = models.ForeignKey(Washstation, on_delete=models.CASCADE, related_name='vehicle_types')
    name = models.CharField(max_length=255)
    icon = models.CharField(max_length=50, default="🚗")
    wash_goal = models.IntegerField(default=8)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.washstation.name})"


class WashService(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    washstation = models.ForeignKey(Washstation, on_delete=models.CASCADE, related_name='services')
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    price = models.IntegerField()
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.washstation.name}"


class WashPackage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    washstation = models.ForeignKey(Washstation, on_delete=models.CASCADE, related_name='packages')
    vehicle_type = models.ForeignKey(VehicleType, on_delete=models.SET_NULL, null=True, blank=True, related_name='packages')
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    price = models.IntegerField()
    stamp_value = models.IntegerField(default=1)
    color = models.CharField(max_length=7, default="#0ea5e9")
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.washstation.name}"


class Worker(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    washstation = models.ForeignKey(Washstation, on_delete=models.CASCADE, related_name='workers')
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50, null=True, blank=True)
    pin = models.CharField(max_length=10, default="0000") # NOTE: Hash this PIN in your Views/Serializers, not here!
    active = models.BooleanField(default=True)
    commission = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.washstation.name})"


class Shift(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    washstation = models.ForeignKey(Washstation, on_delete=models.CASCADE, related_name='shifts')
    worker = models.ForeignKey(Worker, on_delete=models.CASCADE, related_name='shifts')
    clock_in = models.DateTimeField(auto_now_add=True)
    clock_out = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.worker.name} - {self.clock_in}"


class Customer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = models.CharField(max_length=50)
    name = models.CharField(max_length=255, null=True, blank=True)
    washstation = models.ForeignKey(Washstation, on_delete=models.CASCADE, related_name='customers')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('phone', 'washstation')

    def __str__(self):
        return self.name or self.phone


class Vehicle(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plate_no = models.CharField(max_length=50)
    washstation = models.ForeignKey(Washstation, on_delete=models.CASCADE, related_name='vehicles')
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='vehicles')
    vehicle_type = models.ForeignKey(VehicleType, on_delete=models.SET_NULL, null=True, blank=True, related_name='vehicles')
    make = models.CharField(max_length=100, null=True, blank=True)
    color = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('plate_no', 'washstation')

    def __str__(self):
        return self.plate_no


class Wash(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    washstation = models.ForeignKey(Washstation, on_delete=models.CASCADE, related_name='washes')
    # Changed to SET_NULL to preserve financial history if a vehicle is deleted
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='washes')
    package = models.ForeignKey(WashPackage, on_delete=models.SET_NULL, null=True, blank=True, related_name='washes')
    services = models.ManyToManyField(WashService, related_name='washes', blank=True)
    worker = models.ForeignKey(Worker, on_delete=models.SET_NULL, null=True, blank=True, related_name='washes')
    paid = models.BooleanField(default=True)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    redeemed = models.BooleanField(default=False)
    redeemed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=WashStatus.choices, default=WashStatus.QUEUED)
    wash_start_at = models.DateTimeField(null=True, blank=True)
    wash_done_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Washes"

    def __str__(self):
        plate = self.vehicle.plate_no if self.vehicle else "Deleted Vehicle"
        return f"Wash #{self.id} | {plate} | {self.status}"


class WashRequest(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    washstation = models.ForeignKey(Washstation, on_delete=models.CASCADE, related_name='wash_requests')
    phone = models.CharField(max_length=50)
    plate_no = models.CharField(max_length=50)
    vehicle_type = models.ForeignKey(VehicleType, on_delete=models.SET_NULL, null=True, blank=True, related_name='wash_requests')
    package = models.ForeignKey(WashPackage, on_delete=models.SET_NULL, null=True, blank=True, related_name='wash_requests')
    services = models.ManyToManyField(WashService, related_name='wash_requests', blank=True)
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='wash_requests')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='wash_requests')
    status = models.CharField(max_length=20, choices=RequestStatus.choices, default=RequestStatus.PENDING)
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Request {self.plate_no} ({self.status})"


class Appointment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    washstation = models.ForeignKey(Washstation, on_delete=models.CASCADE, related_name='appointments')
    # Changed to SET_NULL to preserve history
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True, related_name='appointments')
    package = models.ForeignKey(WashPackage, on_delete=models.SET_NULL, null=True, blank=True, related_name='appointments')
    date = models.DateField() # Changed from CharField to DateField for proper validation
    time_slot = models.CharField(max_length=50)
    status = models.CharField(max_length=20, choices=AppointmentStatus.choices, default=AppointmentStatus.PENDING)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Appointment on {self.date} at {self.time_slot}"


class WaitlistItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contact = models.CharField(max_length=255)
    washstation = models.ForeignKey(Washstation, on_delete=models.CASCADE, null=True, blank=True, related_name='waitlist_items')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.contact


class PlatformWaitlist(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contact = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.contact