import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize non-sensitive user metadata on startup
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

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

      const { user: userData } = resData.data;

      // Persist only non-sensitive metadata for page renders, tokens remain in HttpOnly cookies
      localStorage.setItem('user', JSON.stringify(userData));
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

      const { user: userData } = resData.data;

      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/v1/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.warn('Backend logout failed:', err.message);
    }
    localStorage.clear();
    setUser(null);
  };

  // Perform token refresh via backend refresh endpoint
  const refreshAccessToken = async () => {
    try {
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Ensure browser sends the refreshToken cookie
      });
      const resData = await response.json();

      if (!resData.success) {
        throw new Error('Refresh failed');
      }

      return true; // Access token successfully refreshed in backend cookie
    } catch (error) {
      console.warn('Session expired, logging out:', error.message);
      logout();
      return false;
    }
  };

  // Standardized authenticated fetch call wrapper
  const apiCall = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // credentials: 'include' forces browser to send and receive HttpOnly cookies
    let response = await fetch(url, { ...options, headers, credentials: 'include' });

    // Handle token expiration (401 Unauthorized)
    if (response.status === 401) {
      console.log('🔄 Access token expired. Attempting refresh...');
      const refreshSuccess = await refreshAccessToken();
      
      if (refreshSuccess) {
        // Retry the original request with the fresh cookie active
        response = await fetch(url, { ...options, headers, credentials: 'include' });
      }
    }

    const resData = await response.json();
    return resData;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, apiCall }}>
      {children}
    </AuthContext.Provider>
  );
};
