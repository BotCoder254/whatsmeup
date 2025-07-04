from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Conversation, Message, Attachment, Notification
from accounts.serializers import UserSerializer

User = get_user_model()


class AttachmentSerializer(serializers.ModelSerializer):
    """Serializer for Attachment model"""
    class Meta:
        model = Attachment
        fields = ['id', 'file', 'file_name', 'file_type', 'uploaded_at']


class MessageSerializer(serializers.ModelSerializer):
    """Serializer for Message model"""
    sender = UserSerializer(read_only=True)
    reply_to_message = serializers.SerializerMethodField()
    attachment_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'sender', 'content', 'timestamp', 
            'is_read', 'reply_to', 'reply_to_message', 'attachment', 'attachment_url'
        ]
        read_only_fields = ['sender', 'timestamp', 'is_read']
    
    def get_reply_to_message(self, obj):
        """Return simplified data for the replied message"""
        if obj.reply_to:
            return {
                'id': obj.reply_to.id,
                'content': obj.reply_to.content[:100],  # Truncate long content
                'sender_name': obj.reply_to.sender.username,
                'sender_id': obj.reply_to.sender.id
            }
        return None
    
    def get_attachment_url(self, obj):
        """Return URL for the attachment if it exists"""
        if obj.attachment:
            return obj.attachment.url
        return None


class MessageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating Message objects"""
    class Meta:
        model = Message
        fields = ['conversation', 'content', 'reply_to', 'attachment']
    
    def create(self, validated_data):
        """Create a new message with the current user as sender"""
        user = self.context['request'].user
        message = Message.objects.create(
            sender=user,
            **validated_data
        )
        return message


class ConversationListSerializer(serializers.ModelSerializer):
    """Serializer for listing conversations"""
    participants = UserSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = [
            'id', 'participants', 'created_at', 'updated_at', 
            'is_group', 'name', 'last_message', 'unread_count'
        ]
    
    def get_last_message(self, obj):
        """Get the last message in the conversation"""
        last_message = obj.messages.order_by('-timestamp').first()
        if last_message:
            return {
                'id': last_message.id,
                'content': last_message.content[:50],  # Truncate long content
                'sender_id': last_message.sender.id,
                'sender_name': last_message.sender.username,
                'timestamp': last_message.timestamp,
                'is_read': last_message.is_read
            }
        return None
    
    def get_unread_count(self, obj):
        """Get count of unread messages for the current user"""
        user = self.context['request'].user
        return obj.get_unread_count(user)


class ConversationSerializer(serializers.ModelSerializer):
    """Serializer for Conversation model"""
    participants = UserSerializer(many=True, read_only=True)
    
    class Meta:
        model = Conversation
        fields = ['id', 'participants', 'created_at', 'updated_at', 'is_group', 'name']


class ConversationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating Conversation objects"""
    participants = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=User.objects.all()
    )
    
    class Meta:
        model = Conversation
        fields = ['participants', 'is_group', 'name']
    
    def create(self, validated_data):
        """Create a new conversation and add the current user as participant"""
        participants = validated_data.pop('participants', [])
        user = self.context['request'].user
        
        conversation = Conversation.objects.create(**validated_data)
        conversation.participants.add(user, *participants)
        
        return conversation


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for the Notification model"""
    sender = UserSerializer(read_only=True)
    recipient = UserSerializer(read_only=True)
    
    class Meta:
        model = Notification
        fields = ['id', 'recipient', 'sender', 'notification_type', 'message', 
                  'is_read', 'created_at', 'data', 'related_message', 'related_conversation']
        read_only_fields = ['id', 'created_at']
    
    def to_representation(self, instance):
        """Customize the representation of the notification"""
        representation = super().to_representation(instance)
        
        # Include minimal sender info
        if representation['sender']:
            sender = instance.sender
            representation['sender'] = {
                'id': sender.id,
                'username': sender.username,
                'profile_picture': sender.profile_picture.url if sender.profile_picture else None
            }
        
        # Include minimal recipient info
        recipient = instance.recipient
        representation['recipient'] = {
            'id': recipient.id,
            'username': recipient.username
        }
        
        return representation 