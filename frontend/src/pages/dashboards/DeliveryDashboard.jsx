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
  const { data: ordersData, isLoading: ordersLoading } = useQuery(
    'delivery-orders', 
    () => deliveryApi.getAssignedOrders(),
    {
      onError: (error) => console.error('Error fetching assigned orders:', error)
    }
  );

  const { data: historyData, isLoading: historyLoading } = useQuery(
    'delivery-history',
    () => deliveryApi.getDeliveryHistory(),
    {
      onError: (error) => console.error('Error fetching delivery history:', error)
    }
  );

  // Mutation to update delivery status
  const updateStatusMutation = useMutation(
    ({ orderId, status }) => deliveryApi.updateDeliveryStatus(orderId, status, ''),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('delivery-orders');
        queryClient.invalidateQueries('delivery-history');
        toast.success('Status updated!');
      },
      onError: () => toast.error('Failed to update status')
    }
  );

  const markDeliveredMutation = useMutation(
    (orderId) => deliveryApi.markAsDelivered(orderId, ''),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('delivery-orders');
        queryClient.invalidateQueries('delivery-history');
        toast.success('Order marked as delivered!');
      },
      onError: () => toast.error('Failed to update order')
    }
  );

  // Calculate pending orders count for badge
  const orders = Array.isArray(ordersData?.data) ? ordersData.data : [];
  const pendingOrdersCount = orders.filter(o => ['assigned', 'out_for_delivery'].includes(o.status)).length;

  const navigation = [
    { key: 'dashboard', name: 'Dashboard Home', icon: HomeIcon },
    { key: 'assigned-orders', name: 'Assigned Orders', icon: Package, badge: pendingOrdersCount },
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
    const orders = Array.isArray(ordersData?.data) ? ordersData.data : [];
    const completedOrders = Array.isArray(historyData?.data?.orders) ? historyData.data.orders : [];
    
    // Get today's date string for comparison
    const today = new Date().toDateString();
    
    // ALL orders delivered today (regardless of when assigned)
    const completedToday = completedOrders.filter(o => {
      if (!o.timeline?.delivered) return false;
      return new Date(o.timeline.delivered).toDateString() === today;
    }).length;
    
    // Pending deliveries assigned today
    const pendingAssignedToday = orders.filter(o => {
      if (!o.timeline?.assigned) return false;
      return new Date(o.timeline.assigned).toDateString() === today;
    }).length;
    
    // Total assigned today = completed today + pending today
    const assignedToday = completedToday + pendingAssignedToday;
    
    // All pending deliveries (assigned + out_for_delivery)
    const pendingDeliveries = orders.length;

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
            <p className="text-3xl font-bold text-warning-900">{pendingAssignedToday}</p>
            <p className="text-sm text-warning-700">Pending (Assigned Today)</p>
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
                {pendingDeliveries}
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
    const orders = Array.isArray(ordersData?.data) ? ordersData.data : [];
    const assignedOrders = orders.filter(o => ['assigned', 'out_for_delivery'].includes(o.status));

    // Helper to construct Google Maps URL with coordinates or address
    const getMapUrl = (address, coords) => {
      if (coords?.latitude && coords?.longitude) {
        return `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}&z=15&output=embed`;
      }
      const fullAddress = `${address?.street || ''}, ${address?.area || ''}, ${address?.city || ''}, ${address?.pincode || ''}`.trim();
      return `https://www.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed`;
    };

    const getNavigationUrl = (address, coords) => {
      if (coords?.latitude && coords?.longitude) {
        return `https://www.google.com/maps/dir/?api=1&destination=${coords.latitude},${coords.longitude}`;
      }
      const fullAddress = `${address?.street || ''}, ${address?.area || ''}, ${address?.city || ''}, ${address?.pincode || ''}`.trim();
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;
    };

    if (ordersLoading) return <LoadingSpinner />;

    return (
      <div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Assigned Orders</h1>
        <p className="text-sm text-gray-600 mb-3">Your active delivery tasks</p>

        {assignedOrders.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Package className="h-10 w-10 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No orders assigned</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignedOrders.map((order) => {
              const fullAddress = `${order.deliveryAddress?.street || ''}, ${order.deliveryAddress?.area || ''}`.trim();
              
              return (
                <div key={order._id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
                  {/* Order Header - Sleek Design */}
                  <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="bg-white/20 backdrop-blur-sm rounded-md px-2 py-1">
                        <span className="font-mono text-xs font-bold text-white">
                          #{order.orderNumber || order._id.slice(-8)}
                        </span>
                      </div>
                      <span className="bg-white/90 text-primary-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">₹{order.items?.totalPrice || 0}</p>
                    </div>
                  </div>

                  <div className="p-4">
                    {/* Main Content Grid: Info on Left, Map on Right */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                      {/* Left Side: Customer Info (3/5 width) */}
                      <div className="lg:col-span-3 space-y-3">
                        {/* Customer Name - Clean Design */}
                        <div className="flex items-center space-x-2">
                          <div className="bg-primary-100 rounded-full p-2">
                            <User className="h-4 w-4 text-primary-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Customer</p>
                            <h3 className="text-base font-bold text-gray-900">
                              {order.customerId?.name || 'Customer'}
                            </h3>
                          </div>
                        </div>

                        {/* Address - Modern Card */}
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200">
                          <div className="flex items-start space-x-2">
                            <MapPin className="h-4 w-4 text-primary-600 mt-1 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Delivery Location</p>
                              <p className="text-sm font-medium text-gray-900 leading-relaxed">
                                {fullAddress}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                {order.deliveryAddress?.city}, {order.deliveryAddress?.pincode}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Phone - Elegant Design */}
                        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center space-x-2">
                            <div className="bg-green-100 rounded-full p-2">
                              <Phone className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Contact</p>
                              <a 
                                href={`tel:${order.customerId?.phone || ''}`}
                                className="text-sm font-bold text-gray-900 hover:text-primary-600 transition-colors"
                              >
                                {order.customerId?.phone || 'No phone'}
                              </a>
                            </div>
                          </div>
                          <button
                            onClick={() => window.location.href = `tel:${order.customerId?.phone || ''}`}
                            className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 transition-colors"
                          >
                            <Phone className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Order Details - Compact Grid */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-white border border-gray-200 rounded-lg p-2">
                            <p className="text-xs text-gray-500">Provider</p>
                            <p className="text-sm font-semibold text-gray-900 truncate">{order.providerId?.businessName || 'N/A'}</p>
                          </div>
                          <div className="bg-white border border-gray-200 rounded-lg p-2">
                            <p className="text-xs text-gray-500">Quantity</p>
                            <p className="text-sm font-semibold text-gray-900">{order.items?.quantity || 0} cans</p>
                          </div>
                          <div className="bg-white border border-gray-200 rounded-lg p-2">
                            <p className="text-xs text-gray-500">Payment</p>
                            <p className="text-sm font-semibold text-gray-900">
                              {order.paymentMethod === 'cash_on_delivery' ? 'COD' : order.paymentMethod || 'Cash'}
                            </p>
                          </div>
                          <div className="bg-white border border-gray-200 rounded-lg p-2">
                            <p className="text-xs text-gray-500">Status</p>
                            <p className={`text-sm font-semibold ${
                              order.paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'
                            }`}>
                              {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                            </p>
                          </div>
                        </div>

                        {/* Special Instructions - If exists */}
                        {order.specialInstructions && (
                          <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-lg p-3">
                            <p className="text-xs font-semibold text-amber-800 mb-1">📝 Special Instructions</p>
                            <p className="text-sm text-amber-900">{order.specialInstructions}</p>
                          </div>
                        )}
                      </div>

                      {/* Right Side: Map (2/5 width) */}
                      <div className="lg:col-span-2">
                        <div className="bg-gray-100 rounded-lg overflow-hidden border border-gray-200 h-full min-h-[280px] shadow-inner">
                          <iframe
                            width="100%"
                            height="100%"
                            style={{ border: 0, minHeight: '280px' }}
                            loading="lazy"
                            allowFullScreen
                            referrerPolicy="no-referrer-when-downgrade"
                            src={getMapUrl(order.deliveryAddress, order.deliveryAddress?.coordinates)}
                            title="Delivery Location"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons - Modern Design */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button
                        onClick={() => window.open(getNavigationUrl(order.deliveryAddress, order.deliveryAddress?.coordinates), '_blank')}
                        className="bg-primary-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary-700 flex items-center justify-center space-x-2 transition-all hover:scale-105"
                      >
                        <Navigation className="h-4 w-4" />
                        <span>Navigate</span>
                      </button>

                      {order.status === 'assigned' ? (
                        <button
                          onClick={() => updateStatusMutation.mutate({ orderId: order._id, status: 'out_for_delivery' })}
                          disabled={updateStatusMutation.isLoading}
                          className="bg-amber-500 text-white py-3 px-4 rounded-lg font-semibold hover:bg-amber-600 flex items-center justify-center space-x-2 disabled:opacity-50 transition-all hover:scale-105"
                        >
                          <Truck className="h-4 w-4" />
                          <span>Start Delivery</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => markDeliveredMutation.mutate(order._id)}
                          disabled={markDeliveredMutation.isLoading}
                          className="bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 flex items-center justify-center space-x-2 disabled:opacity-50 transition-all hover:scale-105"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>Mark Delivered</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
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
    const [dateFilter, setDateFilter] = useState('today');
    const allCompletedOrders = Array.isArray(historyData?.data?.orders) ? historyData.data.orders : [];

    // Filter orders based on selected time period
    const getFilteredOrders = () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      switch (dateFilter) {
        case 'today':
          return allCompletedOrders.filter(order => {
            const deliveryDate = order.timeline?.delivered ? new Date(order.timeline.delivered) : null;
            return deliveryDate && deliveryDate >= today;
          });
        case 'week':
          return allCompletedOrders.filter(order => {
            const deliveryDate = order.timeline?.delivered ? new Date(order.timeline.delivered) : null;
            return deliveryDate && deliveryDate >= weekAgo;
          });
        case 'month':
          return allCompletedOrders.filter(order => {
            const deliveryDate = order.timeline?.delivered ? new Date(order.timeline.delivered) : null;
            return deliveryDate && deliveryDate >= monthStart;
          });
        case 'all':
        default:
          return allCompletedOrders;
      }
    };

    const completedOrders = getFilteredOrders();

    // Calculate total earnings for filtered period
    const totalEarnings = completedOrders.reduce((sum, order) => sum + (order.items?.totalPrice || 0), 0);

    if (historyLoading) return <LoadingSpinner />;

    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Delivery History</h1>

        {/* Date Filter */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <select 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 font-medium"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">{completedOrders.length}</span> deliveries completed
            </p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg px-4 py-2 border border-green-200">
            <p className="text-xs text-green-700 font-medium">Total Earnings</p>
            <p className="text-lg font-bold text-green-900">₹{totalEarnings.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* History List */}
        <div className="space-y-3">
          {completedOrders.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No deliveries found for this period</p>
            </div>
          ) : (
            completedOrders.map((order) => (
              <div key={order._id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="bg-white/20 backdrop-blur-sm rounded-md px-2 py-1">
                      <span className="font-mono text-xs font-bold text-white">
                        #{order.orderNumber || order._id.slice(-8)}
                      </span>
                    </div>
                    <div className="bg-white/90 text-green-700 px-2 py-0.5 rounded-full flex items-center space-x-1">
                      <CheckCircle className="h-3 w-3" />
                      <span className="text-xs font-semibold">Delivered</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">₹{order.items?.totalPrice || 0}</p>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Left: Customer & Time Info */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="bg-blue-100 rounded-full p-2">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Customer</p>
                          <p className="text-sm font-bold text-gray-900">{order.customerId?.name}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className="bg-purple-100 rounded-full p-2">
                          <Clock className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Delivered At</p>
                          <p className="text-sm font-medium text-gray-900">{formatDateTime(order.timeline?.delivered)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Right: Order Details */}
                    <div className="space-y-2">
                      <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                        <p className="text-xs text-gray-500">Quantity</p>
                        <p className="text-sm font-semibold text-gray-900">{order.items?.quantity || 0} cans</p>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                        <p className="text-xs text-gray-500">Provider</p>
                        <p className="text-sm font-semibold text-gray-900">{order.providerId?.businessName || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  {order.deliveryAddress && (
                    <div className="mt-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-primary-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Delivery Location</p>
                          <p className="text-sm text-gray-900">
                            {order.deliveryAddress?.street}, {order.deliveryAddress?.area}, {order.deliveryAddress?.city} - {order.deliveryAddress?.pincode}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
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
    // Get delivered orders from both assigned orders and history
    const assignedOrders = Array.isArray(ordersData?.data) ? ordersData.data : [];
    const historyOrders = Array.isArray(historyData?.data?.orders) ? historyData.data.orders : [];
    
    // Combine and filter for delivered orders only
    const allOrders = [...assignedOrders, ...historyOrders];
    const deliveredOrders = allOrders.filter(o => o.status === 'delivered');

    // Debug logging
    console.log('Earnings Debug:', {
      assignedOrdersCount: assignedOrders.length,
      historyOrdersCount: historyOrders.length,
      deliveredOrdersCount: deliveredOrders.length,
      deliveredOrders: deliveredOrders.map(o => ({
        id: o._id,
        totalPrice: o.items?.totalPrice,
        delivered: o.timeline?.delivered
      }))
    });

    // Calculate earnings
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Helper to get delivery date
    const getDeliveryDate = (order) => {
      return order.timeline?.delivered ? new Date(order.timeline.delivered) : null;
    };

    // Filter by time period
    const todayDeliveries = deliveredOrders.filter(o => {
      const deliveryDate = getDeliveryDate(o);
      return deliveryDate && deliveryDate >= today;
    });

    const weekDeliveries = deliveredOrders.filter(o => {
      const deliveryDate = getDeliveryDate(o);
      return deliveryDate && deliveryDate >= weekAgo;
    });

    const monthDeliveries = deliveredOrders.filter(o => {
      const deliveryDate = getDeliveryDate(o);
      return deliveryDate && deliveryDate >= monthStart;
    });

    // Calculate total amounts
    const todayEarnings = todayDeliveries.reduce((sum, o) => sum + (o.items?.totalPrice || 0), 0);
    const weekEarnings = weekDeliveries.reduce((sum, o) => sum + (o.items?.totalPrice || 0), 0);
    const monthEarnings = monthDeliveries.reduce((sum, o) => sum + (o.items?.totalPrice || 0), 0);

    // Group deliveries by date for breakdown
    const deliveryBreakdown = {};
    deliveredOrders.forEach(order => {
      const deliveryDate = getDeliveryDate(order);
      if (!deliveryDate) return;
      
      const dateKey = deliveryDate.toLocaleDateString('en-IN');
      if (!deliveryBreakdown[dateKey]) {
        deliveryBreakdown[dateKey] = {
          date: deliveryDate,
          deliveries: 0,
          amount: 0,
          orders: []
        };
      }
      deliveryBreakdown[dateKey].deliveries++;
      deliveryBreakdown[dateKey].amount += (order.items?.totalPrice || 0);
      deliveryBreakdown[dateKey].orders.push(order);
    });

    // Sort by date (most recent first)
    const sortedBreakdown = Object.values(deliveryBreakdown)
      .sort((a, b) => b.date - a.date)
      .slice(0, 10); // Show last 10 days

    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Earnings</h1>
        <p className="text-gray-600 mb-6">Track your delivery earnings</p>

        {/* Earnings Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-success-50 to-success-100 rounded-lg p-6">
            <DollarSign className="h-8 w-8 text-success-600 mb-2" />
            <p className="text-3xl font-bold text-success-900">₹{todayEarnings}</p>
            <p className="text-sm text-success-700">Today's Earnings</p>
            <p className="text-xs text-success-600 mt-1">{todayDeliveries.length} deliveries</p>
          </div>

          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-6">
            <Calendar className="h-8 w-8 text-primary-600 mb-2" />
            <p className="text-3xl font-bold text-primary-900">₹{weekEarnings.toLocaleString('en-IN')}</p>
            <p className="text-sm text-primary-700">This Week</p>
            <p className="text-xs text-primary-600 mt-1">{weekDeliveries.length} deliveries</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
            <IndianRupee className="h-8 w-8 text-purple-600 mb-2" />
            <p className="text-3xl font-bold text-purple-900">₹{monthEarnings.toLocaleString('en-IN')}</p>
            <p className="text-sm text-purple-700">This Month</p>
            <p className="text-xs text-purple-600 mt-1">{monthDeliveries.length} deliveries</p>
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
          
          {sortedBreakdown.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No deliveries completed yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedBreakdown.map((record, idx) => {
                const dateLabel = record.date.toDateString() === today.toDateString() 
                  ? 'Today' 
                  : record.date.toDateString() === new Date(today.getTime() - 24 * 60 * 60 * 1000).toDateString()
                  ? 'Yesterday'
                  : record.date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });

                return (
                  <div key={idx} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="font-medium text-gray-900">{dateLabel}</p>
                      <p className="text-sm text-gray-600">{record.deliveries} deliveries</p>
                    </div>
                    <p className="font-semibold text-success-600">₹{record.amount.toLocaleString('en-IN')}</p>
                  </div>
                );
              })}
            </div>
          )}
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
