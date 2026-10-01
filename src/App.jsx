import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DashboardLayout from './pages/dashboards/DashboardLayout';
import ClientDashboard from './pages/dashboards/client/ClientDashboard';
import ClientBookings from './pages/dashboards/client/ClientBookings';
import NewBooking from './pages/dashboards/client/NewBooking';
import ClientWallet from './pages/dashboards/client/ClientWallet';
import ClientSafetyCenter from './pages/dashboards/client/ClientSafetyCenter';
import ClientProfile from './pages/dashboards/client/ClientProfile';
import ClientSettings from './pages/dashboards/client/ClientSettings';

import DriverDashboard from './pages/dashboards/driver/DriverDashboard';
import DriverBookings from './pages/dashboards/driver/DriverBookings';
import DriverWallet from './pages/dashboards/driver/DriverWallet';
import DriverSafetyCenter from './pages/dashboards/driver/DriverSafetyCenter';
import DriverProfile from './pages/dashboards/driver/DriverProfile';
import DriverSettings from './pages/dashboards/driver/DriverSettings';
import DriverAttendance from './pages/dashboards/driver/DriverAttendance';
import DriverDocuments from './pages/dashboards/driver/DriverDocuments';

import AdminDashboard from './pages/dashboards/admin/AdminDashboard';
import AdminDrivers from './pages/dashboards/admin/AdminDrivers';
import AdminBookings from './pages/dashboards/admin/AdminBookings';
import AdminUsers from './pages/dashboards/admin/AdminUsers';
import AdminRevenue from './pages/dashboards/admin/AdminRevenue';
import AdminSettings from './pages/dashboards/admin/AdminSettings';
import AdminMessages from './pages/dashboards/admin/AdminMessages';

import { AlertProvider } from './context/AlertContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import AlertPopup from './components/AlertPopup';
import Login from './components/Login';
import Signup from './components/Signup';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const scrollContainers = document.querySelectorAll('.dashboard-content, .dashboard-main, .dashboard-layout, body, html');
    scrollContainers.forEach(container => {
      if (container) {
        container.scrollTop = 0;
      }
    });
  }, [pathname]);

  return null;
};

const GlobalAuthModals = () => {
  const { 
    isLoginOpen, isSignupOpen, signupRole, 
    openLogin, openSignup, closeAuth 
  } = useAuth();

  return (
    <>
      <Login 
        isOpen={isLoginOpen} 
        onClose={closeAuth} 
        onSwitchToSignup={() => openSignup('client')} 
      />
      
      <Signup 
        isOpen={isSignupOpen} 
        onClose={closeAuth} 
        onSwitchToLogin={openLogin}
        defaultRole={signupRole}
      />
    </>
  );
};

function App() {
  return (
    <AuthProvider>
    <ThemeProvider>
    <AlertProvider>
      <BrowserRouter>
        <ScrollToTop />
        <AlertPopup />
        <GlobalAuthModals />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          
          {/* Dashboards */}
          <Route path="/dashboard/client" element={<DashboardLayout role="Client" />}>
            <Route index element={<ClientDashboard />} />
            <Route path="bookings" element={<ClientBookings />} />
            <Route path="bookings/new" element={<NewBooking />} />
            <Route path="wallet" element={<ClientWallet />} />
            <Route path="safety" element={<ClientSafetyCenter />} />
            <Route path="profile" element={<ClientProfile />} />
            <Route path="settings" element={<ClientSettings />} />
          </Route>
          
          <Route path="/dashboard/driver" element={<DashboardLayout role="Driver" />}>
            <Route index element={<DriverDashboard />} />
            <Route path="bookings" element={<DriverBookings />} />
            <Route path="wallet" element={<DriverWallet />} />
            <Route path="attendance" element={<DriverAttendance />} />
            <Route path="documents" element={<DriverDocuments />} />
            <Route path="safety" element={<DriverSafetyCenter />} />
            <Route path="profile" element={<DriverProfile />} />
            <Route path="settings" element={<DriverSettings />} />
          </Route>

          <Route path="/dashboard/admin" element={<DashboardLayout role="Admin" />}>
            <Route index element={<AdminDashboard />} />
            <Route path="drivers" element={<AdminDrivers />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="revenue" element={<AdminRevenue />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AlertProvider>
    </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
