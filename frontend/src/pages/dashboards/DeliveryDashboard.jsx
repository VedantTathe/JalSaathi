import React, { useState, useEffect, useRef } from 'react';
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
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmOrderId, setConfirmOrderId] = useState(null);
  const confirmButtonRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') setConfirmModalOpen(false);
    };
    if (confirmModalOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [confirmModalOpen]);

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
    { key: 'stats', name: 'Stats', icon: Calendar },
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

        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
    const assignedOrders = Array.isArray(ordersData?.data) ? ordersData.data.filter(o => ['assigned', 'out_for_delivery', 'pending'].includes(o.status)) : [];

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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Assigned Orders</h1>
            <p className="text-sm text-gray-600">Clear, concise view of your active deliveries</p>
          </div>
          <div className="text-sm text-gray-500">{assignedOrders.length} active</div>
        </div>

        {assignedOrders.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Package className="h-10 w-10 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No orders assigned</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignedOrders.map((order) => (
              <div key={order._id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden p-4">
                <div className="lg:flex lg:items-center lg:justify-between">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Customer</p>
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{order.customerId?.name || 'Customer'}</h3>
                      <p className="text-xs text-gray-500 truncate">{order.deliveryAddress?.street || order.deliveryAddress?.area || ''} • {order.deliveryAddress?.city || ''} {order.deliveryAddress?.pincode || ''}</p>
                    </div>
                  </div>

                  <div className="mt-3 lg:mt-0 flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Order</p>
                      <p className="text-sm font-mono text-gray-900">#{order.orderNumber || order._id.slice(-8)}</p>
                    </div>

                    <div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Package className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-xs text-gray-500">Provider</div>
                      <div className="text-sm font-medium text-gray-900 truncate">{order.providerId?.businessName || 'N/A'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-xs text-gray-500">Assigned</div>
                      <div className="text-sm text-gray-900">{formatDateTime(order.timeline?.assigned)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-xs text-gray-500">Contact</div>
                      <a href={`tel:${order.customerId?.phone || ''}`} className="text-sm font-medium text-primary-600">{order.customerId?.phone || 'No phone'}</a>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-3">
                  <button
                    onClick={() => window.open(getNavigationUrl(order.deliveryAddress, order.deliveryAddress?.coordinates), '_blank')}
                    className="bg-white border border-primary-200 text-primary-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-primary-50 transition-colors"
                    aria-label={`Navigate to ${order.customerId?.name || 'customer'}`}
                  >
                    <Navigation className="h-4 w-4 inline-block mr-2" />
                    Navigate
                  </button>

                  <button
                    onClick={() => { setConfirmOrderId(order._id); setConfirmModalOpen(true); }}
                    disabled={markDeliveredMutation.isLoading}
                    className="bg-green-600 text-white py-2 px-3 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                    aria-label={`Mark order ${order.orderNumber || order._id.slice(-8)} as delivered`}
                  >
                    <CheckCircle className="h-4 w-4 inline-block mr-2" />
                    Mark Delivered
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

  // 📊 5. STATS - show counts instead of earnings
  const Stats = () => {
    const assignedOrders = Array.isArray(ordersData?.data) ? ordersData.data : [];
    const historyOrders = Array.isArray(historyData?.data?.orders) ? historyData.data.orders : [];

    const allOrders = [...assignedOrders, ...historyOrders];
    const deliveredOrders = allOrders.filter(o => o.status === 'delivered');

    const today = new Date().toDateString();
    const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

    const deliveredToday = deliveredOrders.filter(o => o.timeline?.delivered && new Date(o.timeline.delivered).toDateString() === today).length;
    const totalDelivered = deliveredOrders.length;

    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Stats</h1>
        <p className="text-gray-600 mb-6">Delivery counts (no monetary data)</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-6">
            <Calendar className="h-8 w-8 text-primary-600 mb-2" />
            <p className="text-3xl font-bold text-primary-900">{deliveredToday}</p>
            <p className="text-sm text-primary-700">Delivered Today</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
            <Package className="h-8 w-8 text-purple-600 mb-2" />
            <p className="text-3xl font-bold text-purple-900">{totalDelivered}</p>
            <p className="text-sm text-purple-700">Total Delivered</p>
          </div>
        </div>

        {/* Date grouped history: show recent days with delivered counts */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-semibold mb-3">Delivery History by Date</h3>
          <div className="space-y-2">
            {
              // Group delivered orders by date string
            }
            {(() => {
              const groups = {};
              deliveredOrders.forEach((o) => {
                if (!o.timeline?.delivered) return;
                const d = new Date(o.timeline.delivered);
                const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
                if (!groups[key]) groups[key] = { date: new Date(d.getFullYear(), d.getMonth(), d.getDate()), count: 0 };
                groups[key].count++;
              });

              const sorted = Object.values(groups).sort((a, b) => b.date - a.date).slice(0, 14);

              if (sorted.length === 0) {
                return (
                  <div className="text-center py-6 text-sm text-gray-600">No deliveries yet</div>
                );
              }

              return sorted.map((g) => {
                const todayLabel = new Date().toDateString();
                const yesterdayLabel = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
                const label = g.date.toDateString() === todayLabel ? 'Today' : (g.date.toDateString() === yesterdayLabel ? 'Yesterday' : g.date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }));
                return (
                  <div key={g.date.toISOString()} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                    <div className="text-sm text-gray-700">{label}</div>
                    <div className="text-sm font-semibold text-gray-900">{g.count} deliveries</div>
                  </div>
                );
              });
            })()}
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
      case 'stats': return <Stats />;
      default: return <DashboardHome />;
    }
  };

  return (
    <DashboardLayout navigation={navigation} activeTab={activePage}>
      {renderPage()}

      {/* Confirmation modal for marking delivered */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black opacity-40" onClick={() => setConfirmModalOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full p-6 z-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Confirm Delivery</h2>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to mark this order as delivered? This action cannot be undone.</p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="bg-white border border-gray-200 py-2 px-3 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                ref={confirmButtonRef}
                onClick={() => {
                  if (!confirmOrderId) return;
                  markDeliveredMutation.mutate(confirmOrderId, {
                    onSettled: () => {
                      setConfirmModalOpen(false);
                      setConfirmOrderId(null);
                    }
                  });
                }}
                className="bg-green-600 text-white py-2 px-3 rounded-lg text-sm font-semibold hover:bg-green-700"
              >
                Yes, mark delivered
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DeliveryDashboard;
