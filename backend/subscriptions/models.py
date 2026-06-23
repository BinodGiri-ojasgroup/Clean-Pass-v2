import uuid
from django.db import models
from accounts.models import Shop


class WaitlistItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contact = models.CharField(max_length=255)
    shop = models.ForeignKey(Shop, on_delete=models.SET_NULL, null=True, blank=True, related_name='waitlist')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.contact


class PlatformWaitlist(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contact = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.contact
