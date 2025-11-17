import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';
import userService from '../services/userService';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Try to get saved user data from localStorage
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Save user data to localStorage when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  // Validate token on mount if user exists in localStorage
  useEffect(() => {
    const validateSession = async () => {
      const savedUser = localStorage.getItem('user');
      const token = localStorage.getItem('access_token');
      
      if (savedUser && token) {
        // User data exists, keep them logged in
        // Token validation happens in API interceptor on first request
        setUser(JSON.parse(savedUser));
      }
    };

    validateSession();

    // Listen for auth:logout event from API interceptor
    const handleAuthLogout = () => {
      console.log('[UserContext] Received auth:logout event, clearing user state');
      setUser(null);
      
      // Redirect to home page
      window.location.href = '/';
    };

    window.addEventListener('auth:logout', handleAuthLogout);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener('auth:logout', handleAuthLogout);
    };
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    
    try {
      // Call real API login endpoint
      const response = await authService.login(credentials);
      
      // Set user from API response
      setUser(response.user);
      
      return { success: true, user: response.user };
    } catch (err) {
      const errorMessage = err.detail || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    setError(null);
    
    try {
      // Call real API register endpoint
      const response = await authService.register(userData);
      
      // Set user from API response
      setUser(response.user);
      
      return { success: true, user: response.user };
    } catch (err) {
      const errorMessage = err.detail || 'Registration failed. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    
    try {
      // Call real API logout endpoint
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  const isLoggedIn = !!user;

  // Update user profile with API call
  const updateUser = async (updatedFields) => {
    setLoading(true);
    setError(null);
    
    try {
      // Call API to update profile
      const updatedUser = await userService.updateProfile(updatedFields);
      
      // Update local state
      setUser(updatedUser);
      
      return { success: true, user: updatedUser };
    } catch (err) {
      const errorMessage = err.detail || 'Failed to update profile';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const addPost = (post) => {
    setUser(prev => ({
      ...prev,
      posts: [post, ...(prev?.posts || [])]
    }));
    // TODO: Call API to create post
    // api.post('/api/posts', post);
  };

  const value = {
    user,
    isLoggedIn,
    login,
    register,
    logout,
    updateUser,
    addPost,
    loading,
    error,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}