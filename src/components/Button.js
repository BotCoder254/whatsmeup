import React from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon = null,
  iconPosition = 'left',
  fullWidth = false,
  disabled = false,
  loading = false,
  type = 'button',
  href = null,
  to = null,
  onClick = null,
  className = '',
  ...props
}) => {
  // Base classes
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  // Size classes
  const sizeClasses = {
    xs: 'text-xs py-1 px-2',
    sm: 'text-sm py-1.5 px-3',
    md: 'text-sm py-2 px-4',
    lg: 'text-base py-2.5 px-5',
    xl: 'text-lg py-3 px-6'
  };
  
  // Variant classes
  const variantClasses = {
    primary: 'bg-primary-500 hover:bg-primary-600 text-white focus:ring-primary-500 disabled:bg-primary-300',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-500 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 disabled:bg-gray-100 dark:disabled:bg-gray-800',
    outline: 'bg-transparent border border-primary-500 text-primary-500 hover:bg-primary-50 focus:ring-primary-500 dark:hover:bg-primary-900/20 disabled:border-primary-300 disabled:text-primary-300',
    danger: 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-500 disabled:bg-red-300',
    success: 'bg-green-500 hover:bg-green-600 text-white focus:ring-green-500 disabled:bg-green-300',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 focus:ring-gray-500 dark:hover:bg-gray-800 dark:text-gray-300 disabled:text-gray-400'
  };
  
  // Combine classes
  const buttonClasses = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${fullWidth ? 'w-full' : ''}
    ${disabled || loading ? 'cursor-not-allowed opacity-70' : ''}
    ${className}
  `;
  
  // Loading spinner
  const loadingSpinner = (
    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
  
  // Button content
  const content = (
    <>
      {loading && loadingSpinner}
      {!loading && icon && iconPosition === 'left' && <span className="mr-2">{icon}</span>}
      {children}
      {!loading && icon && iconPosition === 'right' && <span className="ml-2">{icon}</span>}
    </>
  );
  
  // Animation variants
  const buttonAnimation = {
    hover: { scale: 1.03 },
    tap: { scale: 0.97 }
  };
  
  // Render as Link component if 'to' prop is provided
  if (to) {
    return (
      <motion.div
        whileHover={!disabled && !loading ? buttonAnimation.hover : {}}
        whileTap={!disabled && !loading ? buttonAnimation.tap : {}}
      >
        <Link
          to={to}
          className={buttonClasses}
          {...props}
        >
          {content}
        </Link>
      </motion.div>
    );
  }
  
  // Render as anchor tag if 'href' prop is provided
  if (href) {
    return (
      <motion.div
        whileHover={!disabled && !loading ? buttonAnimation.hover : {}}
        whileTap={!disabled && !loading ? buttonAnimation.tap : {}}
      >
        <a
          href={href}
          className={buttonClasses}
          {...props}
        >
          {content}
        </a>
      </motion.div>
    );
  }
  
  // Render as button
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={buttonClasses}
      whileHover={!disabled && !loading ? buttonAnimation.hover : {}}
      whileTap={!disabled && !loading ? buttonAnimation.tap : {}}
      {...props}
    >
      {content}
    </motion.button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'outline', 'danger', 'success', 'ghost']),
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  icon: PropTypes.node,
  iconPosition: PropTypes.oneOf(['left', 'right']),
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  href: PropTypes.string,
  to: PropTypes.string,
  onClick: PropTypes.func,
  className: PropTypes.string
};

export default Button; 