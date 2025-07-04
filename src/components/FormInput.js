import React, { useState } from 'react';
import { motion } from 'framer-motion';

const FormInput = ({
  id,
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  icon,
  required = false,
  autoComplete,
  className = '',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  
  // Handle input focus
  const handleFocus = () => setIsFocused(true);
  
  // Handle input blur
  const handleBlur = () => setIsFocused(false);
  
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500 dark:text-gray-400">
            {icon}
          </div>
        )}
        
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          required={required}
          autoComplete={autoComplete}
          className={`input ${icon ? 'pl-10' : ''} ${
            error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
          } text-gray-900 dark:text-white`}
        />
      </div>
      
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="mt-1 text-sm text-red-500"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
};

export default FormInput; 