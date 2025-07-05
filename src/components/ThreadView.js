import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCornerDownRight, FiSend, FiPaperclip, FiSmile } from 'react-icons/fi';
import PropTypes from 'prop-types';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { chatApi } from '../services/api';
import MessageBubble from './MessageBubble';
import EmojiPicker from './EmojiPicker';

const ThreadView = ({ 
  isOpen, 
  onClose, 
  parentMessage, 
  conversationId,
  onMessageSent
}) => {
  const { darkMode } = useTheme();
  const { user } = useAuth();
  const [threadMessages, setThreadMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && parentMessage) {
      fetchThreadMessages();
    }
  }, [isOpen, parentMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [threadMessages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const fetchThreadMessages = async () => {
    if (!parentMessage) return;
    
    setIsLoading(true);
    try {
      const response = await chatApi.getThreadMessages(parentMessage.id);
      setThreadMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch thread messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && !attachment) || !parentMessage) return;

    try {
      let response;
      
      if (attachment) {
        response = await chatApi.sendMessageWithAttachment(
          conversationId,
          messageInput,
          attachment,
          null, // replyTo
          parentMessage.id // parentMessageId
        );
      } else {
        response = await chatApi.sendMessage(
          conversationId,
          messageInput,
          null, // replyTo
          parentMessage.id // parentMessageId
        );
      }
      
      setThreadMessages([...threadMessages, response.data]);
      setMessageInput('');
      setAttachment(null);
      
      if (onMessageSent) {
        onMessageSent(response.data);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiSelect = (emoji) => {
    setMessageInput(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Animation variants
  const sidebarVariants = {
    hidden: { x: '100%', opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { type: 'tween', duration: 0.3 } },
    exit: { x: '100%', opacity: 0, transition: { type: 'tween', duration: 0.3 } }
  };

  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 0.5, transition: { duration: 0.3 } },
    exit: { opacity: 0, transition: { duration: 0.3 } }
  };

  return (
    <AnimatePresence>
      {isOpen && parentMessage && (
        <>
          {/* Overlay for mobile */}
          <motion.div
            className="fixed inset-0 bg-black z-30 md:hidden"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
          />
          
          {/* Thread sidebar */}
          <motion.div
            className={`fixed inset-y-0 right-0 w-full md:w-96 z-40 flex flex-col ${
              darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
            } shadow-lg`}
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <FiCornerDownRight className="mr-2 text-gray-500 dark:text-gray-400" />
                <h3 className="text-lg font-medium">Thread</h3>
              </div>
              <button 
                onClick={onClose}
                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <FiX size={20} />
              </button>
            </div>
            
            {/* Parent message */}
            <div className={`p-4 border-b border-gray-200 dark:border-gray-700 ${
              darkMode ? 'bg-gray-700' : 'bg-gray-100'
            }`}>
              <MessageBubble
                message={parentMessage}
                isOwn={parentMessage.sender.id === user?.id}
                showAvatar={true}
                isThreadMessage={false}
              />
            </div>
            
            {/* Thread messages */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                </div>
              ) : threadMessages.length <= 1 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  <FiCornerDownRight size={24} className="mb-2" />
                  <p>No replies yet</p>
                  <p className="text-sm">Start the thread by replying below</p>
                </div>
              ) : (
                threadMessages.map((message, index) => (
                  // Skip the parent message which is already shown above
                  message.id !== parentMessage.id && (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwn={message.sender.id === user?.id}
                      showAvatar={true}
                      isThreadMessage={true}
                    />
                  )
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Message input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              {/* Attachment preview */}
              {attachment && (
                <div className={`mb-2 p-2 rounded-lg flex items-center ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                  <span className="truncate flex-1 text-sm">{attachment.name}</span>
                  <button
                    onClick={handleRemoveAttachment}
                    className="ml-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              )}
              
              <div className={`flex items-end rounded-lg border ${
                darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
              }`}>
                <textarea
                  ref={inputRef}
                  className={`flex-1 p-3 bg-transparent resize-none focus:ring-0 focus:outline-none ${
                    darkMode ? 'text-white placeholder-gray-400' : 'text-gray-800 placeholder-gray-500'
                  }`}
                  placeholder="Reply in thread..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                />
                
                <div className="flex items-center p-2">
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    <FiSmile size={20} className="text-gray-500 dark:text-gray-400" />
                  </button>
                  
                  <label className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer">
                    <FiPaperclip size={20} className="text-gray-500 dark:text-gray-400" />
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                  
                  <button
                    onClick={handleSendMessage}
                    className={`p-2 rounded-full ml-1 ${
                      messageInput.trim() || attachment
                        ? 'bg-primary-500 hover:bg-primary-600 text-white'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    }`}
                    disabled={!messageInput.trim() && !attachment}
                  >
                    <FiSend size={20} />
                  </button>
                </div>
              </div>
              
              {/* Emoji picker */}
              {showEmojiPicker && (
                <div className="absolute bottom-20 right-4">
                  <EmojiPicker onSelect={handleEmojiSelect} />
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

ThreadView.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  parentMessage: PropTypes.object,
  conversationId: PropTypes.string,
  onMessageSent: PropTypes.func
};

export default ThreadView; 