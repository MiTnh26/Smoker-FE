import React from "react";
import AppRoutes from "./routes/AppRoutes";
import { AuthProvider } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketContext";
import { ToastProvider } from "./contexts/ToastContext";
import "./styles/global.css";

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ToastProvider>
        <AppRoutes />
        </ToastProvider>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
