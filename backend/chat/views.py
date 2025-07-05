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
from datetime import datetime

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
        
        # Only return top-level messages (not thread replies)
        return Message.objects.filter(
            conversation=conversation,
            parent_message__isnull=True
        )


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


class MessageSearchView(generics.ListAPIView):
    """View for searching messages"""
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        query = self.request.query_params.get('q', '')
        conversation_id = self.request.query_params.get('conversation_id')
        sender_id = self.request.query_params.get('sender_id')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        # Base queryset: messages from conversations the user is part of
        queryset = Message.objects.filter(
            conversation__participants=user
        )
        
        # Filter by conversation if specified
        if conversation_id:
            queryset = queryset.filter(conversation_id=conversation_id)
        
        # Filter by sender if specified
        if sender_id:
            queryset = queryset.filter(sender_id=sender_id)
        
        # Filter by date range if specified
        if start_date:
            try:
                start_datetime = datetime.strptime(start_date, '%Y-%m-%d')
                queryset = queryset.filter(timestamp__gte=start_datetime)
            except ValueError:
                pass
        
        if end_date:
            try:
                end_datetime = datetime.strptime(end_date, '%Y-%m-%d')
                # Add a day to include the end date fully
                end_datetime = datetime.combine(end_datetime.date(), datetime.max.time())
                queryset = queryset.filter(timestamp__lte=end_datetime)
            except ValueError:
                pass
        
        # Search by content if query is provided
        if query:
            queryset = queryset.filter(
                Q(content__icontains=query) |
                Q(sender__username__icontains=query)
            )
        
        return queryset.order_by('-timestamp')


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
        
        # Get parent_message_id from query params to filter thread messages
        parent_message_id = request.query_params.get('parent_message_id')
        
        # Mark messages as read
        unread_messages = Message.objects.filter(
            conversation=conversation,
            is_read=False
        ).exclude(sender=request.user)
        
        for message in unread_messages:
            message.mark_as_read(request.user)
        
        # Filter messages based on parent_message_id
        if parent_message_id:
            # Get thread messages
            messages_queryset = Message.objects.filter(
                Q(id=parent_message_id) |  # Include the parent message
                Q(parent_message_id=parent_message_id)  # Include thread replies
            ).order_by('timestamp')
        else:
            # Get top-level messages only (not thread replies)
            messages_queryset = Message.objects.filter(
                conversation=conversation,
                parent_message__isnull=True
            ).order_by('timestamp')
        
        # Get messages with pagination
        page = self.paginate_queryset(messages_queryset)
        
        if page is not None:
            serializer = MessageSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = MessageSerializer(messages_queryset, many=True)
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
        parent_message_id = request.data.get('parent_message')
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
        
        # Handle parent_message if provided
        parent_message = None
        if parent_message_id:
            try:
                parent_message = Message.objects.get(id=parent_message_id)
                
                # Ensure parent message belongs to the same conversation
                if parent_message.conversation.id != conversation.id:
                    return Response(
                        {'error': 'Parent message must be in the same conversation'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except Message.DoesNotExist:
                pass
        
        # Create message
        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=content,
            reply_to=reply_to,
            parent_message=parent_message
        )
        
        # Handle attachment if provided
        if attachment:
            message.attachment = attachment
            message.save()
        
        # Update conversation timestamp
        conversation.updated_at = timezone.now()
        conversation.save()
        
        # Create notifications for other participants
        notification_type = 'thread_reply' if parent_message else 'message'
        notification_message = f"New thread reply from {request.user.username}" if parent_message else f"New message from {request.user.username}"
        
        for participant in conversation.participants.exclude(id=request.user.id):
            Notification.objects.create(
                recipient=participant,
                sender=request.user,
                notification_type=notification_type,
                message=notification_message,
                related_message=message,
                related_conversation=conversation,
                data={
                    'conversation_id': conversation.id,
                    'message_id': message.id,
                    'has_attachment': bool(attachment),
                    'is_thread_reply': bool(parent_message),
                    'parent_message_id': parent_message.id if parent_message else None
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
    
    @action(detail=True, methods=['get'])
    def thread(self, request, pk=None):
        """Get thread messages for a parent message"""
        parent_message = self.get_object()
        
        # Get all messages in the thread
        thread_messages = Message.objects.filter(
            Q(id=parent_message.id) |  # Include the parent message
            Q(parent_message=parent_message)  # Include thread replies
        ).order_by('timestamp')
        
        serializer = MessageSerializer(thread_messages, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def forward(self, request, pk=None):
        """Forward a message to another conversation"""
        original_message = self.get_object()
        target_conversation_id = request.data.get('conversation_id')
        
        if not target_conversation_id:
            return Response(
                {'error': 'Target conversation ID is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            target_conversation = Conversation.objects.get(
                id=target_conversation_id,
                participants=request.user
            )
        except Conversation.DoesNotExist:
            return Response(
                {'error': 'Target conversation not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Forward the message
        forwarded_message = original_message.forward_to_conversation(
            request.user, target_conversation
        )
        
        # Create notification for recipients
        for participant in target_conversation.participants.exclude(id=request.user.id):
            Notification.objects.create(
                recipient=participant,
                sender=request.user,
                notification_type='forwarded_message',
                message=f"{request.user.username} forwarded a message",
                related_message=forwarded_message,
                related_conversation=target_conversation,
                data={
                    'conversation_id': target_conversation.id,
                    'message_id': forwarded_message.id,
                    'original_message_id': original_message.id,
                    'original_conversation_id': original_message.conversation.id,
                    'has_attachment': bool(forwarded_message.attachment)
                }
            )
        
        serializer = MessageSerializer(forwarded_message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search messages by keyword, date, or sender"""
        search_view = MessageSearchView.as_view()
        return search_view(request._request)


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
