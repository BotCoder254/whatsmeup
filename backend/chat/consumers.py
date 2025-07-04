import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from .models import Conversation, Message
from accounts.models import User


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type', 'message')
        
        if message_type == 'message':
            message = text_data_json['message']
            sender_id = text_data_json['sender_id']
            conversation_id = text_data_json['conversation_id']
            attachment = text_data_json.get('attachment', None)
            reply_to = text_data_json.get('reply_to', None)
            
            # Save message to database
            message_obj = await self.save_message(
                sender_id=sender_id,
                conversation_id=conversation_id,
                content=message,
                attachment=attachment,
                reply_to=reply_to
            )
            
            # Send message to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message,
                    'sender_id': sender_id,
                    'message_id': message_obj.id,
                    'timestamp': message_obj.timestamp.isoformat(),
                    'attachment': attachment,
                    'reply_to': reply_to
                }
            )
        
        elif message_type == 'typing':
            user_id = text_data_json['user_id']
            is_typing = text_data_json['is_typing']
            
            # Send typing status to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing_status',
                    'user_id': user_id,
                    'is_typing': is_typing
                }
            )
        
        elif message_type == 'read_receipt':
            user_id = text_data_json['user_id']
            message_id = text_data_json['message_id']
            
            # Update message read status in database
            await self.mark_message_read(message_id, user_id)
            
            # Send read receipt to room group
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'read_receipt',
                    'user_id': user_id,
                    'message_id': message_id
                }
            )

    # Receive message from room group
    async def chat_message(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': event['message'],
            'sender_id': event['sender_id'],
            'message_id': event['message_id'],
            'timestamp': event['timestamp'],
            'attachment': event.get('attachment'),
            'reply_to': event.get('reply_to')
        }))
    
    # Receive typing status from room group
    async def typing_status(self, event):
        # Send typing status to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'user_id': event['user_id'],
            'is_typing': event['is_typing']
        }))
    
    # Receive read receipt from room group
    async def read_receipt(self, event):
        # Send read receipt to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'read_receipt',
            'user_id': event['user_id'],
            'message_id': event['message_id']
        }))
    
    @database_sync_to_async
    def save_message(self, sender_id, conversation_id, content, attachment=None, reply_to=None):
        sender = User.objects.get(id=sender_id)
        conversation = Conversation.objects.get(id=conversation_id)
        
        reply_to_message = None
        if reply_to:
            reply_to_message = Message.objects.get(id=reply_to)
            
        message = Message.objects.create(
            conversation=conversation,
            sender=sender,
            content=content,
            attachment=attachment,
            reply_to=reply_to_message
        )
        
        return message
    
    @database_sync_to_async
    def mark_message_read(self, message_id, user_id):
        message = Message.objects.get(id=message_id)
        user = User.objects.get(id=user_id)
        
        # Add user to read_by field if it's a ManyToMany field
        message.read_by.add(user)
        message.save()
        
        return message


class PresenceConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        
        # Add to user's personal channel
        self.personal_group_name = f'user_{self.user_id}'
        await self.channel_layer.group_add(
            self.personal_group_name,
            self.channel_name
        )
        
        # Add to global presence channel
        self.presence_group_name = 'presence'
        await self.channel_layer.group_add(
            self.presence_group_name,
            self.channel_name
        )
        
        # Accept connection
        await self.accept()
        
        # Set user as online
        await self.set_user_online(self.user_id)
        
        # Broadcast user online status
        await self.channel_layer.group_send(
            self.presence_group_name,
            {
                'type': 'user_online',
                'user_id': self.user_id,
                'online': True
            }
        )
    
    async def disconnect(self, close_code):
        # Set user as offline
        await self.set_user_offline(self.user_id)
        
        # Broadcast user offline status
        await self.channel_layer.group_send(
            self.presence_group_name,
            {
                'type': 'user_online',
                'user_id': self.user_id,
                'online': False,
                'last_seen': timezone.now().isoformat()
            }
        )
        
        # Remove from user's personal channel
        await self.channel_layer.group_discard(
            self.personal_group_name,
            self.channel_name
        )
        
        # Remove from global presence channel
        await self.channel_layer.group_discard(
            self.presence_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type', '')
        
        if message_type == 'get_online_users':
            online_users = await self.get_online_users()
            await self.send(text_data=json.dumps({
                'type': 'online_users',
                'users': online_users
            }))
    
    async def user_online(self, event):
        # Send user online status to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'presence',
            'user_id': event['user_id'],
            'online': event['online'],
            'last_seen': event.get('last_seen')
        }))
    
    async def notification(self, event):
        # Send notification to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'notification_id': event['notification_id'],
            'message': event['message'],
            'from_user': event['from_user'],
            'notification_type': event['notification_type'],
            'timestamp': event['timestamp'],
            'data': event.get('data', {})
        }))
    
    @database_sync_to_async
    def set_user_online(self, user_id):
        user = User.objects.get(id=user_id)
        user.is_online = True
        user.last_seen = timezone.now()
        user.save()
        return user
    
    @database_sync_to_async
    def set_user_offline(self, user_id):
        user = User.objects.get(id=user_id)
        user.is_online = False
        user.last_seen = timezone.now()
        user.save()
        return user
    
    @database_sync_to_async
    def get_online_users(self):
        users = User.objects.filter(is_online=True).values_list('id', flat=True)
        return list(users) 