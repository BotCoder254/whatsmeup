import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiSearch, FiShare } from 'react-icons/fi';
import PropTypes from 'prop-types';
import { useTheme } from '../contexts/ThemeContext';
import { chatApi } from '../services/api';
import UserAvatar from './UserAvatar';

const ForwardMessageModal = ({ isOpen, onClose, message, onForward }) => {
  const { darkMode } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [forwardingStatus, setForwardingStatus] = useState('idle'); // idle, loading, success, error

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
    }
  }, [isOpen]);

  const fetchConversations = async () => {
    setIsLoading(true);
    try {
      const response = await chatApi.getConversations();
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conversation => {
    if (!searchQuery) return true;
    
    // Search by conversation name or participants
    const conversationName = conversation.name?.toLowerCase() || '';
    const participantsNames = conversation.participants
      .map(participant => participant.username.toLowerCase())
      .join(' ');
    
    return conversationName.includes(searchQuery.toLowerCase()) || 
           participantsNames.includes(searchQuery.toLowerCase());
  });

  const handleForward = async () => {
    if (!selectedConversation) return;
    
    setForwardingStatus('loading');
    try {
      await chatApi.forwardMessage(message.id, selectedConversation.id);
      setForwardingStatus('success');
      
      // Wait a moment to show success state before closing
      setTimeout(() => {
        onForward(selectedConversation);
        onClose();
        setForwardingStatus('idle');
        setSelectedConversation(null);
      }, 1000);
    } catch (error) {
      console.error('Failed to forward message:', error);
      setForwardingStatus('error');
    }
  };

  // Animation variants
  const modalVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  };

  // Get conversation display name
  const getConversationDisplayName = (conversation) => {
    if (conversation.name) return conversation.name;
    
    return conversation.participants
      .map(participant => participant.username)
      .join(', ');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            className={`fixed inset-0 flex items-center justify-center z-50 p-4`}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div 
              className={`w-full max-w-md rounded-lg shadow-lg ${
                darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
              }`}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium">Forward Message</h3>
                <button 
                  onClick={onClose}
                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <FiX size={20} />
                </button>
              </div>
              
              {/* Message preview */}
              <div className={`p-4 border-b border-gray-200 dark:border-gray-700 ${
                darkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <div className="flex items-start">
                  <UserAvatar user={message.sender} size="sm" />
                  <div className="ml-2 flex-1">
                    <p className="font-medium">{message.sender.username}</p>
                    <p className="text-sm truncate">{message.content}</p>
                  </div>
                </div>
              </div>
              
              {/* Search */}
              <div className="p-4">
                <div className={`flex items-center px-3 py-2 rounded-lg ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  <FiSearch className="text-gray-500 dark:text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    className={`ml-2 flex-1 bg-transparent border-none focus:ring-0 ${
                      darkMode ? 'text-white placeholder-gray-400' : 'text-gray-800 placeholder-gray-500'
                    }`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Conversations list */}
              <div className="max-h-60 overflow-y-auto p-2">
                {isLoading ? (
                  <div className="flex justify-center items-center p-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <p className="text-center py-4 text-gray-500 dark:text-gray-400">
                    No conversations found
                  </p>
                ) : (
                  filteredConversations.map(conversation => (
                    <div
                      key={conversation.id}
                      className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedConversation?.id === conversation.id
                          ? darkMode ? 'bg-primary-600' : 'bg-primary-100'
                          : darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`}
                      onClick={() => setSelectedConversation(conversation)}
                    >
                      {conversation.is_group ? (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          darkMode ? 'bg-gray-600' : 'bg-gray-300'
                        }`}>
                          <span className="text-lg">#</span>
                        </div>
                      ) : (
                        <UserAvatar 
                          user={conversation.participants.find(p => p.id !== message.sender.id)} 
                          size="md" 
                        />
                      )}
                      <div className="ml-3 flex-1">
                        <p className="font-medium">{getConversationDisplayName(conversation)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {conversation.participants.length} participants
                        </p>
                      </div>
                      {selectedConversation?.id === conversation.id && (
                        <div className={`w-5 h-5 rounded-full ${
                          darkMode ? 'bg-white' : 'bg-primary-500'
                        } flex items-center justify-center`}>
                          <div className={`w-3 h-3 rounded-full ${
                            darkMode ? 'bg-primary-500' : 'bg-white'
                          }`}></div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              
              {/* Footer */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <button
                  className="px-4 py-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 mr-2"
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  className={`px-4 py-2 rounded-lg flex items-center ${
                    selectedConversation
                      ? 'bg-primary-500 hover:bg-primary-600 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
                  onClick={handleForward}
                  disabled={!selectedConversation || forwardingStatus === 'loading'}
                >
                  {forwardingStatus === 'loading' ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  ) : (
                    <FiShare className="mr-2" />
                  )}
                  {forwardingStatus === 'success' ? 'Forwarded!' : 'Forward'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

ForwardMessageModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  message: PropTypes.object,
  onForward: PropTypes.func.isRequired
};

export default ForwardMessageModal; 