from django.contrib import admin
from .models import (
    Washstation, VehicleType, WashPackage, Worker, Shift, 
    Customer, Vehicle, Wash, WashRequest, Appointment, 
    WaitlistItem, PlatformWaitlist
)

# --- INLINES FOR BETTER WORKFLOW ---
class VehicleInline(admin.TabularInline):
    model = Vehicle
    extra = 0
    fields = ('plate_no', 'vehicle_type', 'make', 'color')

class WorkerInline(admin.TabularInline):
    model = Worker
    extra = 0
    fields = ('name', 'phone', 'pin', 'active', 'commission')

class VehicleTypeInline(admin.TabularInline):
    model = VehicleType
    extra = 0
    fields = ('name', 'icon', 'wash_goal', 'active')

class WashPackageInline(admin.TabularInline):
    model = WashPackage
    extra = 0
    fields = ('name', 'vehicle_type', 'price', 'active')


# --- ADMIN REGISTRATIONS ---
@admin.register(Washstation)
class WashstationAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'phone', 'plan', 'active', 'created_at')
    search_fields = ('name', 'user__email', 'phone')
    list_filter = ('plan', 'active')
    readonly_fields = ('created_at',)
    inlines = [WorkerInline, VehicleTypeInline, WashPackageInline]

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'washstation', 'created_at')
    search_fields = ('name', 'phone')
    readonly_fields = ('created_at',)
    inlines = [VehicleInline]

@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ('plate_no', 'customer', 'vehicle_type', 'washstation', 'created_at')
    search_fields = ('plate_no', 'customer__name', 'customer__phone')
    list_filter = ('vehicle_type',)
    readonly_fields = ('created_at',)

@admin.register(Wash)
class WashAdmin(admin.ModelAdmin):
    # Fixed: Used vehicle__plate_no instead of customer
    list_display = ('id', 'vehicle__plate_no', 'package', 'worker', 'status', 'payment_method', 'paid', 'created_at')
    search_fields = ('vehicle__plate_no', 'worker__name')
    list_filter = ('status', 'payment_method', 'paid', 'created_at')
    readonly_fields = ('created_at',)

@admin.register(WashRequest)
class WashRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'plate_no', 'phone', 'washstation', 'status', 'created_at')
    search_fields = ('plate_no', 'phone')
    list_filter = ('status',)
    readonly_fields = ('created_at',)

@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    # Fixed: Used vehicle__plate_no instead of customer
    list_display = ('id', 'vehicle__plate_no', 'washstation', 'date', 'time_slot', 'status')
    search_fields = ('vehicle__plate_no',)
    list_filter = ('status', 'date')
    readonly_fields = ('created_at',)

@admin.register(Worker)
class WorkerAdmin(admin.ModelAdmin):
    list_display = ('name', 'washstation', 'commission', 'active')
    search_fields = ('name', 'phone')
    list_filter = ('active',)
    readonly_fields = ('created_at',)

@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ('worker', 'washstation', 'clock_in', 'clock_out')
    list_filter = ('washstation',)

@admin.register(WashPackage)
class WashPackageAdmin(admin.ModelAdmin):
    list_display = ('name', 'washstation', 'vehicle_type', 'price', 'active')
    search_fields = ('name',)
    list_filter = ('active',)
    readonly_fields = ('created_at',)

@admin.register(VehicleType)
class VehicleTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'washstation', 'icon', 'wash_goal', 'active')
    list_filter = ('active',)
    readonly_fields = ('created_at',)

@admin.register(WaitlistItem)
class WaitlistItemAdmin(admin.ModelAdmin):
    list_display = ('contact', 'washstation', 'created_at')
    search_fields = ('contact',)
    readonly_fields = ('created_at',)

@admin.register(PlatformWaitlist)
class PlatformWaitlistAdmin(admin.ModelAdmin):
    list_display = ('contact', 'created_at')
    search_fields = ('contact',)
    readonly_fields = ('created_at',)