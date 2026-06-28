from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from washstation.views import (
    RegisterView, LoginView, GoogleLoginView, LogoutView,
    DashboardStatsView, LiveWashQueueView, CurrentShopView,
    QRGeneratorView, ReportsView, PublicShopInfoView
)
from washstation.views import PublicWashRequestView
from washstation.views import DailySummaryView


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/register/', RegisterView.as_view(), name='register'),
    path('api/auth/login/', LoginView.as_view(), name='login'),
    path('api/auth/google/', GoogleLoginView.as_view(), name='google-login'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/logout/', LogoutView.as_view(), name='logout'),
    path('api/summary/', DashboardStatsView.as_view(), name='dashboard-stats'),
    path('api/washstations/queue/', LiveWashQueueView.as_view(), name='live-queue'),
    path('api/auth/workers/', LiveWashQueueView.as_view(), name='live-workers'),
    path('api/shops/me/', CurrentShopView.as_view(), name='current-shop'),
    path('api/qr/', QRGeneratorView.as_view(), name='qr-code'),
    path('api/reports/', ReportsView.as_view(), name='reports'),
    path('api/', include('washstation.urls')),
    path('api/daily-summary/', DailySummaryView.as_view(), name='daily-summary'),
    path('api/public/shops/<uuid:shop_id>/', PublicShopInfoView.as_view(), name='public-shop-info'),
    path('api/public/wash-requests/<uuid:shop_id>/', PublicWashRequestView.as_view(), name='public-wash-request'),

]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)