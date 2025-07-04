import axios from 'axios';

// Base API configuration
const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Chat API
export const chatApi = {
  // Get all conversations
  getConversations: () => api.get('/chat/conversations/'),
  
  // Get a specific conversation
  getConversation: (id) => api.get(`/chat/conversations/${id}/`),
  
  // Create a new conversation
  createConversation: (data) => api.post('/chat/conversations/create/', data),
  
  // Get messages for a conversation
  getMessages: (conversationId) => api.get(`/chat/conversations/${conversationId}/messages/`),
  
  // Send a message
  sendMessage: (conversationId, content, replyTo = null) => api.post(`/chat/conversations/${conversationId}/messages/create/`, { 
    content,
    reply_to: replyTo 
  }),
  
  // Send a message with attachment
  sendMessageWithAttachment: (conversationId, content, file, replyTo = null) => {
    const formData = new FormData();
    formData.append('content', content);
    formData.append('attachment', file);
    
    if (replyTo) {
      formData.append('reply_to', replyTo);
    }
    
    return api.post(`/chat/conversations/${conversationId}/messages/create/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  // Upload attachment
  uploadAttachment: (messageId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/chat/messages/${messageId}/attachments/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  // Get file upload progress
  getFileUploadProgress: (uploadId) => api.get(`/chat/uploads/${uploadId}/progress/`),
  
  // Send voice note
  sendVoiceNote: (conversationId, audioBlob, replyTo = null) => {
    const formData = new FormData();
    formData.append('content', 'Voice note');
    formData.append('attachment', audioBlob, 'voice_note.mp3');
    
    if (replyTo) {
      formData.append('reply_to', replyTo);
    }
    
    return api.post(`/chat/conversations/${conversationId}/messages/create/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  // Get unread messages count
  getUnreadCount: () => api.get('/chat/messages/unread/'),
  
  // Get all notifications
  getNotifications: () => api.get('/chat/notifications/'),
  
  // Get unread notifications
  getUnreadNotifications: () => api.get('/chat/notifications/unread/'),
  
  // Mark a notification as read
  markNotificationRead: (id) => api.post(`/chat/notifications/${id}/mark_read/`),
  
  // Mark all notifications as read
  markAllNotificationsRead: () => api.post('/chat/notifications/mark_all_read/'),
  
  // Get online users
  getOnlineUsers: () => api.get('/chat/online-users/'),
};

// User API
export const userApi = {
  // Search users
  searchUsers: (query) => api.get(`/accounts/search/?q=${query}`),
  
  // Get user profile
  getProfile: () => api.get('/accounts/profile/'),
  
  // Update user profile
  updateProfile: (data) => api.patch('/accounts/profile/', data),
  
  // Change password
  changePassword: (data) => api.post('/accounts/change-password/', data),
  
  // Upload profile picture
  uploadProfilePicture: (file) => {
    const formData = new FormData();
    formData.append('profile_picture', file);
    return api.patch('/accounts/profile/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// Add token to requests
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export default api; 