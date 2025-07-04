import React from 'react';
import { motion } from 'framer-motion';
import { format, isToday, isYesterday } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

const ConversationItem = ({ conversation, isActive, onClick }) => {
  const { currentUser } = useAuth();
  
  // Get the other participant(s) in the conversation
  const otherParticipants = conversation.participants.filter(
    (participant) => participant.id !== currentUser?.id
  );
  
  // Format the conversation name
  const getConversationName = () => {
    if (conversation.is_group) {
      return conversation.name || `Group (${conversation.participants.length})`;
    }
    return otherParticipants.length > 0 ? otherParticipants[0].username : 'Unknown User';
  };
  
  // Get the avatar for the conversation
  const getConversationAvatar = () => {
    if (conversation.is_group) {
      return 'https://via.placeholder.com/40?text=G';
    }
    return otherParticipants.length > 0 ? 
      (otherParticipants[0].profile_picture || 'https://via.placeholder.com/40') : 
      'https://via.placeholder.com/40';
  };
  
  // Format the timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, 'h:mm a');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MM/dd/yyyy');
    }
  };
  
  // Get the last message preview
  const getLastMessagePreview = () => {
    const lastMessage = conversation.last_message;
    if (!lastMessage) return 'No messages yet';
    
    const isSender = lastMessage.sender.id === currentUser?.id;
    const prefix = isSender ? 'You: ' : '';
    
    if (lastMessage.attachments && lastMessage.attachments.length > 0) {
      const attachment = lastMessage.attachments[0];
      if (attachment.file_type.startsWith('image/')) {
        return `${prefix}📷 Image`;
      }
      return `${prefix}📎 ${attachment.file_name}`;
    }
    
    return `${prefix}${lastMessage.content}`;
  };
  
  // Check if the conversation has unread messages
  const hasUnread = conversation.unread_count > 0;
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-3 rounded-lg cursor-pointer transition-colors duration-200 ${
        isActive
          ? 'bg-primary-50 dark:bg-primary-900/30'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      <div className="flex items-center space-x-3">
        <div className="relative">
          <img 
            src={getConversationAvatar()} 
            alt={getConversationName()} 
            className="w-12 h-12 rounded-full object-cover"
          />
          {otherParticipants.length > 0 && otherParticipants[0].is_online && (
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500"></span>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline">
            <h3 className={`text-sm font-medium truncate ${hasUnread ? 'font-bold' : ''}`}>
              {getConversationName()}
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
              {formatTimestamp(conversation.last_message?.timestamp)}
            </span>
          </div>
          
          <div className="flex justify-between items-center mt-1">
            <p className={`text-xs truncate ${
              hasUnread ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-500 dark:text-gray-400'
            }`}>
              {getLastMessagePreview()}
            </p>
            
            {hasUnread && (
              <span className="ml-2 flex-shrink-0 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {conversation.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ConversationItem; 