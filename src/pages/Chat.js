import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FiSend, FiPaperclip, FiMic, FiSmile, FiChevronLeft, 
  FiMoreVertical, FiSearch, FiX, FiPlus, FiCornerUpRight,
  FiStopCircle, FiImage, FiFile, FiVideo
} from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import MessageBubble from '../components/MessageBubble';
import ConversationItem from '../components/ConversationItem';
import UserAvatar from '../components/UserAvatar';
import LoadingScreen from '../components/LoadingScreen';
import MessageSearch from '../components/MessageSearch';
import { chatApi } from '../services/api';

// API service functions
const fetchConversations = async () => {
  try {
    const response = await chatApi.getConversations();
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch conversations');
  }
};

const fetchMessages = async (conversationId) => {
  if (!conversationId) return [];
  try {
    const response = await chatApi.getMessages(conversationId);
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch messages');
  }
};

const sendMessage = async ({ conversationId, content, attachment, replyTo }) => {
  try {
    let response;
    
    if (attachment) {
      response = await chatApi.sendMessageWithAttachment(
        conversationId,
        content,
        attachment,
        replyTo
      );
    } else {
      response = await chatApi.sendMessage(
        conversationId,
        content,
        replyTo
      );
    }
    
    return response.data;
  } catch (error) {
    throw new Error('Failed to send message');
  }
};

const startConversation = async (userId) => {
  try {
    const response = await chatApi.createConversation({
      participants: [userId],
      is_group: false
    });
    return response.data;
  } catch (error) {
    throw new Error('Failed to start conversation');
  }
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
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  
  // Refs
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  
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
      
      // Reset upload progress
      setUploadProgress(0);
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
        setTypingUsers(prev => ({
          ...prev,
          [data.user_id]: {
            username: data.username,
            isTyping: true
          }
        }));
        
        // Clear typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers(prev => ({
            ...prev,
            [data.user_id]: {
              ...prev[data.user_id],
              isTyping: false
            }
          }));
        }, 3000);
      }
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };
    
    return () => {
      ws.close();
    };
  }, [conversationId, queryClient]);
  
  // Get current conversation
  const currentConversation = conversations.find(
    c => c.id.toString() === conversationId
  );
  
  // Filter conversations based on search query
  const filteredConversations = searchQuery.trim()
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
      const file = e.target.files[0];
      setAttachment(file);
      
      // Show a preview or file info
      showToast({
        message: `File selected: ${file.name}`,
        type: 'info'
      });
    }
  };
  
  const handleAttachmentClick = () => {
    setShowAttachmentMenu(!showAttachmentMenu);
  };
  
  const handleFileTypeSelect = (type) => {
    // Set accept attribute based on file type
    if (fileInputRef.current) {
      switch (type) {
        case 'image':
          fileInputRef.current.accept = 'image/*';
          break;
        case 'document':
          fileInputRef.current.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';
          break;
        case 'video':
          fileInputRef.current.accept = 'video/*';
          break;
        default:
          fileInputRef.current.accept = '*/*';
      }
      fileInputRef.current.click();
    }
    setShowAttachmentMenu(false);
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
  
  // Voice recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.addEventListener('dataavailable', (event) => {
        audioChunksRef.current.push(event.data);
      });
      
      mediaRecorderRef.current.addEventListener('stop', () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        
        // Send voice note
        sendMessageMutation.mutate({
          conversationId,
          content: 'Voice message',
          attachment: audioBlob,
          replyTo: replyingTo?.id
        });
        
        setReplyingTo(null);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      });
      
      // Start recording
      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Start timer
      let seconds = 0;
      recordingTimerRef.current = setInterval(() => {
        seconds++;
        setRecordingTime(seconds);
      }, 1000);
      
    } catch (error) {
      showToast({
        message: `Microphone access denied: ${error.message}`,
        type: 'error'
      });
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Clear timer
      clearInterval(recordingTimerRef.current);
      setRecordingTime(0);
    }
  };
  
  // Format recording time
  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle message search selection
  const handleMessageSelect = (message) => {
    // Scroll to the selected message
    const messageElement = document.getElementById(`message-${message.id}`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the message temporarily
      messageElement.classList.add('bg-yellow-100', 'dark:bg-yellow-800');
      setTimeout(() => {
        messageElement.classList.remove('bg-yellow-100', 'dark:bg-yellow-800');
      }, 2000);
    }
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
            
            <button 
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 mr-2"
              onClick={() => setShowMessageSearch(true)}
              title="Search messages"
            >
              <FiSearch />
            </button>
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
          
          {/* Upload progress bar */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mb-2">
              <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {/* Voice recording UI */}
          {isRecording ? (
            <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg mb-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-3"></div>
              <span className="text-red-500 flex-1">Recording... {formatRecordingTime(recordingTime)}</span>
              <button
                onClick={stopRecording}
                className="p-2 bg-red-500 text-white rounded-full"
              >
                <FiStopCircle />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendMessage} className="flex items-center">
              <div className="relative">
                <button
                  type="button"
                  onClick={handleAttachmentClick}
                  className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 mr-2"
                >
                  <FiPaperclip />
                </button>
                
                {/* Attachment menu */}
                {showAttachmentMenu && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 w-48">
                    <button
                      type="button"
                      onClick={() => handleFileTypeSelect('image')}
                      className="flex items-center w-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                      <FiImage className="mr-2" /> Photos & Videos
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFileTypeSelect('document')}
                      className="flex items-center w-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                      <FiFile className="mr-2" /> Documents
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFileTypeSelect('video')}
                      className="flex items-center w-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                      <FiVideo className="mr-2" /> Camera
                    </button>
                  </div>
                )}
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              
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
              
              {messageInput.trim() || attachment ? (
                <button
                  type="submit"
                  className="p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <FiSend />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <FiMic />
                </button>
              )}
            </form>
          )}
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
      
      {/* Message Search Component */}
      <MessageSearch 
        isOpen={showMessageSearch}
        onClose={() => setShowMessageSearch(false)}
        conversationId={conversationId}
        onMessageSelect={handleMessageSelect}
      />
    </div>
  );
};

export default Chat; 