from django.db import models


class WashPackageManager(models.Manager):
    def active(self):
        return self.filter(active=True)
