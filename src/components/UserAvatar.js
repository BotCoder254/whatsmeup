import React from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

const UserAvatar = ({ 
  user, 
  size = 'md', 
  showStatus = true, 
  className = '',
  onClick = null
}) => {
  // Default image if user profile picture is not available
  const defaultImage = 'https://via.placeholder.com/100?text=User';
  
  // Handle image loading error
  const handleImageError = (e) => {
    e.target.src = defaultImage;
  };
  
  // Size mapping (in pixels)
  const sizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    '2xl': 'w-20 h-20'
  };
  
  // Status indicator size mapping
  const statusSizeMap = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
    xl: 'w-4 h-4',
    '2xl': 'w-5 h-5'
  };
  
  // Get user's online status
  const isOnline = user?.is_online || false;
  
  // Get user's display name
  const displayName = user?.username || user?.email || 'User';
  
  // Get initials from display name
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const avatarComponent = (
    <div className={`relative ${className}`}>
      {/* User image or fallback */}
      {user?.profile_picture ? (
        <img 
          src={user.profile_picture} 
          alt={displayName}
          onError={handleImageError}
          className={`${sizeMap[size]} rounded-full object-cover border-2 border-white dark:border-gray-800`}
        />
      ) : (
        <div className={`${sizeMap[size]} rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-300 font-medium border-2 border-white dark:border-gray-800`}>
          {getInitials(displayName)}
        </div>
      )}
      
      {/* Online status indicator */}
      {showStatus && (
        <span 
          className={`absolute bottom-0 right-0 ${statusSizeMap[size]} rounded-full ${
            isOnline ? 'bg-green-500' : 'bg-gray-400'
          } border-2 border-white dark:border-gray-800`}
        ></span>
      )}
    </div>
  );
  
  // If onClick is provided, wrap in motion.button for animation
  if (onClick) {
    return (
      <motion.button
        onClick={onClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="focus:outline-none"
      >
        {avatarComponent}
      </motion.button>
    );
  }
  
  // Otherwise, return the plain avatar
  return avatarComponent;
};

UserAvatar.propTypes = {
  user: PropTypes.shape({
    username: PropTypes.string,
    email: PropTypes.string,
    profile_picture: PropTypes.string,
    is_online: PropTypes.bool
  }),
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl', '2xl']),
  showStatus: PropTypes.bool,
  className: PropTypes.string,
  onClick: PropTypes.func
};

export default UserAvatar; 