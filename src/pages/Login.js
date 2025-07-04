import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUser, FiLock, FiMail, FiPhone } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import FormInput from '../components/FormInput';

const Login = () => {
  const { login } = useAuth();
  const [loginMethod, setLoginMethod] = useState('username'); // 'username', 'email', or 'phone'
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone_number: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear errors when typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
    
    if (loginError) {
      setLoginError('');
    }
  };

  // Handle login method change
  const handleLoginMethodChange = (method) => {
    setLoginMethod(method);
    setErrors({});
    setLoginError('');
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (loginMethod === 'username' && !formData.username.trim()) {
      newErrors.username = 'Username is required';
    }
    
    if (loginMethod === 'email' && !formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (
      loginMethod === 'email' && 
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)
    ) {
      newErrors.email = 'Invalid email address';
    }
    
    if (loginMethod === 'phone' && !formData.phone_number.trim()) {
      newErrors.phone_number = 'Phone number is required';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    setLoginError('');
    
    // Prepare credentials based on login method
    const credentials = {
      password: formData.password,
    };
    
    if (loginMethod === 'username') {
      credentials.username = formData.username;
    } else if (loginMethod === 'email') {
      credentials.email = formData.email;
    } else if (loginMethod === 'phone') {
      credentials.phone_number = formData.phone_number;
    }
    
    try {
      const result = await login(credentials);
      
      if (!result.success) {
        if (result.error.detail) {
          setLoginError(result.error.detail);
        } else {
          setLoginError('Login failed. Please check your credentials and try again.');
        }
      }
    } catch (error) {
      setLoginError('An unexpected error occurred. Please try again later.');
      console.error('Login error:', error);
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
        className="max-w-md w-full"
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
            Sign in to your account
          </p>
        </div>
        
        <div className="card">
          {/* Login method tabs */}
          <div className="flex mb-6 border-b border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => handleLoginMethodChange('username')}
              className={`flex-1 py-2 text-center text-sm font-medium ${
                loginMethod === 'username'
                  ? 'text-primary-600 border-b-2 border-primary-500'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Username
            </button>
            <button
              type="button"
              onClick={() => handleLoginMethodChange('email')}
              className={`flex-1 py-2 text-center text-sm font-medium ${
                loginMethod === 'email'
                  ? 'text-primary-600 border-b-2 border-primary-500'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => handleLoginMethodChange('phone')}
              className={`flex-1 py-2 text-center text-sm font-medium ${
                loginMethod === 'phone'
                  ? 'text-primary-600 border-b-2 border-primary-500'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              Phone
            </button>
          </div>
          
          {/* Login form */}
          <form onSubmit={handleSubmit}>
            {loginMethod === 'username' && (
              <FormInput
                id="username"
                name="username"
                label="Username"
                type="text"
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleChange}
                error={errors.username}
                icon={<FiUser />}
                required
                autoComplete="username"
              />
            )}
            
            {loginMethod === 'email' && (
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
            )}
            
            {loginMethod === 'phone' && (
              <FormInput
                id="phone_number"
                name="phone_number"
                label="Phone Number"
                type="tel"
                placeholder="Enter your phone number"
                value={formData.phone_number}
                onChange={handleChange}
                error={errors.phone_number}
                icon={<FiPhone />}
                required
                autoComplete="tel"
              />
            )}
            
            <FormInput
              id="password"
              name="password"
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              icon={<FiLock />}
              required
              autoComplete="current-password"
            />
            
            {loginError && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-md text-sm"
              >
                {loginError}
              </motion.div>
            )}
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Remember me
                </label>
              </div>
              
              <div className="text-sm">
                <a href="#" className="text-primary-600 hover:text-primary-500">
                  Forgot password?
                </a>
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
              Sign in
            </motion.button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-600 hover:text-primary-500 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login; 