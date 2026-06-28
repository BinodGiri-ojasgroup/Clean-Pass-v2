### Constraints Enforcement Rules:
1. **Cascading Deletes (`models.CASCADE`)**: When a `Washstation` (tenant) is removed, all dependent configuration and logs (`Customer`, `Vehicle`, `Worker`, `WashPackage`, `Wash`) are purged to ensure absolute tenant isolation.
2. **Nullification Protections (`models.SET_NULL`)**: If an operational configuration variant (such as a historical `WashPackage` or a former `Worker`) is deleted, the transactional execution history (`Wash` / `WashRequest`) remains intact for auditing and analytics with fields falling back to `null`.

---

## 3. Data Dictionary & Model Fields

### Washstation
The fundamental business workspace/tenant instance holding branding, configurations, API keys, and subscription details.
* `id` (CharField, PK): Unique CUID identifier string.
* `name` (CharField): Registered business name.
* `email` (EmailField): Unique authentication and login email.
* `password` (CharField): Hashed password credential.
* `plan` (CharField): Billing tier (e.g., `"free"`, `"premium"`). Default: `"free"`.
* `sms_enabled` (BooleanField): Toggles SMS notifications capability. Default: `False`.
* `esewa_id` / `khalti_id` (CharField): Payment integration gateways keys.

### VehicleType
Categorization for automated billing calculations and production-line pacing.
* `id` (CharField, PK): Unique CUID string.
* `washstation` (ForeignKey): Cascades to parent `Washstation`.
* `name` (CharField): e.g., `"Sedan"`, `"SUV"`, `"Motorbike"`.
* `wash_goal` (IntegerField): Baseline daily target workflow milestone metrics. Default: `8`.

### WashPackage
The menu services offered by a wash station, bound selectively to vehicle sizes.
* `id` (CharField, PK): Unique CUID string.
* `washstation` (ForeignKey): Reference to tenant `Washstation`.
* `vehicle_type` (ForeignKey): Nullable target vehicle category reference. Clears on delete.
* `price` (IntegerField): Service unit cost.
* `stamp_value` (IntegerField): Count value awarded toward loyalty punch-cards. Default: `1`.

### Worker & Shift
Employee tracking system supporting micro-incentives and active workflow check-ins.
* **Worker**: Contains authorization identifiers like `pin` and `commission` parameters stored as custom percentage weights.
* **Shift**: Standard temporal tracking parameters (`clock_in`, `clock_out`) capturing employee activity.

### Customer & Vehicle
Core consumer metrics.
* **Customer**: Represents an individual profile. Enforces a strict `unique_together` constraint on `('phone', 'washstation')` to permit identical cross-tenant numbers while isolating private data.
* **Vehicle**: Maps specifically to a unique `Customer` owner profile. Enforces `unique_together` on `('plate_no', 'washstation')`.

### Operational Logs (`Wash`, `WashRequest`, `Appointment`)
* **Wash**: The master execution ledger tracking job statuses (`"queued"`, `"washing"`, `"done"`), state timestamps, and payment tracking attributes.
* **WashRequest**: Open customer intakes (e.g., customer mobile apps or self-serve terminals) awaiting conversion to real `Wash` logs.
* **Appointment**: Advanced time slots reserved for a specific `Vehicle`.

---

## 4. Production Ready Django Blueprint (`models.py`)

```python
from django.db import models
from django.utils import timezone

class Washstation(models.Model):
    id = models.CharField(primary_key=True, max_length=30)
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

    def __str__(self):
        return f"{self.name} - {self.washstation.name}"


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

    def __str__(self):
        return self.name


class Worker(models.Model):
    id = models.CharField(primary_key=True, max_length=30)
    washstation = models.ForeignKey(Washstation, on_delete=models.CASCADE, related_name='workers')
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50, null=True, blank=True)
    pin = models.CharField(max_length=10, default="0000")
    active = models.BooleanField(default=True)
    commission = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.name


class Shift(models.Model):
    id = models.CharField(primary_key=True, max_length=30)
    washstation = models.ForeignKey(Washstation, on_delete=models.CASCADE, related_name='shifts')
    worker = models.ForeignKey(Worker, on_delete=models.CASCADE, related_name='shifts')
    clock_in = models.DateTimeField(default=timezone.now)
    clock_out = models.DateTimeField(null=True, blank=True)


class Customer(models.Model):
    id = models.CharField(primary_key=True, max_length=30)
    phone = models.CharField(max_length=50)
    name = models.CharField(max_length=255, null=True, blank=True)
    washstation = models.ForeignKey(Washstation, on_delete=models.CASCADE, related_name='customers')
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ('phone', 'washstation')

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


class WaitlistItem(models.Model):
    id = models.CharField(primary_key=True, max_length=30)
    contact = models.CharField(max_length=255)
    washstation = models.ForeignKey(Washstation, on_delete=models.CASCADE, null=True, blank=True, related_name='waitlist_items')
    created_at = models.DateTimeField(default=timezone.now)


class PlatformWaitlist(models.Model):
    id = models.CharField(primary_key=True, max_length=30)
    contact = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(default=timezone.now)



Architectural Implementation Notes
Custom ID Generation Lifecycle Hook
Because Django does not handle Prisma's client-side cuid() text out of the box, choose a programmatic approach:

Allow the frontend to generate and pass the alphanumeric key directly in requests, OR

Override the parent model instance save() method or execute standard signals to apply a key fallback (e.g., text based short UUID tokens) anytime the model saves with not self.id.


import uuid

def generate_cuid_fallback():
    # Production fallback code if frontend omits client ID strings
    return str(uuid.uuid4()).replace('-', '')[:30]



Multi-Tenant Access Control Middleware
To guarantee strict multi-tenancy access controls across API endpoints, use standard DRF custom permissions filters bound directly to a user's authenticated session workspace:

Python
from rest_framework import permissions

class IsWorkspaceTenant(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        # Enforce that objects match the authenticated active washstation scope
        return obj.washstation == request.user.washstation