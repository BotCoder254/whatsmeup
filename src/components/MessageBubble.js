import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  FiDownload, FiCornerUpRight, FiMoreVertical, FiSmile, 
  FiCheck, FiCheckCircle, FiFile, FiFileText, FiMusic, FiPlay, FiPause 
} from 'react-icons/fi';
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
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  
  // Format timestamp
  const formattedTime = message.timestamp ? 
    format(new Date(message.timestamp), 'h:mm a') : 
    format(new Date(), 'h:mm a');
  
  // Handle file type and display
  const hasAttachment = message.attachment_url || message.attachment;
  const attachmentUrl = message.attachment_url || message.attachment;
  
  // Determine file type
  const getFileType = () => {
    if (!hasAttachment) return null;
    
    const url = attachmentUrl.toLowerCase();
    
    if (url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/)) return 'image';
    if (url.match(/\.(mp3|wav|ogg|m4a)$/)) return 'audio';
    if (url.match(/\.(mp4|webm|mov|avi|mkv)$/)) return 'video';
    if (url.match(/\.(pdf)$/)) return 'pdf';
    if (url.match(/\.(doc|docx)$/)) return 'word';
    if (url.match(/\.(xls|xlsx)$/)) return 'excel';
    if (url.match(/\.(ppt|pptx)$/)) return 'powerpoint';
    
    return 'file';
  };
  
  const fileType = getFileType();
  
  // Get file icon based on type
  const getFileIcon = () => {
    switch (fileType) {
      case 'pdf':
        return <FiFileText className="text-red-500" size={24} />;
      case 'word':
        return <FiFileText className="text-blue-500" size={24} />;
      case 'excel':
        return <FiFileText className="text-green-500" size={24} />;
      case 'powerpoint':
        return <FiFileText className="text-orange-500" size={24} />;
      case 'audio':
        return <FiMusic className="text-purple-500" size={24} />;
      case 'video':
        return <FiFileText className="text-pink-500" size={24} />;
      default:
        return <FiFile className="text-gray-500" size={24} />;
    }
  };
  
  // Get file name from URL
  const getFileName = () => {
    if (!attachmentUrl) return '';
    return attachmentUrl.split('/').pop();
  };
  
  // Handle audio playback
  const toggleAudio = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    
    setIsPlaying(!isPlaying);
  };
  
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
              ? `${darkMode ? 'bg-primary-600' : 'bg-primary-500'} text-white ${isOwn ? 'rounded-tr-none' : ''}`
              : darkMode
                ? 'bg-gray-700 text-white rounded-tl-none'
                : 'bg-gray-100 text-gray-800 rounded-tl-none'
          }`}
          variants={bubbleVariants}
          initial="initial"
          animate="animate"
          whileHover="hover"
          onMouseEnter={() => setShowOptions(true)}
          onMouseLeave={() => setShowOptions(false)}
        >
          {/* Message content */}
          {message.content && (
            <div className="mb-1 whitespace-pre-wrap">{message.content}</div>
          )}
          
          {/* Attachment display */}
          {hasAttachment && (
            <div className="mt-2">
              {fileType === 'image' ? (
                <img 
                  src={attachmentUrl} 
                  alt="Attachment" 
                  className="rounded-lg max-h-60 max-w-full object-contain cursor-pointer"
                  onClick={() => window.open(attachmentUrl, '_blank')}
                />
              ) : fileType === 'audio' ? (
                <div className={`flex flex-col p-2 rounded-lg ${
                  isOwn
                    ? darkMode ? 'bg-primary-700' : 'bg-primary-600'
                    : darkMode ? 'bg-gray-800' : 'bg-gray-200'
                }`}>
                  <div className="flex items-center">
                    <button
                      onClick={toggleAudio}
                      className={`p-2 rounded-full ${
                        isOwn
                          ? 'bg-primary-700 hover:bg-primary-800'
                          : darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                    >
                      {isPlaying ? <FiPause size={16} /> : <FiPlay size={16} />}
                    </button>
                    
                    <div className="ml-2 flex-1">
                      <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: '0%' }}></div>
                      </div>
                    </div>
                    
                    <a 
                      href={attachmentUrl} 
                      download 
                      className="ml-2 p-1 rounded hover:bg-opacity-20 hover:bg-black"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FiDownload size={16} />
                    </a>
                  </div>
                  <audio ref={audioRef} src={attachmentUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
                </div>
              ) : (
                <div className={`flex items-center p-2 rounded-lg ${
                  isOwn
                    ? darkMode ? 'bg-primary-700' : 'bg-primary-600'
                    : darkMode ? 'bg-gray-800' : 'bg-gray-200'
                }`}>
                  {getFileIcon()}
                  <span className="ml-2 text-sm truncate flex-1">
                    {getFileName()}
                  </span>
                  <a 
                    href={attachmentUrl} 
                    download 
                    className="ml-2 p-1 rounded hover:bg-opacity-20 hover:bg-black"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FiDownload size={16} />
                  </a>
                </div>
              )}
            </div>
          )}
          
          {/* Message metadata */}
          <div className={`text-xs mt-1 flex justify-end items-center ${
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
      
      {isOwn && showAvatar && (
        <div className="ml-2 flex-shrink-0">
          <UserAvatar 
            user={message.sender} 
            size="sm" 
            showStatus={false} 
          />
        </div>
      )}
    </div>
  );
};

MessageBubble.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    content: PropTypes.string,
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