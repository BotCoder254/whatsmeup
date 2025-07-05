import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiX, FiCalendar, FiUser, FiFilter, FiMessageSquare } from 'react-icons/fi';
import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useTheme } from '../contexts/ThemeContext';
import { chatApi } from '../services/api';
import UserAvatar from './UserAvatar';

const MessageSearch = ({ 
  isOpen, 
  onClose, 
  conversationId,
  onMessageSelect
}) => {
  const { darkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSender, setSelectedSender] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const searchInputRef = useRef(null);
  
  // Set up debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);
  
  // Reset search when closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setDebouncedQuery('');
      setShowFilters(false);
      setSelectedSender(null);
      setStartDate('');
      setEndDate('');
    }
  }, [isOpen]);
  
  // Search query
  const { 
    data: searchResults = [], 
    isLoading,
    error
  } = useQuery({
    queryKey: ['messageSearch', debouncedQuery, conversationId, selectedSender?.id, startDate, endDate],
    queryFn: () => chatApi.searchMessages({
      query: debouncedQuery,
      conversationId: conversationId,
      senderId: selectedSender?.id,
      startDate,
      endDate
    }).then(res => res.data),
    enabled: isOpen && (debouncedQuery.length > 0 || selectedSender || startDate || endDate),
    staleTime: 30000 // 30 seconds
  });
  
  // Handle message selection
  const handleMessageSelect = (message) => {
    if (onMessageSelect) {
      onMessageSelect(message);
      onClose();
    }
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSelectedSender(null);
    setStartDate('');
    setEndDate('');
  };
  
  // Highlight matching text
  const highlightText = (text, query) => {
    if (!query || !text) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <span key={i} className="bg-yellow-200 dark:bg-yellow-700">{part}</span> : 
        part
    );
  };
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } }
  };
  
  const resultVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 10 }
  };
  
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
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
          
          {/* Search container */}
          <motion.div
            className={`fixed inset-x-0 top-0 z-50 ${
              darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
            } shadow-lg rounded-b-lg max-h-[80vh] flex flex-col`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Search header */}
            <div className="p-4 border-b dark:border-gray-700 flex items-center">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search messages..."
                  className={`w-full pl-10 pr-10 py-2 rounded-lg ${
                    darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'
                  } focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    onClick={() => setSearchQuery('')}
                  >
                    <FiX />
                  </button>
                )}
              </div>
              <button
                className={`ml-2 p-2 rounded-lg ${
                  showFilters ? 
                    'bg-primary-500 text-white' : 
                    darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                }`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <FiFilter />
              </button>
              <button
                className="ml-2 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                onClick={onClose}
              >
                <FiX />
              </button>
            </div>
            
            {/* Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  className="p-4 border-b dark:border-gray-700"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <div className="flex flex-wrap gap-4">
                    {/* Date range */}
                    <div className="flex items-center">
                      <FiCalendar className="mr-2 text-gray-400" />
                      <input
                        type="date"
                        className={`rounded-lg p-2 ${
                          darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'
                        }`}
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        placeholder="Start date"
                      />
                      <span className="mx-2">to</span>
                      <input
                        type="date"
                        className={`rounded-lg p-2 ${
                          darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'
                        }`}
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        placeholder="End date"
                      />
                    </div>
                    
                    {/* Sender filter - in a real app, you'd fetch users from the conversation */}
                    {selectedSender && (
                      <div className={`flex items-center rounded-full px-3 py-1 ${
                        darkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}>
                        <FiUser className="mr-2 text-gray-400" />
                        <span>{selectedSender.username}</span>
                        <button
                          className="ml-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
                          onClick={() => setSelectedSender(null)}
                        >
                          <FiX size={12} />
                        </button>
                      </div>
                    )}
                    
                    {/* Clear filters button */}
                    {(selectedSender || startDate || endDate) && (
                      <button
                        className="text-primary-500 hover:underline text-sm"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Search results */}
            <div className="flex-1 overflow-y-auto p-2">
              {isLoading ? (
                <div className="flex justify-center items-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                </div>
              ) : error ? (
                <div className="p-4 text-center text-red-500">
                  Error searching messages
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
                  <FiMessageSquare size={32} className="mb-2" />
                  <p>No messages found</p>
                  {debouncedQuery && <p className="text-sm">Try a different search term</p>}
                </div>
              ) : (
                <AnimatePresence>
                  {searchResults.map((message, index) => (
                    <motion.div
                      key={message.id}
                      className={`p-3 mb-2 rounded-lg cursor-pointer ${
                        darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                      variants={resultVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleMessageSelect(message)}
                    >
                      <div className="flex items-start">
                        <UserAvatar user={message.sender} size="sm" />
                        <div className="ml-2 flex-1">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{message.sender.username}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {format(new Date(message.timestamp), 'MMM d, h:mm a')}
                            </span>
                          </div>
                          <p className="text-sm mt-1">
                            {highlightText(message.content, debouncedQuery)}
                          </p>
                          {message.attachment && (
                            <div className="mt-1 text-xs text-primary-500">
                              Has attachment
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

MessageSearch.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  conversationId: PropTypes.string,
  onMessageSelect: PropTypes.func
};

export default MessageSearch; 