import React, { createContext, useContext, useState, useCallback } from "react";
import { ToastContainer, ToastItem } from "../components/common/Toast";

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info", duration = 5000, options = {}) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { 
      id, 
      message, 
      type, 
      duration,
      ...options // avatar, name, link, onClick, onAvatarClick
    }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

export default ToastContext;

