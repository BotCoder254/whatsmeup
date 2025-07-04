import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUser, FiLock, FiMail, FiPhone, FiCheck, FiX } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import FormInput from '../components/FormInput';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone_number: '',
    password: '',
    password2: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear errors when typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
    
    if (registerError) {
      setRegisterError('');
    }
  };

  // Password strength checker
  const checkPasswordStrength = (password) => {
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const strength = 
      (hasMinLength ? 1 : 0) +
      (hasUpperCase ? 1 : 0) +
      (hasLowerCase ? 1 : 0) +
      (hasNumbers ? 1 : 0) +
      (hasSpecialChars ? 1 : 0);
    
    return {
      score: strength,
      hasMinLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChars,
    };
  };

  // Get password strength color
  const getPasswordStrengthColor = (score) => {
    if (score <= 2) return 'bg-red-500';
    if (score <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Get password strength text
  const getPasswordStrengthText = (score) => {
    if (score <= 2) return 'Weak';
    if (score <= 3) return 'Medium';
    return 'Strong';
  };

  const passwordStrength = checkPasswordStrength(formData.password);

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }
    
    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    
    // Phone validation (optional)
    if (formData.phone_number && !/^\+?[0-9]{10,15}$/.test(formData.phone_number)) {
      newErrors.phone_number = 'Invalid phone number format';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (passwordStrength.score < 3) {
      newErrors.password = 'Password is too weak';
    }
    
    // Confirm password validation
    if (!formData.password2) {
      newErrors.password2 = 'Please confirm your password';
    } else if (formData.password !== formData.password2) {
      newErrors.password2 = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setRegisterError('');
    
    try {
      const result = await register(formData);
      
      if (result.success) {
        // Registration successful, navigate to dashboard
        navigate('/dashboard');
      } else {
        // Handle registration errors
        if (result.error) {
          const errorMessages = {};
          
          // Process field-specific errors
          Object.keys(result.error).forEach(key => {
            if (Array.isArray(result.error[key])) {
              errorMessages[key] = result.error[key][0];
            } else if (typeof result.error[key] === 'string') {
              errorMessages[key] = result.error[key];
            }
          });
          
          // Set field errors
          setErrors(errorMessages);
          
          // Set general error if there's a non-field error
          if (result.error.detail || result.error.non_field_errors) {
            setRegisterError(result.error.detail || result.error.non_field_errors[0]);
          }
        } else {
          setRegisterError('Registration failed. Please try again.');
        }
      }
    } catch (error) {
      setRegisterError('An unexpected error occurred. Please try again later.');
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full py-8"
      >
        <div className="text-center mb-8">
          <motion.h1 
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-3xl font-bold text-gray-900 dark:text-white"
          >
            WhatsMe<span className="text-primary-500">Up</span>
          </motion.h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Create your account
          </p>
        </div>
        
        <div className="card">
          {/* Register form */}
          <form onSubmit={handleSubmit}>
            <FormInput
              id="username"
              name="username"
              label="Username"
              type="text"
              placeholder="Choose a username"
              value={formData.username}
              onChange={handleChange}
              error={errors.username}
              icon={<FiUser />}
              required
              autoComplete="username"
            />
            
            <FormInput
              id="email"
              name="email"
              label="Email Address"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              icon={<FiMail />}
              required
              autoComplete="email"
            />
            
            <FormInput
              id="phone_number"
              name="phone_number"
              label="Phone Number (Optional)"
              type="tel"
              placeholder="Enter your phone number"
              value={formData.phone_number}
              onChange={handleChange}
              error={errors.phone_number}
              icon={<FiPhone />}
              autoComplete="tel"
            />
            
            <div className="mb-4">
              <FormInput
                id="password"
                name="password"
                label="Password"
                type="password"
                placeholder="Create a password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                icon={<FiLock />}
                required
                autoComplete="new-password"
              />
              
              {formData.password && (
                <div className="mt-2">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Password strength:</span>
                    <span className={`text-xs font-medium ${
                      passwordStrength.score <= 2 ? 'text-red-500' : 
                      passwordStrength.score <= 3 ? 'text-yellow-500' : 'text-green-500'
                    }`}>
                      {getPasswordStrengthText(passwordStrength.score)}
                    </span>
                  </div>
                  
                  <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                      className={`h-full ${getPasswordStrengthColor(passwordStrength.score)}`}
                    />
                  </div>
                  
                  <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                    <li className="flex items-center text-xs">
                      {passwordStrength.hasMinLength ? (
                        <FiCheck className="text-green-500 mr-1" />
                      ) : (
                        <FiX className="text-red-500 mr-1" />
                      )}
                      At least 8 characters
                    </li>
                    <li className="flex items-center text-xs">
                      {passwordStrength.hasUpperCase ? (
                        <FiCheck className="text-green-500 mr-1" />
                      ) : (
                        <FiX className="text-red-500 mr-1" />
                      )}
                      Uppercase letter
                    </li>
                    <li className="flex items-center text-xs">
                      {passwordStrength.hasLowerCase ? (
                        <FiCheck className="text-green-500 mr-1" />
                      ) : (
                        <FiX className="text-red-500 mr-1" />
                      )}
                      Lowercase letter
                    </li>
                    <li className="flex items-center text-xs">
                      {passwordStrength.hasNumbers ? (
                        <FiCheck className="text-green-500 mr-1" />
                      ) : (
                        <FiX className="text-red-500 mr-1" />
                      )}
                      Number
                    </li>
                    <li className="flex items-center text-xs col-span-2">
                      {passwordStrength.hasSpecialChars ? (
                        <FiCheck className="text-green-500 mr-1" />
                      ) : (
                        <FiX className="text-red-500 mr-1" />
                      )}
                      Special character (!@#$%^&*...)
                    </li>
                  </ul>
                </div>
              )}
            </div>
            
            <FormInput
              id="password2"
              name="password2"
              label="Confirm Password"
              type="password"
              placeholder="Confirm your password"
              value={formData.password2}
              onChange={handleChange}
              error={errors.password2}
              icon={<FiLock />}
              required
              autoComplete="new-password"
            />
            
            {registerError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-md text-sm"
              >
                {registerError}
              </motion.div>
            )}
            
            <div className="mb-6">
              <div className="flex items-center">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  required
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="terms" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  I agree to the <a href="#" className="text-primary-600 hover:text-primary-500">Terms of Service</a> and <a href="#" className="text-primary-600 hover:text-primary-500">Privacy Policy</a>
                </label>
              </div>
            </div>
            
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full btn btn-primary flex justify-center items-center"
            >
              {isLoading ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : null}
              Create Account
            </motion.button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-500 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register; 