import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import { FiX, FiCheck, FiInfo, FiAlertTriangle, FiAlertCircle } from 'react-icons/fi';

const Toast = ({
  message,
  type = 'info',
  duration = 5000,
  onClose,
  position = 'top-right',
  showIcon = true,
  showCloseButton = true,
  isVisible = true,
}) => {
  const [visible, setVisible] = useState(isVisible);

  // Auto dismiss after duration
  useEffect(() => {
    setVisible(isVisible);
    
    if (isVisible && duration) {
      const timer = setTimeout(() => {
        setVisible(false);
        if (onClose) onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  // Handle close button click
  const handleClose = () => {
    setVisible(false);
    if (onClose) onClose();
  };

  // Toast type configurations
  const toastConfig = {
    success: {
      icon: <FiCheck />,
      bgClass: 'bg-green-100 dark:bg-green-900/30',
      textClass: 'text-green-800 dark:text-green-200',
      borderClass: 'border-l-4 border-green-500',
    },
    info: {
      icon: <FiInfo />,
      bgClass: 'bg-blue-100 dark:bg-blue-900/30',
      textClass: 'text-blue-800 dark:text-blue-200',
      borderClass: 'border-l-4 border-blue-500',
    },
    warning: {
      icon: <FiAlertTriangle />,
      bgClass: 'bg-yellow-100 dark:bg-yellow-900/30',
      textClass: 'text-yellow-800 dark:text-yellow-200',
      borderClass: 'border-l-4 border-yellow-500',
    },
    error: {
      icon: <FiAlertCircle />,
      bgClass: 'bg-red-100 dark:bg-red-900/30',
      textClass: 'text-red-800 dark:text-red-200',
      borderClass: 'border-l-4 border-red-500',
    },
  };

  // Position classes
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
  };

  // Animation variants
  const toastVariants = {
    hidden: { 
      opacity: 0,
      y: position.includes('top') ? -20 : 20,
      x: position.includes('center') ? '-50%' : 0,
      scale: 0.9
    },
    visible: { 
      opacity: 1, 
      y: 0,
      x: position.includes('center') ? '-50%' : 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 400, damping: 25 }
    },
    exit: { 
      opacity: 0, 
      scale: 0.9, 
      transition: { duration: 0.2 }
    }
  };

  // Get config based on type
  const config = toastConfig[type] || toastConfig.info;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className={`fixed ${positionClasses[position]} z-50 max-w-sm w-full shadow-lg rounded-md overflow-hidden`}
          variants={toastVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className={`${config.bgClass} ${config.borderClass} p-4 flex items-start`}>
            {showIcon && (
              <div className={`flex-shrink-0 mr-3 ${config.textClass}`}>
                {config.icon}
              </div>
            )}
            <div className="flex-1 pt-0.5">
              <p className={`text-sm ${config.textClass}`}>{message}</p>
            </div>
            {showCloseButton && (
              <div className="ml-3 flex-shrink-0 flex">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleClose}
                  className={`inline-flex rounded-md p-1 ${config.textClass} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                >
                  <span className="sr-only">Close</span>
                  <FiX className="h-4 w-4" />
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

Toast.propTypes = {
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['success', 'info', 'warning', 'error']),
  duration: PropTypes.number,
  onClose: PropTypes.func,
  position: PropTypes.oneOf([
    'top-right',
    'top-left',
    'bottom-right',
    'bottom-left',
    'top-center',
    'bottom-center',
  ]),
  showIcon: PropTypes.bool,
  showCloseButton: PropTypes.bool,
  isVisible: PropTypes.bool,
};

export default Toast;