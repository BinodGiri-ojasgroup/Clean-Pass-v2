from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # Auth
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Shop profile
    path('shops/me/', views.ShopMeView.as_view(), name='shop-me'),
    path('qr/', views.QRCodeView.as_view(), name='qr-code'),
    path('wifi/', views.WifiView.as_view(), name='wifi'),

    # Dashboard stats
    path('dashboard/stats/', views.DashboardStatsView.as_view(), name='dashboard-stats'),

    # Workers
    path('workers/', views.WorkerListCreateView.as_view(), name='workers'),
    path('workers/<uuid:pk>/', views.WorkerDetailView.as_view(), name='worker-detail'),
    path('workers/shift/', views.ShiftView.as_view(), name='worker-shift'),
]
