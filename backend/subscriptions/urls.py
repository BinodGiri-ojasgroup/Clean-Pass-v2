from django.urls import path
from .views import PlatformWaitlistView

urlpatterns = [
    path('waitlist/', PlatformWaitlistView.as_view(), name='platform-waitlist'),
]
