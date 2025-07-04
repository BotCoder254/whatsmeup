import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import Toast from '../components/Toast';

// Create context
const ToastContext = createContext();

// Generate unique ID for each toast
const generateId = () => `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

// Toast provider component
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // Add a new toast
  const addToast = useCallback((message, options = {}) => {
    const id = generateId();
    const toast = {
      id,
      message,
      type: options.type || 'info',
      duration: options.duration !== undefined ? options.duration : 5000,
      position: options.position || 'top-right',
      showIcon: options.showIcon !== undefined ? options.showIcon : true,
      showCloseButton: options.showCloseButton !== undefined ? options.showCloseButton : true,
    };

    setToasts(prevToasts => [...prevToasts, toast]);
    return id;
  }, []);

  // Remove a toast by ID
  const removeToast = useCallback(id => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  // Helper methods for different toast types
  const success = useCallback((message, options = {}) => {
    return addToast(message, { ...options, type: 'success' });
  }, [addToast]);

  const info = useCallback((message, options = {}) => {
    return addToast(message, { ...options, type: 'info' });
  }, [addToast]);

  const warning = useCallback((message, options = {}) => {
    return addToast(message, { ...options, type: 'warning' });
  }, [addToast]);

  const error = useCallback((message, options = {}) => {
    return addToast(message, { ...options, type: 'error' });
  }, [addToast]);

  // Group toasts by position
  const groupedToasts = toasts.reduce((acc, toast) => {
    if (!acc[toast.position]) {
      acc[toast.position] = [];
    }
    acc[toast.position].push(toast);
    return acc;
  }, {});

  return (
    <ToastContext.Provider
      value={{
        addToast,
        removeToast,
        success,
        info,
        warning,
        error,
      }}
    >
      {children}
      
      {/* Render toasts grouped by position */}
      {Object.entries(groupedToasts).map(([position, positionToasts]) => (
        <div key={position} className={`fixed z-50 ${position.replace('-', ' ')}`}>
          <AnimatePresence>
            {positionToasts.map(toast => (
              <Toast
                key={toast.id}
                message={toast.message}
                type={toast.type}
                duration={toast.duration}
                position={toast.position}
                showIcon={toast.showIcon}
                showCloseButton={toast.showCloseButton}
                onClose={() => removeToast(toast.id)}
                isVisible={true}
              />
            ))}
          </AnimatePresence>
        </div>
      ))}
    </ToastContext.Provider>
  );
};

// Custom hook to use toast context
export const useToast = () => {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return context;
};

export default ToastContext; 