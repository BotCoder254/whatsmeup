import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiHome } from 'react-icons/fi';

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0.8, rotate: 0 }}
          animate={{ scale: 1, rotate: [0, -5, 5, -5, 0] }}
          transition={{ duration: 0.5, times: [0, 0.2, 0.4, 0.6, 1] }}
          className="text-9xl font-bold text-primary-500 mb-4"
        >
          404
        </motion.div>
        
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Page Not Found</h1>
        <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md">
          Oops! The page you're looking for doesn't exist or has been moved.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/" className="btn btn-primary flex items-center justify-center">
              <FiHome className="mr-2" />
              Go to Dashboard
            </Link>
          </motion.div>
          
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <button 
              onClick={() => window.history.back()} 
              className="btn btn-secondary flex items-center justify-center"
            >
              <FiArrowLeft className="mr-2" />
              Go Back
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound; 