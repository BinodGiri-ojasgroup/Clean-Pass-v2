from django.urls import path
from .views import (
    QueueView, QueueDetailView,
    PackageListCreateView, PackageDetailView,
    RequestListView, RequestDetailView,
    ReportsView, SummaryView,
    PublicScanView, PublicTrackView, PublicCustomerView,
    PublicWashView, PublicApprovalStatusView, PublicWifiView,
    AppointmentListCreateView, AppointmentDetailView,
)

urlpatterns = [
    # Dashboard (protected)
    path('queue/', QueueView.as_view(), name='queue'),
    path('queue/<uuid:pk>/', QueueDetailView.as_view(), name='queue-detail'),
    path('packages/', PackageListCreateView.as_view(), name='packages'),
    path('packages/<uuid:pk>/', PackageDetailView.as_view(), name='package-detail'),
    path('requests/', RequestListView.as_view(), name='requests'),
    path('requests/<uuid:pk>/', RequestDetailView.as_view(), name='request-detail'),
    path('appointments/', AppointmentListCreateView.as_view(), name='appointments'),
    path('appointments/<uuid:pk>/', AppointmentDetailView.as_view(), name='appointment-detail'),
    path('reports/', ReportsView.as_view(), name='reports'),
    path('summary/', SummaryView.as_view(), name='summary'),

    # Public (unauthenticated)
    path('public/scan/', PublicScanView.as_view(), name='public-scan'),
    path('public/track/', PublicTrackView.as_view(), name='public-track'),
    path('public/customer/', PublicCustomerView.as_view(), name='public-customer'),
    path('public/wash/', PublicWashView.as_view(), name='public-wash'),
    path('public/approval/', PublicApprovalStatusView.as_view(), name='public-approval'),
    path('public/wifi/', PublicWifiView.as_view(), name='public-wifi'),
]
