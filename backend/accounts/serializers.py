from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import UserProfile, User
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['theme_preference', 'notification_preferences']


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    profile = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'profile_picture', 'is_online', 'last_seen', 'bio', 'phone_number', 'profile']
        read_only_fields = ['id', 'is_online', 'last_seen']


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating User objects"""
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'profile_picture', 'bio', 'phone_number']
        read_only_fields = ['id']
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating User objects"""
    class Meta:
        model = User
        fields = ['username', 'email', 'profile_picture', 'bio', 'phone_number']
    
    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'phone_number', 'password', 'password2']
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        
        # Ensure at least one of email or phone_number is provided
        if not attrs.get('email') and not attrs.get('phone_number'):
            raise serializers.ValidationError({"email_or_phone": "Either email or phone number must be provided."})
            
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(**validated_data)
        
        # Create user profile
        UserProfile.objects.create(user=user)
        
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=False)
    email = serializers.EmailField(required=False)
    phone_number = serializers.CharField(required=False)
    password = serializers.CharField(required=True, write_only=True)
    
    def validate(self, attrs):
        # Check that at least one login field is provided
        if not any(field in attrs for field in ['username', 'email', 'phone_number']):
            raise serializers.ValidationError("Please provide either username, email, or phone number.")
        return attrs


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for changing password"""
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect")
        return value 