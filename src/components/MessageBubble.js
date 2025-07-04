import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { FiDownload, FiCornerUpRight, FiMoreVertical, FiSmile, FiCheck, FiCheckCircle } from 'react-icons/fi';
import PropTypes from 'prop-types';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import UserAvatar from './UserAvatar';

const MessageBubble = ({ 
  message, 
  isOwn, 
  onReply, 
  onReaction,
  showAvatar = true,
  isLastInGroup = false
}) => {
  const { user } = useAuth();
  const { darkMode } = useTheme();
  const [showOptions, setShowOptions] = useState(false);
  
  // Format timestamp
  const formattedTime = message.timestamp ? 
    format(new Date(message.timestamp), 'h:mm a') : 
    format(new Date(), 'h:mm a');
  
  // Handle file type and display
  const hasAttachment = message.attachment_url || message.attachment;
  const attachmentUrl = message.attachment_url || message.attachment;
  const isImage = hasAttachment && 
    (attachmentUrl.endsWith('.jpg') || 
     attachmentUrl.endsWith('.jpeg') || 
     attachmentUrl.endsWith('.png') || 
     attachmentUrl.endsWith('.gif'));
  
  // Animation variants
  const bubbleVariants = {
    initial: { 
      opacity: 0, 
      x: isOwn ? 20 : -20 
    },
    animate: { 
      opacity: 1, 
      x: 0,
      transition: { 
        type: 'spring', 
        stiffness: 500, 
        damping: 30 
      }
    },
    hover: {
      scale: 1.01,
    }
  };
  
  const optionsVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 }
  };
  
  // Handle option menu toggle
  const toggleOptions = (e) => {
    e.stopPropagation();
    setShowOptions(prev => !prev);
  };
  
  // Handle reply action
  const handleReply = () => {
    if (onReply) {
      onReply(message);
      setShowOptions(false);
    }
  };
  
  // Handle reaction
  const handleReaction = (emoji) => {
    if (onReaction) {
      onReaction(message.id, emoji);
      setShowOptions(false);
    }
  };
  
  return (
    <div className={`flex w-full mb-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {!isOwn && showAvatar && (
        <div className="mr-2 flex-shrink-0">
          <UserAvatar 
            user={message.sender} 
            size="sm" 
            showStatus={false} 
          />
        </div>
      )}
      
      <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Reply reference if this message is a reply */}
        {message.reply_to_message && (
          <motion.div 
            className={`text-xs mb-1 flex items-center rounded-lg px-3 py-1.5 ${
              darkMode 
                ? 'bg-gray-700 text-gray-300' 
                : 'bg-gray-200 text-gray-600'
            }`}
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <FiCornerUpRight className="mr-1 text-gray-500" />
            <span className="font-medium mr-1">{message.reply_to_message.sender_name}:</span>
            <span className="truncate">{message.reply_to_message.content}</span>
          </motion.div>
        )}
        
        <motion.div
          className={`relative rounded-2xl px-4 py-2 ${
            isOwn
              ? `${darkMode ? 'bg-blue-600' : 'bg-blue-500'} text-white`
              : darkMode
                ? 'bg-gray-700 text-white'
                : 'bg-gray-100 text-gray-800'
          }`}
          variants={bubbleVariants}
          initial="initial"
          animate="animate"
          whileHover="hover"
          onMouseEnter={() => setShowOptions(true)}
          onMouseLeave={() => setShowOptions(false)}
        >
          {/* Message content */}
          <div className="mb-1 whitespace-pre-wrap">{message.content}</div>
          
          {/* Attachment display */}
          {hasAttachment && (
            <div className="mt-2">
              {isImage ? (
                <img 
                  src={attachmentUrl} 
                  alt="Attachment" 
                  className="rounded-lg max-h-60 max-w-full object-contain"
                />
              ) : (
                <div className={`flex items-center p-2 rounded-lg ${
                  darkMode ? 'bg-gray-800' : 'bg-gray-200'
                }`}>
                  <FiDownload className="mr-2" />
                  <span className="text-sm truncate flex-1">
                    {attachmentUrl.split('/').pop()}
                  </span>
                  <a 
                    href={attachmentUrl} 
                    download 
                    className="ml-2 p-1 rounded hover:bg-opacity-20 hover:bg-black"
                  >
                    <FiDownload size={16} />
                  </a>
                </div>
              )}
            </div>
          )}
          
          {/* Message metadata */}
          <div className={`flex items-center text-xs mt-1 ${
            isOwn ? 'text-blue-100' : darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            <span>{formattedTime}</span>
            {isOwn && (
              <span className="ml-1 flex items-center">
                {message.is_read ? (
                  <FiCheckCircle className="ml-1" />
                ) : (
                  <FiCheck className="ml-1" />
                )}
              </span>
            )}
          </div>
          
          {/* Message options */}
          {showOptions && (
            <motion.div 
              className={`absolute ${isOwn ? 'left-0 -translate-x-full -ml-2' : 'right-0 translate-x-full mr-2'} top-0 flex items-center`}
              variants={optionsVariants}
              initial="hidden"
              animate="visible"
            >
              <button 
                onClick={handleReply}
                className={`p-2 rounded-full ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                <FiCornerUpRight size={16} />
              </button>
              <button 
                onClick={() => handleReaction('👍')}
                className={`p-2 rounded-full ml-1 ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                <FiSmile size={16} />
              </button>
              <button 
                onClick={toggleOptions}
                className={`p-2 rounded-full ml-1 ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                <FiMoreVertical size={16} />
              </button>
            </motion.div>
          )}
        </motion.div>
        
        {/* Display reactions if any */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex mt-1 space-x-1">
            {message.reactions.map((reaction, index) => (
              <motion.div
                key={index}
                className={`rounded-full px-2 py-0.5 text-xs ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                {reaction.emoji} {reaction.count}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

MessageBubble.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    content: PropTypes.string.isRequired,
    timestamp: PropTypes.string,
    sender: PropTypes.object,
    is_read: PropTypes.bool,
    attachment: PropTypes.string,
    attachment_url: PropTypes.string,
    reply_to_message: PropTypes.object,
    reactions: PropTypes.arrayOf(PropTypes.shape({
      emoji: PropTypes.string,
      count: PropTypes.number,
      users: PropTypes.arrayOf(PropTypes.string)
    }))
  }).isRequired,
  isOwn: PropTypes.bool,
  onReply: PropTypes.func,
  onReaction: PropTypes.func,
  showAvatar: PropTypes.bool,
  isLastInGroup: PropTypes.bool
};

export default MessageBubble; 