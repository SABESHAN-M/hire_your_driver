import React, { createContext, useState, useContext, useCallback, useRef } from 'react';

const AlertContext = createContext();

export const useAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
  const [alert, setAlert] = useState(null);
  const timeoutRef = useRef(null);

  const showAlert = useCallback((message, type = 'info', mode = 'toast') => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    setAlert({ message, type, mode });
    
    // Auto-dismiss toast alerts after 3.5 seconds
    // Modals should NOT auto-dismiss
    const isModal = mode === 'modal' || /wallet|insufficient|funds|reload|top up|low balance/i.test(message);
    if (!isModal) {
      timeoutRef.current = setTimeout(() => {
        setAlert(null);
      }, 3500);
    }
  }, []);

  const hideAlert = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setAlert(null);
  }, []);

  return (
    <AlertContext.Provider value={{ alert, showAlert, hideAlert }}>
      {children}
    </AlertContext.Provider>
  );
};
