import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Home as HomeIcon, Package, MapPin, History, DollarSign, User,
  CheckCircle, Clock, Phone, Navigation, Truck, IndianRupee, Calendar
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { deliveryApi } from '../../services/api';
import { formatCurrency, formatDateTime, getStatusColor, getStatusText } from '../../utils/helpers';
import toast from 'react-hot-toast';

const DeliveryDashboard = () => {
  const queryClient = useQueryClient();
  const [activePage, setActivePage] = useState('dashboard');

  // Fetch data
  const { data: ordersData, isLoading: ordersLoading } = useQuery('delivery-orders', () => deliveryApi.getAssignedOrders());

  const markDeliveredMutation = useMutation(
    (orderId) => deliveryApi.markAsDelivered(orderId, ''),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('delivery-orders');
        toast.success('Order marked as delivered!');
      },
      onError: () => toast.error('Failed to update order')
    }
  );

  const navigation = [
    { key: 'dashboard', name: 'Dashboard Home', icon: HomeIcon },
    { key: 'assigned-orders', name: 'Assigned Orders', icon: Package, badge: 3 },
    { key: 'delivery-tracking', name: 'Delivery Tracking', icon: MapPin },
    { key: 'history', name: 'Delivery History', icon: History },
    { key: 'earnings', name: 'Earnings', icon: DollarSign },
    { key: 'profile', name: 'Profile', href: '/profile', icon: User },
  ].map(item => ({
    ...item,
    href: item.href || '#',
    onClick: () => !item.href && setActivePage(item.key)
  }));

  // 🏠 1. DASHBOARD HOME
  const DashboardHome = () => {
    const orders = ordersData?.data?.orders || [];
    const todayOrders = orders.filter(o => new Date(o.timeline?.assigned).toDateString() === new Date().toDateString());
    const assignedToday = todayOrders.length;
    const completedToday = todayOrders.filter(o => o.status === 'delivered').length;
    const pendingToday = todayOrders.filter(o => ['assigned', 'out_for_delivery'].includes(o.status)).length;

    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h1>

        {/* Today's Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-6">
            <Package className="h-8 w-8 text-primary-600 mb-2" />
            <p className="text-3xl font-bold text-primary-900">{assignedToday}</p>
            <p className="text-sm text-primary-700">Assigned Today</p>
          </div>

          <div className="bg-gradient-to-br from-success-50 to-success-100 rounded-lg p-6">
            <CheckCircle className="h-8 w-8 text-success-600 mb-2" />
            <p className="text-3xl font-bold text-success-900">{completedToday}</p>
            <p className="text-sm text-success-700">Completed Today</p>
          </div>

          <div className="bg-gradient-to-br from-warning-50 to-warning-100 rounded-lg p-6">
            <Clock className="h-8 w-8 text-warning-600 mb-2" />
            <p className="text-3xl font-bold text-warning-900">{pendingToday}</p>
            <p className="text-sm text-warning-700">Pending Deliveries</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => setActivePage('assigned-orders')}
            className="bg-white border-2 border-primary-200 hover:border-primary-400 rounded-lg p-6 text-left transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <Package className="h-8 w-8 text-primary-600" />
              <span className="bg-error-500 text-white text-sm rounded-full h-6 w-6 flex items-center justify-center">
                {pendingToday}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">View Assigned Orders</h3>
            <p className="text-sm text-gray-600">Start delivering pending orders</p>
          </button>

          <button
            onClick={() => setActivePage('history')}
            className="bg-white border-2 border-success-200 hover:border-success-400 rounded-lg p-6 text-left transition-all"
          >
            <History className="h-8 w-8 text-success-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">Delivery History</h3>
            <p className="text-sm text-gray-600">View completed deliveries</p>
          </button>
        </div>
      </div>
    );
  };

  // 📦 2. ASSIGNED ORDERS (Main Working Screen)
  const AssignedOrders = () => {
    const orders = ordersData?.data?.orders || [];
    const assignedOrders = orders.filter(o => ['assigned', 'out_for_delivery'].includes(o.status));

    if (ordersLoading) return <LoadingSpinner />;

    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Assigned Orders</h1>
        <p className="text-gray-600 mb-6">Your active delivery tasks</p>

        {assignedOrders.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No orders assigned</p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignedOrders.map((order) => (
              <div key={order._id} className="bg-white rounded-lg shadow-md border-l-4 border-primary-600 p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <Package className="h-5 w-5 text-primary-600" />
                      <span className="font-mono text-sm font-semibold text-gray-900">
                        #{order.orderNumber || order._id.slice(-8)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Order Value</p>
                    <p className="text-xl font-semibold text-primary-600">₹{order.items?.totalPrice || 0}</p>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-1">👤 {order.customer?.name || 'Customer'}</p>
                      <p className="text-sm text-gray-700 mb-2">
                        📍 {order.deliveryAddress?.street || 'Address not available'}, {order.deliveryAddress?.area || ''}
                      </p>
                      <p className="text-sm text-gray-700">📞 {order.customer?.phone || 'No phone'}</p>
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600">Provider</p>
                    <p className="font-medium text-gray-900">{order.provider?.businessName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Quantity</p>
                    <p className="font-medium text-gray-900">{order.items?.quantity || 0} cans</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Payment Method</p>
                    <p className="font-medium text-gray-900">{order.paymentMethod || 'Cash'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Payment Status</p>
                    <p className="font-medium text-gray-900">{order.paymentStatus || 'Pending'}</p>
                  </div>
                </div>

                {/* Special Instructions */}
                {order.deliveryNotes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-sm font-medium text-yellow-900">📝 Special Instructions:</p>
                    <p className="text-sm text-yellow-800">{order.deliveryNotes}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${order.deliveryAddress?.street || ''}`, '_blank')}
                    className="bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 flex items-center justify-center space-x-2"
                  >
                    <Navigation className="h-5 w-5" />
                    <span>Navigate</span>
                  </button>
                  
                  <button
                    onClick={() => window.location.href = `tel:${order.customer?.phone || ''}`}
                    className="bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center space-x-2"
                  >
                    <Phone className="h-5 w-5" />
                    <span>Call</span>
                  </button>

                  <button
                    onClick={() => markDeliveredMutation.mutate(order._id)}
                    disabled={markDeliveredMutation.isLoading}
                    className="bg-success-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-success-700 flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <CheckCircle className="h-5 w-5" />
                    <span>Delivered</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 🗺️ 3. DELIVERY TRACKING
  const DeliveryTracking = () => {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Delivery Tracking</h1>
        <p className="text-gray-600 mb-6">Real-time tracking (GPS integration coming soon)</p>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center mb-6">
            <div className="text-center">
              <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Map view will be available soon</p>
              <p className="text-sm text-gray-500 mt-2">GPS tracking integration in progress</p>
            </div>
          </div>

          {/* Current Route Status */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 mb-3">Current Route</h3>
            <div className="flex items-center space-x-3 text-sm">
              <div className="h-8 w-8 rounded-full bg-success-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-success-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Picked up from provider</p>
                <p className="text-xs text-gray-500">10:30 AM</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                <Truck className="h-5 w-5 text-primary-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Out for delivery</p>
                <p className="text-xs text-gray-500">Current status</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-400">Deliver to customer</p>
                <p className="text-xs text-gray-400">Pending</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 📜 4. DELIVERY HISTORY
  const DeliveryHistory = () => {
    const [dateFilter, setDateFilter] = useState('all');
    const orders = ordersData?.data?.orders || [];
    const completedOrders = orders.filter(o => o.status === 'delivered');

    if (ordersLoading) return <LoadingSpinner />;

    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Delivery History</h1>

        {/* Date Filter */}
        <div className="flex items-center space-x-4 mb-6">
          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <p className="text-sm text-gray-600">{completedOrders.length} deliveries completed</p>
        </div>

        {/* History List */}
        <div className="space-y-4">
          {completedOrders.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No delivery history</p>
            </div>
          ) : (
            completedOrders.map((order) => (
              <div key={order._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <CheckCircle className="h-5 w-5 text-success-600" />
                      <span className="font-mono text-sm font-semibold text-gray-900">
                        #{order.orderNumber || order._id.slice(-8)}
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800">
                        Delivered
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-1">{order.customer?.name}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(order.timeline?.delivered)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">₹{order.items?.totalPrice || 0}</p>
                    <p className="text-xs text-gray-600">{order.items?.quantity || 0} cans</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // 💰 5. EARNINGS (Optional Future Feature)
  const Earnings = () => {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Earnings</h1>
        <p className="text-gray-600 mb-6">Track your delivery earnings</p>

        {/* Earnings Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-success-50 to-success-100 rounded-lg p-6">
            <DollarSign className="h-8 w-8 text-success-600 mb-2" />
            <p className="text-3xl font-bold text-success-900">₹850</p>
            <p className="text-sm text-success-700">Today's Earnings</p>
          </div>

          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-6">
            <Calendar className="h-8 w-8 text-primary-600 mb-2" />
            <p className="text-3xl font-bold text-primary-900">₹5,240</p>
            <p className="text-sm text-primary-700">This Week</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
            <IndianRupee className="h-8 w-8 text-purple-600 mb-2" />
            <p className="text-3xl font-bold text-purple-900">₹18,750</p>
            <p className="text-sm text-purple-700">This Month</p>
          </div>
        </div>

        {/* Earnings Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Earnings Breakdown</h3>
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-900">
              💡 <strong>Note:</strong> Commission-based earnings system will be implemented based on provider agreements.
            </p>
          </div>
          
          <div className="space-y-3">
            {[
              { date: 'Today', deliveries: 12, amount: 850 },
              { date: 'Yesterday', deliveries: 15, amount: 1050 },
              { date: 'Jan 15, 2024', deliveries: 10, amount: 720 },
            ].map((record, idx) => (
              <div key={idx} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{record.date}</p>
                  <p className="text-sm text-gray-600">{record.deliveries} deliveries</p>
                </div>
                <p className="font-semibold text-success-600">₹{record.amount}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardHome />;
      case 'assigned-orders': return <AssignedOrders />;
      case 'delivery-tracking': return <DeliveryTracking />;
      case 'history': return <DeliveryHistory />;
      case 'earnings': return <Earnings />;
      default: return <DashboardHome />;
    }
  };

  return (
    <DashboardLayout navigation={navigation} activeTab={activePage}>
      {renderPage()}
    </DashboardLayout>
  );
};

export default DeliveryDashboard;
