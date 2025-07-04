import React from 'react';
import { motion } from 'framer-motion';

const LoadingScreen = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatType: 'loop',
          }}
          className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-primary-400 to-primary-600"
        />
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Loading...</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Please wait while we prepare everything for you</p>
      </motion.div>
    </div>
  );
};

export default LoadingScreen; 