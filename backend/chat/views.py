from django.shortcuts import render
from rest_framework import generics, permissions, status, viewsets, parsers
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q, Max, Count
from rest_framework.decorators import action
import uuid
import os

from .models import Conversation, Message, Attachment, Notification, FileUpload
from accounts.models import User
from .serializers import (
    ConversationSerializer, ConversationCreateSerializer,
    MessageSerializer, MessageCreateSerializer, AttachmentSerializer,
    ConversationListSerializer, NotificationSerializer, FileUploadSerializer
)


class ConversationListView(generics.ListAPIView):
    """View for listing all conversations for a user"""
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user)


class ConversationCreateView(generics.CreateAPIView):
    """View for creating a new conversation"""
    serializer_class = ConversationCreateSerializer
    permission_classes = [permissions.IsAuthenticated]


class ConversationDetailView(generics.RetrieveAPIView):
    """View for retrieving a specific conversation"""
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user)


class MessageListView(generics.ListAPIView):
    """View for listing all messages in a conversation"""
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        conversation_id = self.kwargs.get('conversation_id')
        conversation = get_object_or_404(
            Conversation, 
            id=conversation_id, 
            participants=self.request.user
        )
        
        # Mark messages as read
        Message.objects.filter(
            conversation=conversation,
            is_read=False
        ).exclude(sender=self.request.user).update(is_read=True)
        
        return Message.objects.filter(conversation=conversation)


class MessageCreateView(generics.CreateAPIView):
    """View for creating a new message"""
    serializer_class = MessageCreateSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]
    
    def perform_create(self, serializer):
        conversation_id = self.kwargs.get('conversation_id')
        conversation = get_object_or_404(
            Conversation, 
            id=conversation_id, 
            participants=self.request.user
        )
        
        # Update conversation's last activity timestamp
        conversation.updated_at = timezone.now()
        conversation.save()
        
        # Save message with sender
        serializer.save(sender=self.request.user, conversation=conversation)


