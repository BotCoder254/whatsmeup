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
    path('messages/<int:message_id>/attachments/', views.AttachmentUploadView.as_view(), name='message-attachment'),
    path('uploads/', views.FileUploadView.as_view(), name='file-upload'),
    path('uploads/<str:upload_id>/progress/', views.FileUploadProgressView.as_view(), name='upload-progress'),
    path('messages/unread/', views.UnreadMessagesCountView.as_view(), name='unread-messages-count'),
] 