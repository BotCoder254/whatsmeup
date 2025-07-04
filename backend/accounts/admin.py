from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import UserProfile

User = get_user_model()

class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'profile'

class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)
    list_display = ('username', 'email', 'phone_number', 'is_staff', 'is_online')
    list_filter = ('is_staff', 'is_superuser', 'is_online')
    search_fields = ('username', 'email', 'phone_number')

# Register User model
admin.site.register(User, UserAdmin)
