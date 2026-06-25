# washstation/admin.py
from django.contrib import admin
from .models import (
    Washstation, VehicleType, WashPackage, Worker, Shift, 
    Customer, Vehicle, Wash, WashRequest, Appointment, 
    WaitlistItem, PlatformWaitlist
)

@admin.register(Washstation)
class WashstationAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'plan', 'active', 'created_at')

@admin.register(VehicleType)
class VehicleTypeAdmin(admin.ModelAdmin):
    list_display = ('name', 'washstation', 'wash_goal', 'active')

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'washstation', 'created_at')
    search_fields = ('name', 'phone')

@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ('plate_no', 'customer', 'vehicle_type', 'washstation')
    search_fields = ('plate_no',)

@admin.register(Worker)
class WorkerAdmin(admin.ModelAdmin):
    list_display = ('name', 'washstation', 'commission', 'active')

@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ('worker', 'clock_in', 'clock_out', 'washstation')

@admin.register(WaitlistItem)
class WaitlistItemAdmin(admin.ModelAdmin):
    list_display = ('contact', 'washstation', 'created_at')

@admin.register(PlatformWaitlist)
class PlatformWaitlistAdmin(admin.ModelAdmin):
    list_display = ('contact', 'created_at')

@admin.register(Wash)
class WashAdmin(admin.ModelAdmin):
    # Removed 'customer' as it caused an error
    list_display = ('id', 'washstation', 'paid', 'created_at')
    list_filter = ('washstation', 'paid')

@admin.register(WashRequest)
class WashRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'washstation', 'status', 'created_at')

@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    # Removed 'customer' as it caused an error
    list_display = ('id', 'washstation', 'date')

@admin.register(WashPackage)
class WashPackageAdmin(admin.ModelAdmin):
    list_display = ('name', 'washstation', 'price', 'active')