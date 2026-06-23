from django.contrib import admin
from .models import WashPackage, Wash, WashRequest, Appointment
admin.site.register(WashPackage)
admin.site.register(Wash)
admin.site.register(WashRequest)
admin.site.register(Appointment)
