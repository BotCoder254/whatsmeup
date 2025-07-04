from django.db import models
from django.conf import settings
from django.db.models import Q

class Conversation(models.Model):
    """A conversation between two or more users"""
    participants = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='conversations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_group = models.BooleanField(default=False)
    name = models.CharField(max_length=255, blank=True, null=True)  # For group chats
    
    def __str__(self):
        if self.is_group and self.name:
            return f"Group: {self.name}"
        return f"Conversation {self.id}"
    
    @classmethod
    def get_or_create_direct_conversation(cls, user1, user2):
        """Get or create a direct conversation between two users"""
        # Check if a direct conversation already exists between these users
        conversations = cls.objects.filter(is_group=False, participants=user1).filter(participants=user2)
        
        if conversations.exists():
            return conversations.first()
        
        # Create a new conversation
        conversation = cls.objects.create(is_group=False)
        conversation.participants.add(user1, user2)
        return conversation
    
    def get_unread_count(self, user):
        """Get count of unread messages for a user"""
        return self.messages.filter(~Q(sender=user), is_read=False).count()
    
    class Meta:
        ordering = ['-updated_at']


class Message(models.Model):
    """A message in a conversation"""
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    read_by = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='read_messages', blank=True)
    reply_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    attachment = models.FileField(upload_to='chat_attachments/', null=True, blank=True)
    
    def __str__(self):
        return f"Message from {self.sender.username} in {self.conversation}"
    
    def mark_as_read(self, user):
        """Mark message as read by a specific user"""
        if user not in self.read_by.all():
            self.read_by.add(user)
            
            # If all participants except sender have read the message, mark as read
            participants = self.conversation.participants.all().exclude(id=self.sender.id)
            if all(p in self.read_by.all() for p in participants):
                self.is_read = True
                self.save()
    
    class Meta:
        ordering = ['timestamp']


class Attachment(models.Model):
    """Files attached to messages"""
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='chat_attachments/')
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Attachment: {self.file_name}"


class Notification(models.Model):
    """User notifications"""
    NOTIFICATION_TYPES = (
        ('message', 'New Message'),
        ('friend_request', 'Friend Request'),
        ('friend_accept', 'Friend Request Accepted'),
        ('mention', 'Mention'),
        ('system', 'System Notification'),
    )
    
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_notifications', null=True, blank=True)
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    data = models.JSONField(default=dict, blank=True)  # Additional data related to the notification
    
    # Optional related objects
    related_message = models.ForeignKey(Message, on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications')
    related_conversation = models.ForeignKey(Conversation, on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications')
    
    def __str__(self):
        return f"Notification for {self.recipient.username}: {self.message[:30]}..."
    
    def mark_as_read(self):
        """Mark notification as read"""
        if not self.is_read:
            self.is_read = True
            self.save()
    
    class Meta:
        ordering = ['-created_at']
