from django.contrib import admin
from .models import Conversation, Message, Attachment, Notification

class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ('timestamp',)

class AttachmentInline(admin.TabularInline):
    model = Attachment
    extra = 0
    readonly_fields = ('uploaded_at',)

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'is_group', 'name', 'created_at', 'updated_at')
    list_filter = ('is_group', 'created_at')
    search_fields = ('name',)
    filter_horizontal = ('participants',)
    date_hierarchy = 'created_at'

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'sender', 'conversation', 'content_preview', 'is_read', 'timestamp')
    list_filter = ('is_read', 'timestamp')
    search_fields = ('content', 'sender__username')
    date_hierarchy = 'timestamp'
    raw_id_fields = ('sender', 'conversation', 'reply_to')
    filter_horizontal = ('read_by',)
    
    def content_preview(self, obj):
        """Return a preview of the message content"""
        if len(obj.content) > 50:
            return f"{obj.content[:50]}..."
        return obj.content
    
    content_preview.short_description = 'Content'

@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'message', 'file_name', 'file_type', 'uploaded_at')
    list_filter = ('file_type', 'uploaded_at')
    search_fields = ('file_name',)
    date_hierarchy = 'uploaded_at'
    raw_id_fields = ('message',)

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'recipient', 'sender', 'notification_type', 'message_preview', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('message', 'recipient__username', 'sender__username')
    date_hierarchy = 'created_at'
    raw_id_fields = ('recipient', 'sender', 'related_message', 'related_conversation')
    
    def message_preview(self, obj):
        """Return a preview of the notification message"""
        if len(obj.message) > 50:
            return f"{obj.message[:50]}..."
        return obj.message
    
    message_preview.short_description = 'Message'
