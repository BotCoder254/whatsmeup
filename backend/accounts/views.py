from django.shortcuts import render
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from .serializers import (
    RegisterSerializer, LoginSerializer, UserSerializer, 
    PasswordChangeSerializer, UserProfileSerializer
)
from .models import UserProfile

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """View for user registration"""
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """View for user login"""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Determine which field to use for authentication
        if 'username' in serializer.validated_data:
            username = serializer.validated_data['username']
            user = authenticate(
                request, 
                username=username, 
                password=serializer.validated_data['password']
            )
        elif 'email' in serializer.validated_data:
            email = serializer.validated_data['email']
            try:
                user_obj = User.objects.get(email=email)
                user = authenticate(
                    request, 
                    username=user_obj.username, 
                    password=serializer.validated_data['password']
                )
            except User.DoesNotExist:
                user = None
        elif 'phone_number' in serializer.validated_data:
            phone_number = serializer.validated_data['phone_number']
            try:
                user_obj = User.objects.get(phone_number=phone_number)
                user = authenticate(
                    request, 
                    username=user_obj.username, 
                    password=serializer.validated_data['password']
                )
            except User.DoesNotExist:
                user = None
        else:
            return Response(
                {"detail": "Please provide valid credentials"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if user:
            refresh = RefreshToken.for_user(user)
            
            # Update user's online status
            user.is_online = True
            user.save()
            
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            })
        
        return Response(
            {"detail": "Invalid credentials"}, 
            status=status.HTTP_401_UNAUTHORIZED
        )


class LogoutView(APIView):
    """View for user logout"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        user = request.user
        user.is_online = False
        user.save()
        
        return Response({"detail": "Successfully logged out"}, status=status.HTTP_200_OK)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """View for retrieving and updating user profile"""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user


class PasswordChangeView(APIView):
    """View for changing password"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        
        # Check if old password is correct
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {"old_password": "Wrong password"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Set new password
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        return Response({"detail": "Password changed successfully"}, status=status.HTTP_200_OK)


class UserSearchView(generics.ListAPIView):
    """View for searching users"""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        query = self.request.query_params.get('q', '')
        if query:
            return User.objects.filter(
                username__icontains=query
            ).exclude(id=self.request.user.id)
        return User.objects.none()
