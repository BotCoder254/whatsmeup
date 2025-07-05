from django.db import models
from django.conf import settings
from django.db.models import Q
import os
from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile

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


def message_attachment_path(instance, filename):
    """Define upload path for message attachments"""
    # Get the file extension
    ext = filename.split('.')[-1]
    # Create path: chat_attachments/conversation_id/timestamp_filename.ext
    return f'chat_attachments/{instance.conversation.id}/{instance.sender.id}_{int(instance.timestamp.timestamp())}_{filename}'


class Message(models.Model):
    """A message in a conversation"""
    ATTACHMENT_TYPES = (
        ('image', 'Image'),
        ('audio', 'Audio'),
        ('video', 'Video'),
        ('document', 'Document'),
        ('other', 'Other'),
    )
    
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    read_by = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='read_messages', blank=True)
    reply_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='replies')
    parent_message = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='thread_replies')
    forwarded_from = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='forwarded_copies')
    forwarded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='forwarded_messages')
    is_forwarded = models.BooleanField(default=False)
    attachment = models.FileField(upload_to=message_attachment_path, null=True, blank=True)
    attachment_type = models.CharField(max_length=20, choices=ATTACHMENT_TYPES, null=True, blank=True)
    attachment_thumbnail = models.ImageField(upload_to='chat_thumbnails/', null=True, blank=True)
    
    def __str__(self):
        return f"Message from {self.sender.username} in {self.conversation}"
    
    def save(self, *args, **kwargs):
        # Detect attachment type if attachment is present
        if self.attachment and not self.attachment_type:
            self.set_attachment_type()
            
        # Generate thumbnail for image attachments
        if self.attachment and self.attachment_type == 'image' and not self.attachment_thumbnail:
            self.generate_thumbnail()
            
        super().save(*args, **kwargs)
    
    def set_attachment_type(self):
        """Detect attachment type based on file extension"""
        if not self.attachment:
            return
            
        filename = self.attachment.name.lower()
        
        # Check file extension
        if filename.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg')):
            self.attachment_type = 'image'
        elif filename.endswith(('.mp3', '.wav', '.ogg', '.m4a')):
            self.attachment_type = 'audio'
        elif filename.endswith(('.mp4', '.webm', '.mov', '.avi', '.mkv')):
            self.attachment_type = 'video'
        elif filename.endswith(('.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt')):
            self.attachment_type = 'document'
        else:
            self.attachment_type = 'other'
    
    def generate_thumbnail(self):
        """Generate thumbnail for image attachments"""
        if not self.attachment or not self.attachment_type == 'image':
            return
            
        try:
            # Open the image
            img = Image.open(self.attachment)
            
            # Resize to thumbnail
            img.thumbnail((300, 300))
            
            # Save thumbnail to in-memory file
            thumb_io = BytesIO()
            img_format = 'JPEG' if self.attachment.name.lower().endswith(('.jpg', '.jpeg')) else 'PNG'
            img.save(thumb_io, format=img_format)
            
            # Create a new file name
            thumb_filename = f"thumb_{os.path.basename(self.attachment.name)}"
            
            # Save to attachment_thumbnail field
            self.attachment_thumbnail.save(thumb_filename, ContentFile(thumb_io.getvalue()), save=False)
        except Exception as e:
            # Log the error but continue
            print(f"Error generating thumbnail: {e}")
    
    def mark_as_read(self, user):
        """Mark message as read by a specific user"""
        if user not in self.read_by.all():
            self.read_by.add(user)
            
            # If all participants except sender have read the message, mark as read
            participants = self.conversation.participants.all().exclude(id=self.sender.id)
            if all(p in self.read_by.all() for p in participants):
                self.is_read = True
                self.save()
    
    def forward_to_conversation(self, user, conversation):
        """Forward this message to another conversation"""
        forwarded_message = Message.objects.create(
            conversation=conversation,
            sender=user,
            content=self.content,
            forwarded_from=self,
            forwarded_by=user,
            is_forwarded=True,
            attachment=self.attachment,
            attachment_type=self.attachment_type
        )
        return forwarded_message
    
    def get_thread_messages(self):
        """Get all messages in this thread"""
        if self.parent_message:
            # This is a thread reply, return all siblings including parent
            return Message.objects.filter(
                Q(id=self.parent_message.id) | 
                Q(parent_message=self.parent_message)
            ).order_by('timestamp')
        else:
            # This is a parent message, return all replies
            return Message.objects.filter(
                parent_message=self
            ).order_by('timestamp')
    
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
        ('thread_reply', 'Thread Reply'),
        ('forwarded_message', 'Forwarded Message'),
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


class FileUpload(models.Model):
    """Track file upload progress"""
    file = models.FileField(upload_to='uploads/')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    upload_id = models.CharField(max_length=100, unique=True)
    progress = models.IntegerField(default=0)
    completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Upload {self.upload_id} by {self.user.username}"
