import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiSearch, FiX, FiMessageSquare, FiUser, FiUsers } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import UserAvatar from '../components/UserAvatar';
import LoadingScreen from '../components/LoadingScreen';

// API service functions
const fetchUsers = async () => {
  // In a real app, this would be an API call
  const response = await fetch('/api/users');
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
};

const startConversation = async (userId) => {
  // In a real app, this would be an API call
  const response = await fetch('/api/conversations/start_conversation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ user_id: userId })
  });
  
  if (!response.ok) throw new Error('Failed to start conversation');
  return response.json();
};

const Contacts = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'contacts', 'groups'
  
  // Queries
  const { 
    data: users = [], 
    isLoading,
    error
  } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 60000 // 1 minute
  });
  
  // Mutations
  const startConversationMutation = useMutation({
    mutationFn: startConversation,
    onSuccess: (data) => {
      navigate(`/chat/${data.id}`);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      showToast({
        message: 'Conversation started successfully',
        type: 'success'
      });
    },
    onError: (error) => {
      showToast({
        message: `Failed to start conversation: ${error.message}`,
        type: 'error'
      });
    }
  });
  
  // Filter users by search query and exclude current user
  const filteredUsers = users
    .filter(u => u.id !== user?.id)
    .filter(u => {
      if (!searchQuery) return true;
      return u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
             u.email.toLowerCase().includes(searchQuery.toLowerCase());
    });
  
  // Handle starting a conversation
  const handleStartConversation = (userId) => {
    startConversationMutation.mutate(userId);
  };
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b dark:border-gray-700">
        <h1 className="text-2xl font-bold mb-4">Contacts</h1>
        <div className="relative">
          <input
            type="text"
            placeholder="Search users..."
            className="w-full p-2 pl-10 rounded-lg bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <FiSearch className="absolute left-3 top-3 text-gray-400" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <FiX />
            </button>
          )}
        </div>
        
        {/* Tabs */}
        <div className="flex mt-4 border-b dark:border-gray-700">
          <button
            className={`flex items-center px-4 py-2 border-b-2 ${
              activeTab === 'all'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent hover:text-blue-500'
            }`}
            onClick={() => setActiveTab('all')}
          >
            <FiUser className="mr-2" />
            All Users
          </button>
          <button
            className={`flex items-center px-4 py-2 border-b-2 ${
              activeTab === 'contacts'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent hover:text-blue-500'
            }`}
            onClick={() => setActiveTab('contacts')}
          >
            <FiUsers className="mr-2" />
            My Contacts
          </button>
          <button
            className={`flex items-center px-4 py-2 border-b-2 ${
              activeTab === 'groups'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent hover:text-blue-500'
            }`}
            onClick={() => setActiveTab('groups')}
          >
            <FiUsers className="mr-2" />
            Groups
          </button>
        </div>
      </div>
      
      {/* User list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <LoadingScreen />
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">
            Error loading users: {error.message}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            {searchQuery ? 'No users found' : 'No users available'}
          </div>
        ) : (
          <div className="divide-y dark:divide-gray-700">
            {filteredUsers.map((contactUser) => (
              <motion.div
                key={contactUser.id}
                className="flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-800"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <UserAvatar user={contactUser} size="md" />
                
                <div className="ml-3 flex-1">
                  <h3 className="font-medium">{contactUser.username}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {contactUser.email}
                  </p>
                </div>
                
                <button
                  onClick={() => handleStartConversation(contactUser.id)}
                  className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <FiMessageSquare size={20} className="text-blue-500" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Contacts; 