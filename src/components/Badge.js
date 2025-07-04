import React from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';

const Badge = ({
  children,
  variant = 'primary',
  size = 'md',
  pill = false,
  dot = false,
  animated = false,
  className = '',
  ...props
}) => {
  // Base classes
  const baseClasses = 'inline-flex items-center justify-center font-medium';
  
  // Size classes
  const sizeClasses = {
    xs: dot ? 'w-1.5 h-1.5' : 'text-xs py-0.5 px-1.5',
    sm: dot ? 'w-2 h-2' : 'text-xs py-0.5 px-2',
    md: dot ? 'w-2.5 h-2.5' : 'text-xs py-1 px-2.5',
    lg: dot ? 'w-3 h-3' : 'text-sm py-1 px-3'
  };
  
  // Variant classes
  const variantClasses = {
    primary: 'bg-primary-500 text-white',
    secondary: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    success: 'bg-green-500 text-white',
    danger: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-white',
    info: 'bg-blue-500 text-white'
  };
  
  // Combine classes
  const badgeClasses = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${pill || dot ? 'rounded-full' : 'rounded'}
    ${className}
  `;

  // Animation variants
  const pulseAnimation = {
    initial: { scale: 1 },
    animate: { 
      scale: [1, 1.1, 1],
      transition: { 
        repeat: Infinity, 
        repeatType: "loop", 
        duration: 2 
      }
    }
  };
  
  // If dot is true, render a simple dot
  if (dot) {
    return (
      <motion.span
        className={badgeClasses}
        initial={animated ? pulseAnimation.initial : {}}
        animate={animated ? pulseAnimation.animate : {}}
        {...props}
      />
    );
  }
  
  // Render badge with content
  return (
    <motion.span
      className={badgeClasses}
      initial={animated ? pulseAnimation.initial : {}}
      animate={animated ? pulseAnimation.animate : {}}
      {...props}
    >
      {children}
    </motion.span>
  );
};

Badge.propTypes = {
  children: PropTypes.node,
  variant: PropTypes.oneOf(['primary', 'secondary', 'success', 'danger', 'warning', 'info']),
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg']),
  pill: PropTypes.bool,
  dot: PropTypes.bool,
  animated: PropTypes.bool,
  className: PropTypes.string
};

export default Badge; 