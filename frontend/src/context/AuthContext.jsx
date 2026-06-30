import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true); // The "Flicker" Guard
  const navigate = useNavigate();

  // 1. INITIALIZE: Check localStorage on every app load/refresh
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    
    // Auth check is done, stop showing loading state
    setLoading(false); 
  }, []);

  // 2. LOGIN FUNCTION: Called by the Login Page on success
  const login = (userData, userToken) => {
    setToken(userToken);
    setUser(userData);
    
    // Persist to browser storage
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));

    // Redirect based on role
    if (userData.role === 'admin') navigate('/admin/dashboard');
    else if (userData.role === 'teacher') navigate('/teacher/dashboard');
    else if (userData.role === 'student') navigate('/student/dashboard');
  };

  // 3. LOGOUT FUNCTION: Clears everything
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

   const updateUser = (newData) => {
    setUser((prev) => {
      const updatedUser = { ...prev, ...newData };
      // Save the updated object back to localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  };

  // Helper to check permissions in components
  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      login, 
      logout, 
      updateUser,
      isAuthenticated,
      role: user?.role 
    }}>
      {!loading && children} 
      {/* We don't render the app until we know the auth status */}
    </AuthContext.Provider>
  );
};

// 4. CUSTOM HOOK: For easy use in any component
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};