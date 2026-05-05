// src/hooks/useAuth.jsx
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import api from '../api/axiosInstance.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/user/me');
      setUser(data);
    } catch (err) {
      // If refresh also fails, user gets logged out via interceptor
      setUser(null);
      localStorage.removeItem('accessToken');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (_) {}
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  const setToken = (token) => {
    localStorage.setItem('accessToken', token);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, setToken, fetchUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
