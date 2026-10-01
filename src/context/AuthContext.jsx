import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [signupRole, setSignupRole] = useState('client');

  useEffect(() => {
    // Check if user is already logged in on mount
    const storedUser = localStorage.getItem('userSession');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        const firstName = u?.firstName || u?.first_name || 'User';
        const lastName = u?.lastName || u?.last_name || '';
        setCurrentUser({
          ...u,
          firstName,
          first_name: firstName,
          lastName,
          last_name: lastName
        });
      } catch (err) {
        console.error('Failed to parse user session:', err);
      }
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    if (!userData) return;
    const firstName = userData.firstName || userData.first_name || 'User';
    const lastName = userData.lastName || userData.last_name || '';
    const normalized = {
      ...userData,
      firstName,
      first_name: firstName,
      lastName,
      last_name: lastName
    };
    setCurrentUser(normalized);
    localStorage.setItem('userSession', JSON.stringify(normalized));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('userSession');
  };

  const openLogin = () => {
    setIsSignupOpen(false);
    setIsLoginOpen(true);
  };

  const openSignup = (role = 'client') => {
    setSignupRole(role);
    setIsLoginOpen(false);
    setIsSignupOpen(true);
  };

  const closeAuth = () => {
    setIsLoginOpen(false);
    setIsSignupOpen(false);
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, login, logout, loading,
      isLoginOpen, isSignupOpen, signupRole,
      openLogin, openSignup, closeAuth,
      setIsLoginOpen, setIsSignupOpen, setSignupRole
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
