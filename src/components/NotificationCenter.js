import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiX, FiCheck, FiMessageCircle, FiUser, FiUsers, FiInfo } from 'react-icons/fi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import Badge from './Badge';
import { chatApi } from '../services/api';

const NotificationCenter = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notificationSocket, setNotificationSocket] = useState(null);
  const { currentUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await chatApi.getNotifications();
      return response.data;
    },
    enabled: !!currentUser,
  });
  
  // Get unread count
  const unreadCount = notifications.filter(n => !n.is_read).length;
  
  // Setup WebSocket connection for real-time notifications
  useEffect(() => {
    if (!currentUser) return;
    
    // Create WebSocket connection
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${wsProtocol}://${window.location.host}/ws/presence/${currentUser.id}/`;
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('WebSocket connected for notifications');
    };
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'notification') {
        // Add new notification to cache
        queryClient.setQueryData(['notifications'], (oldData = []) => {
          return [data, ...oldData];
        });
        
        // Show toast for new notification
        toast.info(data.message, {
          duration: 5000,
          position: 'top-right'
        });
      }
    };
    
    socket.onclose = () => {
      console.log('WebSocket disconnected for notifications');
      // Try to reconnect after a delay
      setTimeout(() => {
        if (currentUser) {
          setNotificationSocket(null);
        }
      }, 3000);
    };
    
    setNotificationSocket(socket);
    
    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [currentUser, queryClient, toast]);
  
  // Toggle notification panel
  const toggleNotifications = () => {
    setIsOpen(!isOpen);
  };
  
  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await chatApi.markAllNotificationsRead();
      queryClient.setQueryData(['notifications'], (oldData = []) => {
        return oldData.map(n => ({ ...n, is_read: true }));
      });
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  };
  
  // Mark a single notification as read
  const markAsRead = async (id) => {
    try {
      await chatApi.markNotificationRead(id);
      queryClient.setQueryData(['notifications'], (oldData = []) => {
        return oldData.map(n => n.id === id ? { ...n, is_read: true } : n);
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  // Handle notification click
  const handleNotificationClick = (notification) => {
    // Mark as read
    markAsRead(notification.id);
    
    // Navigate based on notification type
    switch (notification.notification_type) {
      case 'message':
        if (notification.related_conversation) {
          navigate(`/chat/${notification.related_conversation}`);
        } else {
          navigate('/chat');
        }
        break;
      case 'friend_request':
      case 'friend_accept':
        navigate('/contacts');
        break;
      default:
        // For other types, just close the panel
        break;
    }
    
    // Close notification panel
    setIsOpen(false);
  };
  
  // Get icon for notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return <FiMessageCircle className="text-blue-500" />;
      case 'friend_request':
        return <FiUser className="text-green-500" />;
      case 'friend_accept':
        return <FiUsers className="text-purple-500" />;
      default:
        return <FiInfo className="text-gray-500" />;
    }
  };
  
  return (
    <div className="relative">
      {/* Notification bell button */}
      <button
        onClick={toggleNotifications}
        className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
        aria-label="Notifications"
      >
        <FiBell size={20} />
        {unreadCount > 0 && (
          <Badge 
            variant="danger" 
            size="sm" 
            pill 
            animated
            className="absolute -top-1 -right-1"
          >
            {unreadCount}
          </Badge>
        )}
      </button>
      
      {/* Notification panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium">Notifications</h3>
              <div className="flex space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="p-1 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center"
                  >
                    <FiCheck className="mr-1" /> Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                >
                  <FiX />
                </button>
              </div>
            </div>
            
            {/* Notification list */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                  No notifications
                </div>
              ) : (
                notifications.map(notification => (
                  <motion.div
                    key={notification.id}
                    whileHover={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer flex items-start ${
                      !notification.is_read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="mr-3 mt-1">
                      {getNotificationIcon(notification.notification_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.is_read ? 'font-medium' : ''}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(notification.created_at).toLocaleString()}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationCenter; 