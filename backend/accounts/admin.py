from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Shop, Worker, Shift

admin.site.register(User, UserAdmin)
admin.site.register(Shop)
admin.site.register(Worker)
admin.site.register(Shift)
