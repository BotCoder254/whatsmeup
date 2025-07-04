import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FiMessageCircle, FiUsers, FiClock, FiBell } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { chatApi } from '../services/api';
import ConversationItem from '../components/ConversationItem';

const Dashboard = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Fetch conversations
  const {
    data: conversations = [],
    isLoading: isLoadingConversations,
    error: conversationsError,
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await chatApi.getConversations();
      return response.data;
    },
    staleTime: 10000, // 10 seconds
  });

  // Fetch unread messages count
  const {
    data: unreadData,
    isLoading: isLoadingUnread,
  } = useQuery({
    queryKey: ['unread'],
    queryFn: async () => {
      const response = await chatApi.getUnreadCount();
      return response.data;
    },
    staleTime: 30000, // 30 seconds
  });

  // Get recent conversations (last 5)
  const recentConversations = [...conversations]
    .sort((a, b) => {
      const aTime = a.last_message?.timestamp ? new Date(a.last_message.timestamp) : new Date(0);
      const bTime = b.last_message?.timestamp ? new Date(b.last_message.timestamp) : new Date(0);
      return bTime - aTime;
    })
    .slice(0, 5);
  
  // Calculate stats
  const totalConversations = conversations.length;
  const unreadCount = unreadData?.unread_count || 0;
  const activeToday = conversations.filter(conv => {
    if (!conv.last_message?.timestamp) return false;
    const lastMessageDate = new Date(conv.last_message.timestamp);
    const today = new Date();
    return (
      lastMessageDate.getDate() === today.getDate() &&
      lastMessageDate.getMonth() === today.getMonth() &&
      lastMessageDate.getFullYear() === today.getFullYear()
    );
  }).length;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>
      
      {/* Welcome message */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 p-6 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg text-white shadow-lg"
      >
        <h2 className="text-xl font-semibold mb-2">Welcome back, {currentUser?.username}!</h2>
        <p className="opacity-90">
          {unreadCount > 0
            ? `You have ${unreadCount} unread message${unreadCount !== 1 ? 's' : ''}.`
            : 'You\'re all caught up with your messages!'}
        </p>
      </motion.div>
      
      {/* Stats */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        <motion.div variants={itemVariants} className="card flex items-center p-4">
          <div className="p-3 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mr-4">
            <FiMessageCircle size={24} />
          </div>
          <div>
            <h3 className="text-sm text-gray-500 dark:text-gray-400">Total Conversations</h3>
            <p className="text-2xl font-semibold">{isLoadingConversations ? '...' : totalConversations}</p>
          </div>
        </motion.div>
        
        <motion.div variants={itemVariants} className="card flex items-center p-4">
          <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mr-4">
            <FiBell size={24} />
          </div>
          <div>
            <h3 className="text-sm text-gray-500 dark:text-gray-400">Unread Messages</h3>
            <p className="text-2xl font-semibold">{isLoadingUnread ? '...' : unreadCount}</p>
          </div>
        </motion.div>
        
        <motion.div variants={itemVariants} className="card flex items-center p-4">
          <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mr-4">
            <FiClock size={24} />
          </div>
          <div>
            <h3 className="text-sm text-gray-500 dark:text-gray-400">Active Today</h3>
            <p className="text-2xl font-semibold">{isLoadingConversations ? '...' : activeToday}</p>
          </div>
        </motion.div>
        
        <motion.div variants={itemVariants} className="card flex items-center p-4">
          <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 mr-4">
            <FiUsers size={24} />
          </div>
          <div>
            <h3 className="text-sm text-gray-500 dark:text-gray-400">Group Chats</h3>
            <p className="text-2xl font-semibold">
              {isLoadingConversations ? '...' : conversations.filter(c => c.is_group).length}
            </p>
          </div>
        </motion.div>
      </motion.div>
      
      {/* Recent conversations */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <div className="flex justify-between items-center mb-4 p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Recent Conversations</h2>
          <button
            onClick={() => navigate('/chat')}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            View All
          </button>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {isLoadingConversations ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          ) : conversationsError ? (
            <div className="text-center p-8 text-red-500">
              Failed to load conversations
            </div>
          ) : recentConversations.length === 0 ? (
            <div className="text-center p-8 text-gray-500 dark:text-gray-400">
              No conversations yet. Start chatting!
            </div>
          ) : (
            recentConversations.map((conversation) => (
              <div key={conversation.id} className="p-2">
                <ConversationItem
                  conversation={conversation}
                  isActive={false}
                  onClick={() => navigate(`/chat/${conversation.id}`)}
                />
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard; 