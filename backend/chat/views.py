from django.shortcuts import render
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q, Max, Count
from rest_framework.decorators import action

from .models import Conversation, Message, Attachment, Notification
from accounts.models import User
from .serializers import (
    ConversationSerializer, ConversationCreateSerializer,
    MessageSerializer, MessageCreateSerializer, AttachmentSerializer,
    ConversationListSerializer, NotificationSerializer
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
            message.is_read = True
            message.save()
        
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
    
    def get_queryset(self):
        """Return messages for the current user's conversations"""
        return Message.objects.filter(
            conversation__participants=self.request.user
        )
    
    def create(self, request, *args, **kwargs):
        """Create a new message"""
        conversation_id = request.data.get('conversation_id')
        content = request.data.get('content')
        reply_to_id = request.data.get('reply_to')
        
        if not conversation_id or not content:
            return Response(
                {'error': 'Conversation ID and content are required'}, 
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
                return Response(
                    {'error': 'Reply message not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
        
        # Create message
        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=content,
            reply_to=reply_to
        )
        
        # Handle file attachment if provided
        if 'attachment' in request.FILES:
            attachment_file = request.FILES['attachment']
            message.attachment = attachment_file
            message.save()
        
        # Update conversation timestamp
        conversation.updated_at = timezone.now()
        conversation.save()
        
        serializer = self.get_serializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a message as read"""
        message = self.get_object()
        message.mark_as_read()
        return Response({'status': 'message marked as read'})


class AttachmentViewSet(viewsets.ModelViewSet):
    """API endpoint for attachments"""
    serializer_class = AttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return attachments for the current user's conversations"""
        return Attachment.objects.filter(
            message__conversation__participants=self.request.user
        )


class NotificationViewSet(viewsets.ModelViewSet):
    """ViewSet for the Notification model"""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return notifications for the current user"""
        return Notification.objects.filter(recipient=self.request.user).order_by('-created_at')
    
    @action(detail=False, methods=['get'])
    def unread(self):
        """Return unread notifications for the current user"""
        unread_notifications = Notification.objects.filter(
            recipient=self.request.user,
            is_read=False
        ).order_by('-created_at')
        serializer = self.get_serializer(unread_notifications, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Mark all notifications as read"""
        notifications = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        )
        count = notifications.count()
        notifications.update(is_read=True)
        return Response({'status': 'success', 'marked_read': count})
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark a notification as read"""
        notification = self.get_object()
        notification.mark_as_read()
        return Response({'status': 'success'})
    
    def perform_create(self, serializer):
        """Set the recipient to the current user when creating a notification"""
        serializer.save(recipient=self.request.user)
