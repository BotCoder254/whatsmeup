import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FiSend, FiPaperclip, FiMic, FiSmile, FiChevronLeft, 
  FiMoreVertical, FiSearch, FiX, FiPlus, FiCornerUpRight
} from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import MessageBubble from '../components/MessageBubble';
import ConversationItem from '../components/ConversationItem';
import UserAvatar from '../components/UserAvatar';
import LoadingScreen from '../components/LoadingScreen';

// API service functions
const fetchConversations = async () => {
  // In a real app, this would be an API call
  const response = await fetch('/api/conversations');
  if (!response.ok) throw new Error('Failed to fetch conversations');
  return response.json();
};

const fetchMessages = async (conversationId) => {
  if (!conversationId) return [];
  // In a real app, this would be an API call
  const response = await fetch(`/api/conversations/${conversationId}/messages`);
  if (!response.ok) throw new Error('Failed to fetch messages');
  return response.json();
};

const sendMessage = async ({ conversationId, content, attachment, replyTo }) => {
  // In a real app, this would be an API call
  const formData = new FormData();
  formData.append('conversation_id', conversationId);
  formData.append('content', content);
  
  if (replyTo) {
    formData.append('reply_to', replyTo);
  }
  
  if (attachment) {
    formData.append('attachment', attachment);
  }
  
  const response = await fetch('/api/messages', {
    method: 'POST',
    body: formData
  });
  
  if (!response.ok) throw new Error('Failed to send message');
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

const Chat = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  // State
  const [messageInput, setMessageInput] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileConversations, setShowMobileConversations] = useState(!conversationId);
  const [replyingTo, setReplyingTo] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  
  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);
  
  // Queries
  const { 
    data: conversations = [], 
    isLoading: isLoadingConversations,
    error: conversationsError
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: fetchConversations,
    staleTime: 10000 // 10 seconds
  });
  
  const { 
    data: messages = [], 
    isLoading: isLoadingMessages,
    error: messagesError
  } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => fetchMessages(conversationId),
    enabled: !!conversationId,
    staleTime: 5000 // 5 seconds
  });
  
  // Mutations
  const sendMessageMutation = useMutation({
    mutationFn: sendMessage,
    onSuccess: (data) => {
      // Optimistically update the messages cache
      queryClient.setQueryData(['messages', conversationId], (oldData) => {
        return [...(oldData || []), data];
      });
      
      // Update the conversations list to show the latest message
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error) => {
      showToast({
        message: `Failed to send message: ${error.message}`,
        type: 'error'
      });
    }
  });
  
  const startConversationMutation = useMutation({
    mutationFn: startConversation,
    onSuccess: (data) => {
      navigate(`/chat/${data.id}`);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error) => {
      showToast({
        message: `Failed to start conversation: ${error.message}`,
        type: 'error'
      });
    }
  });
  
  // Effects
  useEffect(() => {
    // Scroll to bottom when messages change
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  useEffect(() => {
    // Set mobile view based on conversation ID
    setShowMobileConversations(!conversationId);
  }, [conversationId]);
  
  useEffect(() => {
    // Focus input when replying
    if (replyingTo && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [replyingTo]);
  
  // WebSocket setup for real-time messaging
  useEffect(() => {
    if (!conversationId) return;
    
    // In a real app, this would be a WebSocket connection
    const ws = new WebSocket(`ws://localhost:8000/ws/chat/${conversationId}/`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'message') {
        // Add new message to the list
        queryClient.setQueryData(['messages', conversationId], (oldData) => {
          // Avoid duplicates
          if (oldData && oldData.some(m => m.id === data.message_id)) {
            return oldData;
          }
          return [...(oldData || []), {
            id: data.message_id,
            content: data.message,
            sender: { id: data.sender_id },
            timestamp: data.timestamp,
            attachment: data.attachment,
            reply_to: data.reply_to
          }];
        });
        
        // Update conversations list
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      } else if (data.type === 'typing') {
        // Update typing status
        setTypingUsers(prev => ({
          ...prev,
          [data.user_id]: {
            isTyping: data.is_typing,
            timestamp: new Date().getTime()
          }
        }));
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };
    
    // Clean up on unmount
    return () => {
      ws.close();
    };
  }, [conversationId, queryClient]);
  
  // Clear typing status after delay
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      setTypingUsers(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(userId => {
          if (now - updated[userId].timestamp > 3000 && updated[userId].isTyping) {
            updated[userId].isTyping = false;
          }
        });
        return updated;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Find current conversation
  const currentConversation = conversations.find(c => c.id.toString() === conversationId);
  
  // Filter conversations by search query
  const filteredConversations = searchQuery
    ? conversations.filter(c => {
        const participants = c.participants || [];
        return participants.some(p => 
          p.username.toLowerCase().includes(searchQuery.toLowerCase())
        ) || (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase()));
      })
    : conversations;
  
  // Group messages by date and sender
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.timestamp).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});
  
  // Handlers
  const handleSendMessage = (e) => {
    e.preventDefault();
    
    if (!messageInput.trim() && !attachment) return;
    
    sendMessageMutation.mutate({
      conversationId,
      content: messageInput.trim(),
      attachment,
      replyTo: replyingTo?.id
    });
    
    setMessageInput('');
    setAttachment(null);
    setReplyingTo(null);
  };
  
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setAttachment(e.target.files[0]);
    }
  };
  
  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleCancelAttachment = () => {
    setAttachment(null);
  };
  
  const handleReply = (message) => {
    setReplyingTo(message);
    messageInputRef.current?.focus();
  };
  
  const handleCancelReply = () => {
    setReplyingTo(null);
  };
  
  const handleInputChange = (e) => {
    setMessageInput(e.target.value);
    
    // Send typing status
    if (!isTyping) {
      setIsTyping(true);
      // In a real app, send typing status via WebSocket
      setTimeout(() => setIsTyping(false), 3000);
    }
  };
  
  const handleStartConversation = (userId) => {
    startConversationMutation.mutate(userId);
  };
  
  // Render functions
  const renderConversationsList = () => (
    <motion.div 
      className="flex flex-col h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      <div className="p-4 border-b dark:border-gray-700">
        <h1 className="text-2xl font-bold mb-4">Messages</h1>
        <div className="relative">
          <input
            type="text"
            placeholder="Search conversations..."
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
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {isLoadingConversations ? (
          <div className="flex justify-center items-center h-full">
            <LoadingScreen />
          </div>
        ) : conversationsError ? (
          <div className="p-4 text-center text-red-500">
            Error loading conversations
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            {searchQuery ? 'No conversations found' : 'No conversations yet'}
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={conversation.id.toString() === conversationId}
              onClick={() => {
                navigate(`/chat/${conversation.id}`);
                setShowMobileConversations(false);
              }}
            />
          ))
        )}
      </div>
      
      <div className="p-4 border-t dark:border-gray-700">
        <button
          onClick={() => navigate('/contacts')}
          className="w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center"
        >
          <FiPlus className="mr-2" /> New Conversation
        </button>
      </div>
    </motion.div>
  );
  
  const renderChatArea = () => (
    <motion.div 
      className="flex flex-col h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
    >
      {/* Chat header */}
      <div className="p-4 border-b dark:border-gray-700 flex items-center">
        <button
          onClick={() => setShowMobileConversations(true)}
          className="md:hidden mr-2 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <FiChevronLeft />
        </button>
        
        {currentConversation ? (
          <>
            <div className="flex items-center flex-1">
              {currentConversation.is_group ? (
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                  {currentConversation.name?.charAt(0) || 'G'}
                </div>
              ) : (
                <UserAvatar 
                  user={currentConversation.participants?.find(p => p.id !== user?.id) || {}} 
                  size="md"
                />
              )}
              
              <div className="ml-3">
                <h2 className="font-semibold">
                  {currentConversation.is_group 
                    ? currentConversation.name 
                    : currentConversation.participants?.find(p => p.id !== user?.id)?.username || 'Chat'}
                </h2>
                
                {/* Show typing indicator or online status */}
                {Object.keys(typingUsers).some(id => typingUsers[id].isTyping) ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">Typing...</p>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {currentConversation.is_group 
                      ? `${currentConversation.participants?.length || 0} members` 
                      : currentConversation.participants?.find(p => p.id !== user?.id)?.is_online 
                        ? 'Online' 
                        : 'Offline'}
                  </p>
                )}
              </div>
            </div>
            
            <button className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
              <FiMoreVertical />
            </button>
          </>
        ) : (
          <h2 className="font-semibold">Select a conversation</h2>
        )}
      </div>
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        {!conversationId ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <p className="mb-4">Select a conversation to start chatting</p>
            <button
              onClick={() => navigate('/contacts')}
              className="py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center"
            >
              <FiPlus className="mr-2" /> New Conversation
            </button>
          </div>
        ) : isLoadingMessages ? (
          <div className="flex justify-center items-center h-full">
            <LoadingScreen />
          </div>
        ) : messagesError ? (
          <div className="p-4 text-center text-red-500">
            Error loading messages
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date} className="mb-6">
              <div className="flex justify-center mb-4">
                <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-xs">
                  {date === new Date().toLocaleDateString() ? 'Today' : date}
                </span>
              </div>
              
              {dateMessages.map((message, index) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={message.sender.id === user?.id}
                  onReply={handleReply}
                  showAvatar={
                    index === 0 || 
                    dateMessages[index - 1].sender.id !== message.sender.id
                  }
                  isLastInGroup={
                    index === dateMessages.length - 1 || 
                    dateMessages[index + 1].sender.id !== message.sender.id
                  }
                />
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message input area */}
      {conversationId && (
        <div className="p-4 border-t dark:border-gray-700">
          {/* Reply preview */}
          {replyingTo && (
            <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center">
              <FiCornerUpRight className="mr-2 text-gray-500" />
              <div className="flex-1">
                <p className="text-xs font-medium">
                  Replying to {replyingTo.sender.username}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {replyingTo.content}
                </p>
              </div>
              <button 
                onClick={handleCancelReply}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"
              >
                <FiX size={16} />
              </button>
            </div>
          )}
          
          {/* Attachment preview */}
          {attachment && (
            <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center">
              <div className="flex-1 truncate">
                <p className="text-xs font-medium">Attachment</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {attachment.name}
                </p>
              </div>
              <button 
                onClick={handleCancelAttachment}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full"
              >
                <FiX size={16} />
              </button>
            </div>
          )}
          
          <form onSubmit={handleSendMessage} className="flex items-center">
            <button
              type="button"
              onClick={handleAttachmentClick}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 mr-2"
            >
              <FiPaperclip />
            </button>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            
            <input
              type="text"
              placeholder="Type a message..."
              className="flex-1 p-3 rounded-lg bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={messageInput}
              onChange={handleInputChange}
              ref={messageInputRef}
            />
            
            <button
              type="button"
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 mx-2"
            >
              <FiSmile />
            </button>
            
            <button
              type="submit"
              disabled={!messageInput.trim() && !attachment}
              className={`p-2 rounded-full ${
                !messageInput.trim() && !attachment
                  ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              <FiSend />
            </button>
          </form>
        </div>
      )}
    </motion.div>
  );
  
  return (
    <div className="h-full flex">
      {/* Mobile view */}
      <AnimatePresence mode="wait" initial={false}>
        {showMobileConversations ? (
          <motion.div 
            key="conversations"
            className="w-full md:w-1/3 md:border-r dark:border-gray-700 h-full md:block"
          >
            {renderConversationsList()}
          </motion.div>
        ) : (
          <motion.div 
            key="chat"
            className="w-full md:w-2/3 h-full md:block"
          >
            {renderChatArea()}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Desktop view */}
      <div className="hidden md:block w-1/3 border-r dark:border-gray-700 h-full">
        {renderConversationsList()}
      </div>
      <div className="hidden md:block w-2/3 h-full">
        {renderChatArea()}
      </div>
    </div>
  );
};

export default Chat; 