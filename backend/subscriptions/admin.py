from django.contrib import admin
from .models import WaitlistItem, PlatformWaitlist
admin.site.register(WaitlistItem)
admin.site.register(PlatformWaitlist)
