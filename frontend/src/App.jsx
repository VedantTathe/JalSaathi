import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';

//Hello
// Public components
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';

// Protected route wrapper
import ProtectedRoute from './components/ProtectedRoute.jsx';

// Dashboard components
import CustomerDashboard from './pages/dashboards/CustomerDashboard.jsx';
import ProviderDashboard from './pages/dashboards/ProviderDashboard.jsx';
import DeliveryDashboard from './pages/dashboards/DeliveryDashboard.jsx';
import AdminDashboard from './pages/dashboards/AdminDashboard.jsx';

// Common pages
import Profile from './pages/Profile.jsx';
import Orders from './pages/Orders.jsx';
import OrderDetails from './pages/OrderDetails.jsx';
import TrackOrder from './pages/TrackOrder.jsx';

// Loading component
import LoadingSpinner from './components/LoadingSpinner.jsx';

import UpdatePrompt from './components/UpdatePrompt.jsx';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="App min-h-screen bg-gray-50">
      <UpdatePrompt />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Landing />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
        <Route path="/register/:role" element={user ? <Navigate to="/dashboard" /> : <Register />} />
        <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" /> : <ForgotPassword />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/track/:orderNumber" element={<TrackOrder />} />

        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardRouter />
          </ProtectedRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        
        <Route path="/orders" element={
          <ProtectedRoute>
            <Orders />
          </ProtectedRoute>
        } />
        
        <Route path="/orders/:orderId" element={
          <ProtectedRoute>
            <OrderDetails />
          </ProtectedRoute>
        } />

        {/* 404 Route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

// Dashboard Router based on user role
function DashboardRouter() {
  const { user } = useAuth();

  switch (user?.role) {
    case 'customer':
      return <CustomerDashboard />;
    case 'provider':
      return <ProviderDashboard />;
    case 'delivery':
      return <DeliveryDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <Navigate to="/login" />;
  }
}

export default App;