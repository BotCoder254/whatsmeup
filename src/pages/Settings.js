import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiSettings, FiBell, FiLock, FiEye, FiMonitor, FiSave, FiInfo, FiUser } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import FormInput from '../components/FormInput';
import Button from '../components/Button';

const Settings = () => {
  const { user } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const toast = useToast();
  
  // Test input state
  const [testInput, setTestInput] = useState('');
  
  // Settings state
  const [settings, setSettings] = useState({
    notifications: {
      newMessage: true,
      mentions: true,
      newConversation: true,
      sounds: true,
      desktop: true,
    },
    privacy: {
      showStatus: true,
      readReceipts: true,
      showLastSeen: true,
      showProfilePhoto: 'everyone', // 'everyone', 'contacts', 'nobody'
    },
    appearance: {
      fontSize: 'medium', // 'small', 'medium', 'large'
      chatBackground: 'default',
      messageAlignment: 'right', // 'right', 'left'
      compactMode: false,
    },
  });

  // Form submission state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('whatsmeup_settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Failed to parse settings:', error);
      }
    }
  }, []);

  // Handle settings change
  const handleSettingChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
  };

  // Handle radio button change
  const handleRadioChange = (category, setting, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: value
      }
    }));
  };

  // Save settings
  const saveSettings = () => {
    setIsSaving(true);
    
    // Simulate API call with timeout
    setTimeout(() => {
      localStorage.setItem('whatsmeup_settings', JSON.stringify(settings));
      setIsSaving(false);
      setSaveSuccess(true);
      
      // Show toast notification
      toast.success('Settings saved successfully!');
      
      // Reset success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    }, 800);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  return (
    <motion.div 
      className="p-4 md:p-8 max-w-4xl mx-auto"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={itemVariants} className="flex items-center mb-8">
        <FiSettings className="text-2xl mr-3 text-blue-500" />
        <h1 className="text-2xl font-bold dark:text-white">Settings</h1>
      </motion.div>

      {/* Test FormInput */}
      <motion.section 
        variants={itemVariants}
        className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
      >
        <div className="flex items-center mb-4">
          <FiInfo className="text-xl mr-3 text-blue-500" />
          <h2 className="text-xl font-semibold dark:text-white">Test Input</h2>
        </div>
        
        <FormInput
          id="test-input"
          label="Test Input Field"
          placeholder="Type something here..."
          value={testInput}
          onChange={(e) => setTestInput(e.target.value)}
          icon={<FiUser />}
        />
        
        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded">
          <p className="text-sm">Input value: <span className="font-medium">{testInput}</span></p>
        </div>
      </motion.section>

      {/* Notifications Section */}
      <motion.section 
        variants={itemVariants}
        className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
      >
        <div className="flex items-center mb-4">
          <FiBell className="text-xl mr-3 text-blue-500" />
          <h2 className="text-xl font-semibold dark:text-white">Notifications</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-gray-700 dark:text-gray-300">New message notifications</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings.notifications.newMessage}
                onChange={(e) => handleSettingChange('notifications', 'newMessage', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-gray-700 dark:text-gray-300">Mention notifications</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings.notifications.mentions}
                onChange={(e) => handleSettingChange('notifications', 'mentions', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-gray-700 dark:text-gray-300">New conversation notifications</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings.notifications.newConversation}
                onChange={(e) => handleSettingChange('notifications', 'newConversation', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-gray-700 dark:text-gray-300">Notification sounds</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings.notifications.sounds}
                onChange={(e) => handleSettingChange('notifications', 'sounds', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-gray-700 dark:text-gray-300">Desktop notifications</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings.notifications.desktop}
                onChange={(e) => handleSettingChange('notifications', 'desktop', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
            </label>
          </div>
        </div>
      </motion.section>

      {/* Privacy Section */}
      <motion.section 
        variants={itemVariants}
        className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
      >
        <div className="flex items-center mb-4">
          <FiLock className="text-xl mr-3 text-blue-500" />
          <h2 className="text-xl font-semibold dark:text-white">Privacy</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-gray-700 dark:text-gray-300">Show online status</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings.privacy.showStatus}
                onChange={(e) => handleSettingChange('privacy', 'showStatus', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-gray-700 dark:text-gray-300">Send read receipts</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings.privacy.readReceipts}
                onChange={(e) => handleSettingChange('privacy', 'readReceipts', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-gray-700 dark:text-gray-300">Show last seen</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings.privacy.showLastSeen}
                onChange={(e) => handleSettingChange('privacy', 'showLastSeen', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
            </label>
          </div>
          
          <div className="mt-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Who can see my profile photo</label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input 
                  type="radio" 
                  id="everyone" 
                  name="profilePhoto" 
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600" 
                  checked={settings.privacy.showProfilePhoto === 'everyone'}
                  onChange={() => handleRadioChange('privacy', 'showProfilePhoto', 'everyone')}
                />
                <label htmlFor="everyone" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Everyone</label>
              </div>
              <div className="flex items-center">
                <input 
                  type="radio" 
                  id="contacts" 
                  name="profilePhoto" 
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600" 
                  checked={settings.privacy.showProfilePhoto === 'contacts'}
                  onChange={() => handleRadioChange('privacy', 'showProfilePhoto', 'contacts')}
                />
                <label htmlFor="contacts" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Contacts only</label>
              </div>
              <div className="flex items-center">
                <input 
                  type="radio" 
                  id="nobody" 
                  name="profilePhoto" 
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600" 
                  checked={settings.privacy.showProfilePhoto === 'nobody'}
                  onChange={() => handleRadioChange('privacy', 'showProfilePhoto', 'nobody')}
                />
                <label htmlFor="nobody" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Nobody</label>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Appearance Section */}
      <motion.section 
        variants={itemVariants}
        className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
      >
        <div className="flex items-center mb-4">
          <FiEye className="text-xl mr-3 text-blue-500" />
          <h2 className="text-xl font-semibold dark:text-white">Appearance</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-gray-700 dark:text-gray-300">Dark Mode</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={darkMode}
                onChange={toggleDarkMode}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
            </label>
          </div>
          
          <div className="mt-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Font Size</label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input 
                  type="radio" 
                  id="small" 
                  name="fontSize" 
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600" 
                  checked={settings.appearance.fontSize === 'small'}
                  onChange={() => handleRadioChange('appearance', 'fontSize', 'small')}
                />
                <label htmlFor="small" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Small</label>
              </div>
              <div className="flex items-center">
                <input 
                  type="radio" 
                  id="medium" 
                  name="fontSize" 
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600" 
                  checked={settings.appearance.fontSize === 'medium'}
                  onChange={() => handleRadioChange('appearance', 'fontSize', 'medium')}
                />
                <label htmlFor="medium" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Medium</label>
              </div>
              <div className="flex items-center">
                <input 
                  type="radio" 
                  id="large" 
                  name="fontSize" 
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600" 
                  checked={settings.appearance.fontSize === 'large'}
                  onChange={() => handleRadioChange('appearance', 'fontSize', 'large')}
                />
                <label htmlFor="large" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Large</label>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-gray-700 dark:text-gray-300">Compact Mode</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={settings.appearance.compactMode}
                onChange={(e) => handleSettingChange('appearance', 'compactMode', e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-500"></div>
            </label>
          </div>
          
          <div className="mt-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-2">Message Alignment</label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input 
                  type="radio" 
                  id="right" 
                  name="messageAlignment" 
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600" 
                  checked={settings.appearance.messageAlignment === 'right'}
                  onChange={() => handleRadioChange('appearance', 'messageAlignment', 'right')}
                />
                <label htmlFor="right" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Right aligned</label>
              </div>
              <div className="flex items-center">
                <input 
                  type="radio" 
                  id="left" 
                  name="messageAlignment" 
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600" 
                  checked={settings.appearance.messageAlignment === 'left'}
                  onChange={() => handleRadioChange('appearance', 'messageAlignment', 'left')}
                />
                <label htmlFor="left" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Left aligned</label>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* About Section */}
      <motion.section 
        variants={itemVariants}
        className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6"
      >
        <div className="flex items-center mb-4">
          <FiInfo className="text-xl mr-3 text-blue-500" />
          <h2 className="text-xl font-semibold dark:text-white">About</h2>
        </div>
        
        <div className="space-y-2 text-gray-700 dark:text-gray-300">
          <p>WhatsMe<span className="text-blue-500">Up</span> v1.0.0</p>
          <p>A modern, open-source chat application</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">© 2023 WhatsMe<span className="text-blue-500">Up</span>. All rights reserved.</p>
        </div>
      </motion.section>

      {/* Save Button */}
      <motion.div 
        variants={itemVariants}
        className="flex justify-end"
      >
        <Button
          onClick={saveSettings}
          disabled={isSaving}
          loading={isSaving}
          variant="primary"
          icon={<FiSave />}
        >
          Save Settings
        </Button>
      </motion.div>

      {/* Success Message */}
      {saveSuccess && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-green-100 text-green-700 rounded-lg flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
          </svg>
          Settings saved successfully!
        </motion.div>
      )}
    </motion.div>
  );
};

export default Settings; 