import uuid
from django.db import models
from accounts.models import Shop


class Customer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone = models.CharField(max_length=50)
    name = models.CharField(max_length=255, null=True, blank=True)
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name='customers')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('phone', 'shop')

    def __str__(self):
        return self.name or self.phone
