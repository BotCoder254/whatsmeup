from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'conversations', views.ConversationViewSet, basename='conversation')
router.register(r'messages', views.MessageViewSet, basename='message')
router.register(r'attachments', views.AttachmentViewSet, basename='attachment')
router.register(r'notifications', views.NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
    path('conversations/<uuid:conversation_id>/messages/', views.MessageListView.as_view(), name='conversation-messages'),
    path('conversations/<uuid:conversation_id>/messages/create/', views.MessageCreateView.as_view(), name='create-message'),
    path('messages/<uuid:message_id>/attachments/', views.AttachmentUploadView.as_view(), name='upload-attachment'),
    path('files/upload/', views.FileUploadView.as_view(), name='file-upload'),
    path('files/upload/<str:upload_id>/progress/', views.FileUploadProgressView.as_view(), name='file-upload-progress'),
    path('unread-messages-count/', views.UnreadMessagesCountView.as_view(), name='unread-messages-count'),
    # New endpoints for threaded replies
    path('messages/<uuid:pk>/thread/', views.MessageViewSet.as_view({'get': 'thread'}), name='message-thread'),
    # New endpoint for forwarding messages
    path('messages/<uuid:pk>/forward/', views.MessageViewSet.as_view({'post': 'forward'}), name='forward-message'),
    # New endpoint for message search
    path('messages/search/', views.MessageSearchView.as_view(), name='message-search'),
] 