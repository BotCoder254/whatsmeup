import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { FiMenu, FiX, FiLogOut, FiUser, FiMessageCircle, FiHome, FiSettings, FiUsers } from 'react-icons/fi';
import { chatApi } from '../services/api';
import UserAvatar from './UserAvatar';
import Badge from './Badge';
import NotificationCenter from './NotificationCenter';
import DarkModeToggle from './DarkModeToggle';

const Layout = () => {
  const { currentUser, logout } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  // Fetch unread messages count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await chatApi.getUnreadCount();
        setUnreadCount(response.data.unread_count);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    fetchUnreadCount();
    
    // Set up polling for unread messages
    const interval = setInterval(fetchUnreadCount, 30000); // every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Handle logout
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Toggle sidebar for mobile
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Navigation items
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <FiHome className="text-xl" /> },
    { name: 'Messages', path: '/chat', icon: <FiMessageCircle className="text-xl" />, badge: unreadCount },
    { name: 'Contacts', path: '/contacts', icon: <FiUsers className="text-xl" /> },
    { name: 'Profile', path: '/profile', icon: <FiUser className="text-xl" /> },
    { name: 'Settings', path: '/settings', icon: <FiSettings className="text-xl" /> },
  ];

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      {/* Mobile menu button */}
      <button 
        onClick={toggleSidebar}
        className="lg:hidden fixed z-20 top-4 left-4 p-2 rounded-md bg-white dark:bg-gray-800 shadow-md"
      >
        {isSidebarOpen ? <FiX size={24} /> : <FiMenu size={24} />}
      </button>
      
      {/* Sidebar */}
      <motion.div 
        className={`fixed lg:static inset-y-0 left-0 z-10 w-64 bg-white dark:bg-gray-800 shadow-md transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* User profile section */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <UserAvatar 
              user={currentUser} 
              size="md"
              onClick={() => navigate('/profile')}
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-medium truncate">{currentUser?.username}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{currentUser?.email}</p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="mt-4 px-2">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center w-full px-4 py-3 rounded-md transition-colors duration-200 ${
                    location.pathname.startsWith(item.path)
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  <span className="flex-1">{item.name}</span>
                  {item.badge > 0 && (
                    <Badge variant="danger" size="sm" pill animated>
                      {item.badge}
                    </Badge>
                  )}
                </motion.button>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* Bottom actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <DarkModeToggle />
              <NotificationCenter />
            </div>
            
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleLogout}
              className="p-2 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
            >
              <FiLogOut size={20} />
            </motion.button>
          </div>
        </div>
      </motion.div>
      
      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <main className="p-4 md:p-6 lg:p-8 h-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout; 