class AttachmentUploadView(APIView):
    """View for uploading attachments to a message"""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]
    
    def post(self, request, message_id):
        message = get_object_or_404(
            Message, 
            id=message_id, 
            sender=request.user
        )
        
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response(
                {"detail": "No file provided"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        attachment = Attachment.objects.create(
            message=message,
            file=file_obj,
            file_name=file_obj.name,
            file_type=file_obj.content_type
        )
        
        return Response(
            AttachmentSerializer(attachment).data, 
            status=status.HTTP_201_CREATED
        )


class FileUploadView(APIView):
    """View for handling file uploads with progress tracking"""
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]
    
    def post(self, request):
        serializer = FileUploadSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            upload = serializer.save()
            return Response(
                FileUploadSerializer(upload).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FileUploadProgressView(APIView):
    """View for checking file upload progress"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, upload_id):
        upload = get_object_or_404(
            FileUpload,
            upload_id=upload_id,
            user=request.user
        )
        
        return Response({
            'upload_id': upload.upload_id,
            'progress': upload.progress,
            'completed': upload.completed
        })


class UnreadMessagesCountView(APIView):
    """View for getting the count of unread messages"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        unread_count = Message.objects.filter(
            conversation__participants=request.user,
            is_read=False
        ).exclude(sender=request.user).count()
        
        return Response({"unread_count": unread_count})


class ConversationViewSet(viewsets.ModelViewSet):
    """API endpoint for conversations"""
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return conversations for the current user"""
        return Conversation.objects.filter(
            participants=self.request.user
        ).prefetch_related('participants')
    
    def get_serializer_class(self):
        """Return appropriate serializer class"""
        if self.action == 'list':
            return ConversationListSerializer
        return ConversationSerializer
    
    @action(detail=False, methods=['post'])
    def start_conversation(self, request):
        """Start a direct conversation with another user"""
        user_id = request.data.get('user_id')
        if not user_id:
            return Response(
                {'error': 'User ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            other_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
        # Get or create conversation
        conversation = Conversation.get_or_create_direct_conversation(
            request.user, other_user
        )
        
        serializer = self.get_serializer(conversation)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def messages(self, request, pk=None):
        """Get messages for a conversation"""
        conversation = self.get_object()
        
        # Mark messages as read
        unread_messages = Message.objects.filter(
            conversation=conversation,
            is_read=False
        ).exclude(sender=request.user)
        
        for message in unread_messages:
            message.mark_as_read(request.user)
        
        # Get messages with pagination
        page = self.paginate_queryset(
            Message.objects.filter(conversation=conversation)
        )
        
        if page is not None:
            serializer = MessageSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        messages = Message.objects.filter(conversation=conversation)
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread messages for each conversation"""
        conversations = self.get_queryset()
        result = {}
        
        for conversation in conversations:
            count = conversation.get_unread_count(request.user)
            if count > 0:
                result[str(conversation.id)] = count
                
        return Response(result)


class MessageViewSet(viewsets.ModelViewSet):
    """API endpoint for messages"""
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser]
    
    def get_queryset(self):
        """Return messages for the current user's conversations"""
        return Message.objects.filter(
            conversation__participants=self.request.user
        )
    
    def get_serializer_class(self):
        """Return appropriate serializer class"""
        if self.action == 'create':
            return MessageCreateSerializer
        return MessageSerializer
    
    def create(self, request, *args, **kwargs):
        """Create a new message"""
        conversation_id = request.data.get('conversation')
        content = request.data.get('content', '')
        reply_to_id = request.data.get('reply_to')
        attachment = request.FILES.get('attachment')
        
        if not conversation_id:
            return Response(
                {'error': 'Conversation ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            conversation = Conversation.objects.get(
                id=conversation_id,
                participants=request.user
            )
        except Conversation.DoesNotExist:
            return Response(
                {'error': 'Conversation not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
            
        # Handle reply_to if provided
        reply_to = None
        if reply_to_id:
            try:
                reply_to = Message.objects.get(id=reply_to_id)
            except Message.DoesNotExist:
                pass
        
        # Create message
        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=content,
            reply_to=reply_to
        )
        
        # Handle attachment if provided
        if attachment:
            message.attachment = attachment
            message.save()
        
        # Update conversation timestamp
        conversation.updated_at = timezone.now()
        conversation.save()
        
        # Create notifications for other participants
        for participant in conversation.participants.exclude(id=request.user.id):
            Notification.objects.create(
                recipient=participant,
                sender=request.user,
                notification_type='message',
                message=f"New message from {request.user.username}",
                related_message=message,
                related_conversation=conversation,
                data={
                    'conversation_id': conversation.id,
                    'message_id': message.id,
                    'has_attachment': bool(attachment)
                }
            )
        
        serializer = MessageSerializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a message as read"""
        message = self.get_object()
        message.mark_as_read(request.user)
        return Response({'status': 'message marked as read'})


class AttachmentViewSet(viewsets.ModelViewSet):
    """API endpoint for attachments"""
    serializer_class = AttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [parsers.MultiPartParser, parsers.FormParser]
    
    def get_queryset(self):
        """Return attachments for the current user's messages"""
        return Attachment.objects.filter(
            message__conversation__participants=self.request.user
        )


class NotificationViewSet(viewsets.ModelViewSet):
    """ViewSet for the Notification model"""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return notifications for the current user"""
        return Notification.objects.filter(recipient=self.request.user)
    
    @action(detail=False, methods=['get'])
    def unread(self, request):
        """Get unread notifications"""
        notifications = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        )
        serializer = self.get_serializer(notifications, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read"""
        Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).update(is_read=True)
        
        return Response({
            'status': 'all notifications marked as read'
        })
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a notification as read"""
        notification = self.get_object()
        notification.mark_as_read()
        return Response({'status': 'notification marked as read'})
    
    def perform_create(self, serializer):
        """Create notification with recipient"""
        serializer.save(recipient=self.request.user)
