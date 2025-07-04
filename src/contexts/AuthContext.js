import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authTokens, setAuthTokens] = useState(null);

  // Configure axios defaults
  axios.defaults.baseURL = 'http://localhost:8000/api';

  useEffect(() => {
    // Check if user is already logged in
    const tokens = JSON.parse(localStorage.getItem('auth_tokens'));
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (tokens && user) {
      setAuthTokens(tokens);
      setCurrentUser(user);
      setIsAuthenticated(true);
      
      // Set authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${tokens.access}`;
    }
    
    setIsLoading(false);
  }, []);

  // Register a new user
  const register = async (userData) => {
    try {
      const response = await axios.post('/accounts/register/', userData);
      const { user, access, refresh } = response.data;
      
      // Store tokens and user data
      const tokens = { access, refresh };
      setAuthTokens(tokens);
      setCurrentUser(user);
      setIsAuthenticated(true);
      
      localStorage.setItem('auth_tokens', JSON.stringify(tokens));
      localStorage.setItem('user', JSON.stringify(user));
      
      // Set authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || { detail: 'Network error occurred' } 
      };
    }
  };

  // Login user
  const login = async (credentials) => {
    try {
      const response = await axios.post('/accounts/login/', credentials);
      const { user, access, refresh } = response.data;
      
      // Store tokens and user data
      const tokens = { access, refresh };
      setAuthTokens(tokens);
      setCurrentUser(user);
      setIsAuthenticated(true);
      
      localStorage.setItem('auth_tokens', JSON.stringify(tokens));
      localStorage.setItem('user', JSON.stringify(user));
      
      // Set authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || { detail: 'Network error occurred' } 
      };
    }
  };

  // Logout user
  const logout = async () => {
    try {
      if (isAuthenticated) {
        await axios.post('/accounts/logout/');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear user data and tokens
      setAuthTokens(null);
      setCurrentUser(null);
      setIsAuthenticated(false);
      
      localStorage.removeItem('auth_tokens');
      localStorage.removeItem('user');
      
      // Remove authorization header
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  // Refresh token
  const refreshToken = async () => {
    try {
      const response = await axios.post('/accounts/token/refresh/', {
        refresh: authTokens.refresh,
      });
      
      const { access, refresh } = response.data;
      const newTokens = { access, refresh };
      
      setAuthTokens(newTokens);
      localStorage.setItem('auth_tokens', JSON.stringify(newTokens));
      
      // Update authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      
      return true;
    } catch (error) {
      logout();
      return false;
    }
  };

  // Update user profile
  const updateProfile = async (profileData) => {
    try {
      const response = await axios.patch('/accounts/profile/', profileData);
      const updatedUser = response.data;
      
      setCurrentUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      return { success: true, data: updatedUser };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || { detail: 'Network error occurred' } 
      };
    }
  };

  // Change password
  const changePassword = async (passwordData) => {
    try {
      const response = await axios.post('/accounts/change-password/', passwordData);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || { detail: 'Network error occurred' } 
      };
    }
  };

  // Set up axios interceptor for token refresh
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If error is 401 and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry && authTokens) {
          originalRequest._retry = true;
          
          const refreshed = await refreshToken();
          if (refreshed) {
            return axios(originalRequest);
          }
        }
        
        return Promise.reject(error);
      }
    );
    
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [authTokens]);

  const value = {
    currentUser,
    isAuthenticated,
    isLoading,
    register,
    login,
    logout,
    updateProfile,
    changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 