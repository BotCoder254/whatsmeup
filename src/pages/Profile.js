import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiPhone, FiLock, FiEdit2, FiCamera, FiCheck, FiX } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import FormInput from '../components/FormInput';

const Profile = () => {
  const { currentUser, updateProfile, changePassword } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  
  // State for profile form
  const [profileForm, setProfileForm] = useState({
    username: currentUser?.username || '',
    email: currentUser?.email || '',
    phone_number: currentUser?.phone_number || '',
    bio: currentUser?.bio || '',
  });
  
  // State for password form
  const [passwordForm, setPasswordForm] = useState({
    old_password: '',
    new_password: '',
    new_password2: '',
  });
  
  // State for form errors
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  
  // State for success messages
  const [profileSuccess, setProfileSuccess] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  
  // State for profile picture preview
  const [profilePicture, setProfilePicture] = useState(currentUser?.profile_picture || null);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  
  // State for edit mode
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      return await updateProfile(data);
    },
    onSuccess: () => {
      setProfileSuccess('Profile updated successfully!');
      setIsEditingProfile(false);
      setTimeout(() => setProfileSuccess(''), 3000);
      // Invalidate queries to refresh user data
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (error) => {
      if (error.response?.data) {
        setProfileErrors(error.response.data);
      } else {
        setProfileErrors({ general: 'Failed to update profile. Please try again.' });
      }
    },
  });
  
  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data) => {
      return await changePassword(data);
    },
    onSuccess: () => {
      setPasswordSuccess('Password changed successfully!');
      setPasswordForm({
        old_password: '',
        new_password: '',
        new_password2: '',
      });
      setTimeout(() => setPasswordSuccess(''), 3000);
    },
    onError: (error) => {
      if (error.response?.data) {
        setPasswordErrors(error.response.data);
      } else {
        setPasswordErrors({ general: 'Failed to change password. Please try again.' });
      }
    },
  });
  
  // Handle profile form changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm({ ...profileForm, [name]: value });
    
    // Clear errors when typing
    if (profileErrors[name]) {
      setProfileErrors({ ...profileErrors, [name]: '' });
    }
  };
  
  // Handle password form changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm({ ...passwordForm, [name]: value });
    
    // Clear errors when typing
    if (passwordErrors[name]) {
      setPasswordErrors({ ...passwordErrors, [name]: '' });
    }
  };
  
  // Handle profile picture change
  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Preview the image
    const reader = new FileReader();
    reader.onload = () => {
      setProfilePicture(reader.result);
    };
    reader.readAsDataURL(file);
    
    // Store the file for upload
    setProfilePictureFile(file);
  };
  
  // Handle profile form submission
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    // Create form data for the API request
    const formData = new FormData();
    Object.entries(profileForm).forEach(([key, value]) => {
      formData.append(key, value);
    });
    
    // Add profile picture if changed
    if (profilePictureFile) {
      formData.append('profile_picture', profilePictureFile);
    }
    
    // Submit the form
    updateProfileMutation.mutate(formData);
  };
  
  // Handle password form submission
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords match
    if (passwordForm.new_password !== passwordForm.new_password2) {
      setPasswordErrors({ new_password2: 'Passwords do not match' });
      return;
    }
    
    // Submit the form
    changePasswordMutation.mutate(passwordForm);
  };
  
  // Cancel profile editing
  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setProfileForm({
      username: currentUser?.username || '',
      email: currentUser?.email || '',
      phone_number: currentUser?.phone_number || '',
      bio: currentUser?.bio || '',
    });
    setProfilePicture(currentUser?.profile_picture || null);
    setProfilePictureFile(null);
    setProfileErrors({});
  };
  
  return (
    <div className="h-full">
      <h1 className="text-2xl font-bold mb-6">Profile Settings</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="card lg:col-span-2"
        >
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold">Profile Information</h2>
            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="flex items-center text-primary-600 hover:text-primary-700"
              >
                <FiEdit2 className="mr-1" />
                Edit
              </button>
            )}
          </div>
          
          {profileSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-md text-sm"
            >
              {profileSuccess}
            </motion.div>
          )}
          
          {profileErrors.general && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-md text-sm"
            >
              {profileErrors.general}
            </motion.div>
          )}
          
          <form onSubmit={handleProfileSubmit}>
            <div className="flex flex-col md:flex-row items-center mb-6">
              <div className="relative mb-4 md:mb-0 md:mr-6">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                  {profilePicture ? (
                    <img
                      src={profilePicture}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                      <FiUser size={40} />
                    </div>
                  )}
                </div>
                
                {isEditingProfile && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 rounded-full bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                  >
                    <FiCamera size={14} />
                  </button>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfilePictureChange}
                  className="hidden"
                />
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-medium">{currentUser?.username}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {currentUser?.email || 'No email provided'}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Joined on {new Date(currentUser?.date_joined).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <FormInput
                id="username"
                name="username"
                label="Username"
                type="text"
                placeholder="Enter your username"
                value={profileForm.username}
                onChange={handleProfileChange}
                error={profileErrors.username}
                icon={<FiUser />}
                required
                disabled={!isEditingProfile}
              />
              
              <FormInput
                id="email"
                name="email"
                label="Email Address"
                type="email"
                placeholder="Enter your email"
                value={profileForm.email}
                onChange={handleProfileChange}
                error={profileErrors.email}
                icon={<FiMail />}
                disabled={!isEditingProfile}
              />
              
              <FormInput
                id="phone_number"
                name="phone_number"
                label="Phone Number"
                type="tel"
                placeholder="Enter your phone number"
                value={profileForm.phone_number}
                onChange={handleProfileChange}
                error={profileErrors.phone_number}
                icon={<FiPhone />}
                disabled={!isEditingProfile}
              />
              
              <div className="mb-4">
                <label htmlFor="bio" className="label">Bio</label>
                <textarea
                  id="bio"
                  name="bio"
                  placeholder="Tell us about yourself"
                  value={profileForm.bio}
                  onChange={handleProfileChange}
                  disabled={!isEditingProfile}
                  className="input min-h-[100px]"
                />
                {profileErrors.bio && (
                  <p className="mt-1 text-sm text-red-500">{profileErrors.bio}</p>
                )}
              </div>
              
              {isEditingProfile && (
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="btn btn-secondary flex items-center"
                  >
                    <FiX className="mr-2" />
                    Cancel
                  </button>
                  
                  <button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="btn btn-primary flex items-center"
                  >
                    {updateProfileMutation.isPending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent border-white mr-2"></div>
                    ) : (
                      <FiCheck className="mr-2" />
                    )}
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </form>
        </motion.div>
        
        {/* Settings Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="space-y-6"
        >
          {/* Password Card */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              Change Password
            </h2>
            
            {passwordSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-md text-sm"
              >
                {passwordSuccess}
              </motion.div>
            )}
            
            {passwordErrors.general && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-md text-sm"
              >
                {passwordErrors.general}
              </motion.div>
            )}
            
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <FormInput
                id="old_password"
                name="old_password"
                label="Current Password"
                type="password"
                placeholder="Enter your current password"
                value={passwordForm.old_password}
                onChange={handlePasswordChange}
                error={passwordErrors.old_password}
                icon={<FiLock />}
                required
              />
              
              <FormInput
                id="new_password"
                name="new_password"
                label="New Password"
                type="password"
                placeholder="Enter your new password"
                value={passwordForm.new_password}
                onChange={handlePasswordChange}
                error={passwordErrors.new_password}
                icon={<FiLock />}
                required
              />
              
              <FormInput
                id="new_password2"
                name="new_password2"
                label="Confirm New Password"
                type="password"
                placeholder="Confirm your new password"
                value={passwordForm.new_password2}
                onChange={handlePasswordChange}
                error={passwordErrors.new_password2}
                icon={<FiLock />}
                required
              />
              
              <button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="w-full btn btn-primary flex justify-center items-center"
              >
                {changePasswordMutation.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent border-white mr-2"></div>
                ) : null}
                Change Password
              </button>
            </form>
          </div>
          
          {/* Preferences Card */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              Preferences
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Dark Mode</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Toggle between light and dark themes
                  </p>
                </div>
                
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={toggleDarkMode}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Email Notifications</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Receive email notifications for new messages
                  </p>
                </div>
                
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={true}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Sound Effects</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Play sound when receiving new messages
                  </p>
                </div>
                
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={true}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile; 