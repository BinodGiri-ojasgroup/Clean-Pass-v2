from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import PlatformWaitlist


class PlatformWaitlistView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        contact = request.data.get('contact', '').strip()
        if not contact:
            return Response({'success': False, 'error': 'Contact required'}, status=400)
        obj, created = PlatformWaitlist.objects.get_or_create(contact=contact)
        return Response({'success': True, 'data': {'created': created}})
