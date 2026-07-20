import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('accessToken') || null);
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken') || null);
  const [loading, setLoading] = useState(true);

  // Initialize user from token on startup
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const resData = await response.json();

      if (!resData.success) {
        throw new Error(resData.message || 'Login failed');
      }

      const { accessToken, refreshToken: refToken, user: userData } = resData.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refToken);
      localStorage.setItem('user', JSON.stringify(userData));

      setToken(accessToken);
      setRefreshToken(refToken);
      setUser(userData);

      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const register = async (email, password, orgName, orgSlug) => {
    try {
      const response = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, orgName, orgSlug }),
      });
      const resData = await response.json();

      if (!resData.success) {
        throw new Error(resData.message || 'Registration failed');
      }

      const { accessToken, refreshToken: refToken, user: userData } = resData.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refToken);
      localStorage.setItem('user', JSON.stringify(userData));

      setToken(accessToken);
      setRefreshToken(refToken);
      setUser(userData);

      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  // Perform token refresh
  const refreshAccessToken = async () => {
    const currentRefreshToken = localStorage.getItem('refreshToken');
    if (!currentRefreshToken) {
      logout();
      return null;
    }

    try {
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: currentRefreshToken }),
      });
      const resData = await response.json();

      if (!resData.success) {
        throw new Error('Refresh failed');
      }

      const newAccessToken = resData.data.accessToken;
      const newRefreshToken = resData.data.refreshToken;

      localStorage.setItem('accessToken', newAccessToken);
      if (newRefreshToken) {
        localStorage.setItem('refreshToken', newRefreshToken);
        setRefreshToken(newRefreshToken);
      }

      setToken(newAccessToken);
      return newAccessToken;
    } catch (error) {
      console.warn('Session expired, logging out:', error.message);
      logout();
      return null;
    }
  };

  // Standardized authenticated fetch call wrapper
  const apiCall = async (url, options = {}) => {
    let currentToken = token;
    
    // Attach authorization header if token exists
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (currentToken) {
      headers['Authorization'] = `Bearer ${currentToken}`;
    }

    let response = await fetch(url, { ...options, headers });

    // Handle token expiration (401 Unauthorized)
    if (response.status === 401 && refreshToken) {
      console.log('🔄 Access token expired. Attempting refresh...');
      const newToken = await refreshAccessToken();
      
      if (newToken) {
        // Retry the original request with the new access token
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(url, { ...options, headers });
      }
    }

    const resData = await response.json();
    return resData;
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    apiCall,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
