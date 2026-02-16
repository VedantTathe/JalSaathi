import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Home as HomeIcon, Package, Truck, Users, History, TrendingUp, UserCircle,
  Settings, CheckCircle, XCircle, Clock, IndianRupee, Phone, MapPin,
  Calendar, Filter, Plus, Edit2, Trash2, BarChart3, DollarSign, Power,
  ChevronDown, ChevronUp
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { providerApi, orderApi, authApi } from '../../services/api';
import { formatCurrency, formatDateTime, getStatusColor, getStatusText } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix default marker icon issues in many build setups
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

const ProviderDashboard = () => {
  const queryClient = useQueryClient();
  const [activePage, setActivePage] = useState('dashboard');
  const [isOnline, setIsOnline] = useState(true);

  // Fetch data
  const { data: ordersData, isLoading: ordersLoading } = useQuery('provider-orders', () => providerApi.getOrders());
  const { data: customersData, isLoading: customersLoading } = useQuery('provider-customers', () => providerApi.getCustomers());
  const { data: deliveryBoysData, isLoading: deliveryBoysLoading } = useQuery('provider-delivery-boys', () => providerApi.getDeliveryBoys());
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery('provider-analytics', () => providerApi.getAnalytics());
  const { data: historyData, isLoading: historyLoading } = useQuery('provider-history', () => providerApi.getHistory());
  const { data: profileData } = useQuery('auth-profile', () => authApi.getProfile());

  useEffect(() => {
    // Initialize isOnline from profile if available
    const p = profileData?.data;
    if (p) {
      // provider info may be nested or at top-level depending on API
      const online = p.isOnline ?? p.provider?.isOnline;
      if (typeof online === 'boolean') setIsOnline(online);
    }
  }, [profileData]);

  

  // Mutation to cancel an order (provider action)
  const cancelOrderMutation = useMutation(
    (orderId) => orderApi.cancelOrder(orderId, 'Cancelled by provider'),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('provider-orders');
        toast.success('Order cancelled');
      },
      onError: () => toast.error('Failed to cancel order')
    }
  );

  // Bulk assign mutation
  const assignManyMutation = useMutation(
    ({ orderIds, deliveryBoyId }) => Promise.all(orderIds.map(id => providerApi.assignDeliveryBoy(id, deliveryBoyId))),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('provider-orders');
        toast.success('Assigned delivery partner');
      },
      onError: () => toast.error('Failed to assign delivery partner')
    }
  );

  // Delivery boy mutations
  const addDeliveryBoyMutation = useMutation(
    (data) => providerApi.addDeliveryBoy(data),
    {
      onSuccess: (res) => {
        queryClient.invalidateQueries('provider-delivery-boys');
        const generated = res?.data?.generatedPassword || res?.generatedPassword;
        if (generated) toast.success(`Delivery boy added — password: ${generated}`);
        else toast.success('Delivery boy added');
      },
      onError: () => toast.error('Failed to add delivery boy')
    }
  );

  const removeDeliveryBoyMutation = useMutation(
    (deliveryBoyId) => providerApi.removeDeliveryBoy(deliveryBoyId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('provider-delivery-boys');
        toast.success('Delivery boy removed');
      },
      onError: () => toast.error('Failed to remove delivery boy')
    }
  );

  // Toggle online status mutation
  const toggleOnlineMutation = useMutation(() => providerApi.toggleOnlineStatus(), {
    onSuccess: (res) => {
      const isOn = res?.data?.isOnline ?? res?.isOnline ?? false;
      setIsOnline(isOn);
      queryClient.invalidateQueries('provider-analytics');
      toast.success('Provider status updated');
    },
    onError: () => toast.error('Failed to update status')
  });

  const navigation = [
    { key: 'dashboard', name: 'Dashboard Home', icon: HomeIcon },
    { key: 'active-orders', name: 'View Orders', icon: Clock },
    { key: 'delivery-management', name: 'Delivery Boys', icon: Truck },
    { key: 'history', name: 'History & Revenue', icon: History },
    { key: 'customers', name: 'Customer List', icon: Users },
    { key: 'settings', name: 'Provider Settings', icon: Settings },
  ].map(item => ({
    ...item,
    href: '#',
    onClick: () => setActivePage(item.key)
  }));

  // 🏠 1. DASHBOARD HOME
  const DashboardHome = () => {
    const orders = ordersData?.data?.orders || [];
    const todayOrders = orders.filter(o => new Date(o.timeline?.ordered).toDateString() === new Date().toDateString());
    const activeOrders = orders.filter(o => ['accepted', 'assigned', 'out_for_delivery'].includes(o.status)).length;
    const completedToday = todayOrders.filter(o => o.status === 'delivered').length;
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.items?.totalPrice || 0), 0);
    const totalRevenue = analyticsData?.data?.monthlyRevenue ?? 0;

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          
          {/* IMPORTANT: Online/Offline Toggle */}
          <button
            onClick={() => toggleOnlineMutation.mutate()}
            disabled={toggleOnlineMutation.isLoading}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              isOnline 
                ? 'bg-success-100 text-success-700 hover:bg-success-200' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } ${toggleOnlineMutation.isLoading ? 'opacity-70 cursor-wait' : ''}`}
          >
            <Power className="h-5 w-5" />
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </button>
        </div>

        {/* Analytics Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Pending Orders widget removed per request */}

          <div className="bg-gradient-to-br from-warning-50 to-warning-100 rounded-lg p-6">
            <Clock className="h-8 w-8 text-warning-600 mb-2" />
            <p className="text-2xl font-bold text-warning-900">{activeOrders}</p>
            <p className="text-sm text-warning-700">Active Orders</p>
          </div>

          <div className="bg-gradient-to-br from-success-50 to-success-100 rounded-lg p-6">
            <CheckCircle className="h-8 w-8 text-success-600 mb-2" />
            <p className="text-2xl font-bold text-success-900">{completedToday}</p>
            <p className="text-sm text-success-700">Completed Today</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
            <IndianRupee className="h-8 w-8 text-purple-600 mb-2" />
            <p className="text-2xl font-bold text-purple-900">₹{todayRevenue}</p>
            <p className="text-sm text-purple-700">Today's Revenue</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button
            onClick={() => setActivePage('active-orders')}
            className="bg-white border-2 border-primary-200 hover:border-primary-400 rounded-lg p-6 text-left transition-all"
          >
            <Package className="h-8 w-8 text-primary-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">View Orders</h3>
            <p className="text-sm text-gray-600">Manage received orders</p>
          </button>

          <button
            onClick={() => setActivePage('revenue')}
            className="bg-white border-2 border-success-200 hover:border-success-400 rounded-lg p-6 text-left transition-all"
          >
            <TrendingUp className="h-8 w-8 text-success-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">View Revenue</h3>
            <p className="text-sm text-gray-600">Check earnings and analytics</p>
          </button>
        </div>
      </div>
    );
  };

  // 🕐 2. VIEW ORDERS (shows ALL orders from last 16 hours including delivered)
  const ActiveOrders = () => {
    const orders = ordersData?.data?.orders || [];
    // Show ALL orders (including delivered) - backend already filters to last 16 hours
    const allOrders = orders;

    const [selectedOrders, setSelectedOrders] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Filter orders by status
    const filteredOrders = statusFilter === 'all' 
      ? allOrders 
      : allOrders.filter(o => o.status === statusFilter);

    if (ordersLoading) return <LoadingSpinner />;

    const toggleSelect = (orderId) => {
      const next = new Set(selectedOrders);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      setSelectedOrders(next);
      // Only count assignable orders for select all
      const assignableOrders = filteredOrders.filter(o => ['accepted', 'assigned', 'out_for_delivery'].includes(o.status));
      setSelectAll(next.size === assignableOrders.length && assignableOrders.length > 0);
    };

    const handleSelectAll = () => {
      if (selectAll) {
        setSelectedOrders(new Set());
        setSelectAll(false);
      } else {
        // Only select assignable orders (not delivered/cancelled)
        const assignableIds = filteredOrders
          .filter(o => ['accepted', 'assigned', 'out_for_delivery'].includes(o.status))
          .map(o => o._id);
        setSelectedOrders(new Set(assignableIds));
        setSelectAll(true);
      }
    };

    const handleAssign = () => {
      if (!selectedDeliveryBoy) return toast.error('Select a delivery partner');
      const orderIds = Array.from(selectedOrders);
      if (orderIds.length === 0) return toast.error('Select orders to assign');
      assignManyMutation.mutate({ orderIds, deliveryBoyId: selectedDeliveryBoy });
      setAssignModalOpen(false);
      setSelectedOrders(new Set());
      setSelectAll(false);
    };

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">View Orders</h1>
            <p className="text-sm text-gray-500">Showing orders from last 16 hours</p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Status Filter */}
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Status ({allOrders.length})</option>
              <option value="pending">Pending ({allOrders.filter(o => o.status === 'pending').length})</option>
              <option value="accepted">Accepted ({allOrders.filter(o => o.status === 'accepted').length})</option>
              <option value="assigned">Assigned ({allOrders.filter(o => o.status === 'assigned').length})</option>
              <option value="out_for_delivery">Out for Delivery ({allOrders.filter(o => o.status === 'out_for_delivery').length})</option>
              <option value="delivered">Delivered ({allOrders.filter(o => o.status === 'delivered').length})</option>
              <option value="cancelled">Cancelled ({allOrders.filter(o => o.status === 'cancelled').length})</option>
            </select>
            <label className="inline-flex items-center">
              <input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="mr-2" />
              <span className="text-sm text-gray-600">Select All</span>
            </label>
            <button
              onClick={() => setAssignModalOpen(true)}
              disabled={selectedOrders.size === 0}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              Assign Partner
            </button>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No orders found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const isAssignable = ['accepted', 'assigned', 'out_for_delivery'].includes(order.status);
              return (
              <div key={order._id} className={`bg-white rounded-lg shadow-sm border p-6 ${order.status === 'delivered' ? 'border-success-300 bg-success-50' : order.status === 'cancelled' ? 'border-error-300 bg-error-50' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {isAssignable && (
                      <input type="checkbox" checked={selectedOrders.has(order._id)} onChange={() => toggleSelect(order._id)} className="h-4 w-4" />
                    )}
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <Package className="h-5 w-5 text-gray-400" />
                        <span className="font-mono text-sm text-gray-600">#{order.orderNumber || order._id.slice(-8)}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{formatDateTime(order.timeline?.ordered || order.createdAt)}</p>
                    </div>
                  </div>
                  <p className="text-xl font-semibold text-primary-600">₹{order.items?.totalPrice || 0}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600">Customer</p>
                    <p className="font-medium text-gray-900">{order.customerId?.name || order.customer?.name || 'N/A'}</p>
                    <p className="text-xs text-gray-600">{order.customerId?.phone || order.customer?.phone || ''}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Quantity</p>
                    <p className="font-medium text-gray-900">{order.items?.quantity || 0} cans</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Delivery Partner</p>
                    {order.deliveryBoyId ? (
                      <p className="font-medium text-success-600">{order.deliveryBoyId?.name || order.deliveryBoy?.name || 'Assigned'}</p>
                    ) : (
                      <p className="text-sm text-warning-600">Not assigned</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Payment</p>
                    <p className={`font-medium ${order.paymentStatus === 'paid' ? 'text-success-600' : 'text-warning-600'}`}>
                      {order.paymentStatus === 'paid' ? '✓ Paid' : 'Pending'}
                    </p>
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-600 mb-1">Delivery Address</p>
                  <p className="text-sm text-gray-900">
                    {order.deliveryAddress?.street || ''}{order.deliveryAddress?.street ? ', ' : ''}
                    {order.deliveryAddress?.area || ''}{order.deliveryAddress?.area ? ', ' : ''}
                    {order.deliveryAddress?.city || ''}{order.deliveryAddress?.city ? ' - ' : ''}
                    {order.deliveryAddress?.pincode || ''}
                    {!order.deliveryAddress?.street && !order.deliveryAddress?.area && 'Address not available'}
                  </p>
                </div>

                {isAssignable && (
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        if (!window.confirm('Are you sure you want to cancel this order?')) return;
                        cancelOrderMutation.mutate(order._id);
                      }}
                      disabled={cancelOrderMutation.isLoading}
                      className="bg-error-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-error-700 disabled:opacity-50"
                    >
                      Cancel Order
                    </button>

                    {!order.deliveryBoyId && order.status === 'accepted' && (
                      <button
                        onClick={() => {
                          setSelectedOrders(new Set([order._id]));
                          setAssignModalOpen(true);
                        }}
                        className="bg-primary-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-700"
                      >
                        Assign Partner
                      </button>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}

        {/* Assign Modal */}
        {assignModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Assign Delivery Partner</h3>
              <select value={selectedDeliveryBoy} onChange={e => setSelectedDeliveryBoy(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4">
                <option value="">Select partner</option>
                {deliveryBoysData?.data?.map(db => (
                  <option key={db._id} value={db._id}>{db.name} - {db.phone}</option>
                ))}
              </select>

              <div className="flex justify-end space-x-3">
                <button onClick={() => setAssignModalOpen(false)} className="px-4 py-2 rounded-lg border">Cancel</button>
                <button onClick={handleAssign} className="px-4 py-2 rounded-lg bg-primary-600 text-white">Assign</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // (Old ActiveOrders removed — replaced by consolidated View Orders implementation above)

  // 🚚 4. DELIVERY BOYS
  const DeliveryBoys = () => {
    const [showAddModal, setShowAddModal] = useState(false);
      const [newBoy, setNewBoy] = useState({ name: '', phone: '', email: '', password: '' });

    const boys = deliveryBoysData?.data || [];

    const handleAdd = () => {
      if (!newBoy.name || !newBoy.phone || !newBoy.password) return toast.error('Name, phone and password are required');

      // Send provided fields including password
      const payload = { name: newBoy.name, phone: newBoy.phone, password: newBoy.password };
      if (newBoy.email && newBoy.email.trim() !== '') payload.email = newBoy.email;

      addDeliveryBoyMutation.mutate(payload, {
        onSuccess: () => {
          setShowAddModal(false);
          setNewBoy({ name: '', phone: '', email: '', password: '' });
        }
      });
    };

    const handleRemove = (id) => {
      if (!window.confirm('Remove this delivery boy?')) return;
      removeDeliveryBoyMutation.mutate(id);
    };

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Delivery Boys</h1>
          <button onClick={() => setShowAddModal(true)} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Add Delivery Boy</span>
          </button>
        </div>

        {boys.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">No delivery boys assigned</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {boys.map((d) => (
              <div key={d._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
                      <Truck className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{d.name}</h3>
                      <p className="text-sm text-gray-600">{d.phone}</p>
                      {d.email && <p className="text-xs text-gray-500">{d.email}</p>}
                    </div>
                  </div>
                  <button onClick={() => handleRemove(d._id)} className="text-gray-400 hover:text-error-600 px-3">
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Add Delivery Boy</h3>
                <div className="space-y-3">
                <input value={newBoy.name} onChange={e => setNewBoy({...newBoy, name: e.target.value})} placeholder="Name" className="w-full border px-3 py-2 rounded-lg" />
                <input value={newBoy.phone} onChange={e => setNewBoy({...newBoy, phone: e.target.value})} placeholder="Phone" className="w-full border px-3 py-2 rounded-lg" />
                <input value={newBoy.email} onChange={e => setNewBoy({...newBoy, email: e.target.value})} placeholder="Email (optional)" className="w-full border px-3 py-2 rounded-lg" />
                <input type="password" value={newBoy.password} onChange={e => setNewBoy({...newBoy, password: e.target.value})} placeholder="Password" className="w-full border px-3 py-2 rounded-lg" />
              </div>
              <div className="flex justify-end space-x-3 mt-4">
                <button onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-lg border">Cancel</button>
                <button onClick={handleAdd} className="px-4 py-2 rounded-lg bg-primary-600 text-white">Add</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 📜 5. ORDER HISTORY & REVENUE (Combined)
  const OrderHistory = () => {
    const [expandedDay, setExpandedDay] = useState(null);
    
    const dailySummary = historyData?.data?.dailySummary || [];
    const overallStats = historyData?.data?.overallStats || {};

    if (historyLoading) return <LoadingSpinner />;

    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date.toDateString() === today.toDateString()) return 'Today';
      if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
      return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">History & Revenue</h1>

        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-success-50 to-success-100 rounded-lg p-4">
            <DollarSign className="h-6 w-6 text-success-600 mb-1" />
            <p className="text-xs text-success-700">Total Revenue</p>
            <p className="text-xl font-bold text-success-900">₹{overallStats.totalRevenue || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-4">
            <Package className="h-6 w-6 text-primary-600 mb-1" />
            <p className="text-xs text-primary-700">Total Orders</p>
            <p className="text-xl font-bold text-primary-900">{overallStats.totalOrders || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
            <CheckCircle className="h-6 w-6 text-blue-600 mb-1" />
            <p className="text-xs text-blue-700">Delivered</p>
            <p className="text-xl font-bold text-blue-900">{overallStats.deliveredOrders || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-warning-50 to-warning-100 rounded-lg p-4">
            <IndianRupee className="h-6 w-6 text-warning-600 mb-1" />
            <p className="text-xs text-warning-700">Paid Revenue</p>
            <p className="text-xl font-bold text-warning-900">₹{overallStats.paidRevenue || 0}</p>
          </div>
        </div>

        {/* Daily Summary Cards */}
        <div className="space-y-4">
          {dailySummary.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No order history found</p>
            </div>
          ) : (
            dailySummary.map((day) => (
              <div key={day.date} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Day Header - Clickable */}
                <button
                  onClick={() => setExpandedDay(expandedDay === day.date ? null : day.date)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">{formatDate(day.date)}</p>
                      <p className="text-sm text-gray-500">
                        {day.totalOrders} order{day.totalOrders !== 1 ? 's' : ''} • 
                        <span className="text-success-600"> {day.deliveredOrders} delivered</span>
                        {day.cancelledOrders > 0 && <span className="text-danger-600"> • {day.cancelledOrders} cancelled</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="font-bold text-success-600">₹{day.totalRevenue}</p>
                      <p className="text-xs text-gray-500">Revenue</p>
                    </div>
                    {expandedDay === day.date ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Expanded Orders List */}
                {expandedDay === day.date && (
                  <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
                    <div className="space-y-3">
                      {day.orders.map((order) => (
                        <div key={order._id} className="bg-white rounded-lg p-4 border border-gray-100 flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-medium text-gray-900">#{order.orderNumber || order._id.slice(-8)}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                                {getStatusText(order.status)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{order.customerName}</p>
                            <p className="text-xs text-gray-500">
                              {order.quantity} can{order.quantity !== 1 ? 's' : ''} • 
                              {order.paymentMethod === 'online' ? ' Online' : ' COD'} 
                              {order.paymentStatus === 'paid' && <span className="text-success-600"> (Paid)</span>}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(order.orderedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">₹{order.totalPrice}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // 💰 6. REVENUE DASHBOARD (uses same data as History)
  const RevenueDashboard = () => {
    const overallStats = historyData?.data?.overallStats || {};
    
    if (historyLoading) return <LoadingSpinner />;

    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Revenue Dashboard</h1>

        {/* Revenue Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-success-50 to-success-100 rounded-lg p-6">
            <DollarSign className="h-8 w-8 text-success-600 mb-2" />
            <p className="text-sm text-success-700 mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-success-900">₹{overallStats.totalRevenue || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-warning-50 to-warning-100 rounded-lg p-6">
            <IndianRupee className="h-8 w-8 text-warning-600 mb-2" />
            <p className="text-sm text-warning-700 mb-1">Paid Revenue</p>
            <p className="text-3xl font-bold text-warning-900">₹{overallStats.paidRevenue || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-6">
            <BarChart3 className="h-8 w-8 text-primary-600 mb-2" />
            <p className="text-sm text-primary-700 mb-1">Total Orders</p>
            <p className="text-3xl font-bold text-primary-900">{overallStats.totalOrders || 0}</p>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Delivered Orders</p>
            <p className="text-lg font-bold text-success-600">{overallStats.deliveredOrders || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Paid Orders</p>
            <p className="text-lg font-bold text-primary-600">{overallStats.paidOrders || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Avg Order Value</p>
            <p className="text-lg font-bold text-gray-900">₹{overallStats.avgOrderValue || 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Collection Rate</p>
            <p className="text-lg font-bold text-gray-900">
              {overallStats.totalOrders > 0 
                ? Math.round((overallStats.paidOrders / overallStats.totalOrders) * 100) 
                : 0}%
            </p>
          </div>
        </div>
      </div>
    );
  };

  // 📚 Combined History (Revenue + Order History)
  const HistoryPage = () => {
    return (
      <div>
        <RevenueDashboard />
        <div className="mt-8">
          <OrderHistory title="Full Order History" />
        </div>
      </div>
    );
  };

  // 👥 7. CUSTOMER LIST
  const CustomerList = () => {
    const customers = customersData?.data?.customers || [];

    if (customersLoading) return <LoadingSpinner />;

    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Customer List</h1>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="space-y-4">
            {customers.map((customer) => (
              <div key={customer.customerId || customer._id} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
                    <UserCircle className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{customer.name}</p>
                    <p className="text-sm text-gray-600">{customer.email}</p>
                    <p className="text-xs text-gray-500">{customer.phone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{customer.totalOrders || 0} orders</p>
                  <p className="text-sm text-gray-600">{formatCurrency(customer.totalRevenue || 0)}</p>
                  <p className="text-xs text-gray-500">Last: {customer.lastOrdered ? formatDateTime(customer.lastOrdered) : 'N/A'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ⚙️ 8. PROVIDER SETTINGS
  const ProviderSettings = () => {
    // Initialize form state from profileData
    const provider = profileData?.data?.providerDetails || {};
    const contact = profileData?.data?.contact || {};

    const [form, setForm] = useState({
      businessName: provider.businessName || '',
      area: provider.area || '',
      pricePerCan: provider.pricePerCan || '',
      serviceRadius: provider.serviceRadius || '',
      minimumOrder: provider.minimumOrder || '',
      coordinates: provider.coordinates || { latitude: '', longitude: '' },
      operatingHours: provider.operatingHours || { open: '08:00', close: '20:00' },
      description: provider.description || '',
      name: contact.name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      address: contact.address || {}
    });

    useEffect(() => {
      const p = profileData?.data?.providerDetails || {};
      const c = profileData?.data?.contact || {};
      setForm(prev => ({
        ...prev,
        businessName: p.businessName || prev.businessName,
        area: p.area || prev.area,
        pricePerCan: p.pricePerCan ?? prev.pricePerCan,
        serviceRadius: p.serviceRadius ?? prev.serviceRadius,
        minimumOrder: p.minimumOrder ?? prev.minimumOrder,
        coordinates: p.coordinates || prev.coordinates,
        operatingHours: p.operatingHours || prev.operatingHours,
        description: p.description || prev.description,
        name: c.name || prev.name,
        email: c.email || prev.email,
        phone: c.phone || prev.phone,
        address: c.address || prev.address
      }));
    }, [profileData]);

    const saveProfile = async () => {
      const payload = {
        businessName: form.businessName,
        area: form.area,
        pricePerCan: Number(form.pricePerCan),
        serviceRadius: Number(form.serviceRadius),
        minimumOrder: Number(form.minimumOrder),
        coordinates: {
          latitude: Number(form.coordinates.latitude),
          longitude: Number(form.coordinates.longitude)
        },
        operatingHours: form.operatingHours,
        description: form.description,
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address
      };

      try {
        await providerApi.updateProfile(payload);
        queryClient.invalidateQueries('auth-profile');
        queryClient.invalidateQueries('provider-analytics');
        toast.success('Provider settings updated');
      } catch (err) {
        toast.error('Failed to update settings');
      }
    };

    // Map click handler component to pick coordinates
    const LocationPicker = ({ coords, onChange }) => {
      const position = coords && coords.latitude && coords.longitude ? [Number(coords.latitude), Number(coords.longitude)] : null;

      useMapEvents({
        click(e) {
          const { lat, lng } = e.latlng;
          onChange({ latitude: lat, longitude: lng });
        }
      });

      return position ? (
        <Marker position={position} />
      ) : null;
    };

    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Provider Settings</h1>

        <div className="space-y-6">
          {/* Business Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Business Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <input value={form.businessName} onChange={e => setForm({...form, businessName: e.target.value})} type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} type="email" className="w-full border border-gray-300 rounded-lg px-4 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} type="tel" className="w-full border border-gray-300 rounded-lg px-4 py-2" />
              </div>
            </div>
          </div>

          {/* Pricing & Service */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Pricing & Service</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price per Can (₹)</label>
                <input value={form.pricePerCan} onChange={e => setForm({...form, pricePerCan: e.target.value})} type="number" className="w-full border border-gray-300 rounded-lg px-4 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Radius (km)</label>
                <input value={form.serviceRadius} onChange={e => setForm({...form, serviceRadius: e.target.value})} type="number" className="w-full border border-gray-300 rounded-lg px-4 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Order (cans)</label>
                <input value={form.minimumOrder} onChange={e => setForm({...form, minimumOrder: e.target.value})} type="number" className="w-full border border-gray-300 rounded-lg px-4 py-2" />
              </div>
            </div>
          </div>

          {/* Address & Coordinates */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Address & Coordinates</h3>
            <div className="space-y-3">
              <input value={form.area} onChange={e => setForm({...form, area: e.target.value})} placeholder="Area / Locality" className="w-full border px-3 py-2 rounded-lg" />
              <div className="grid grid-cols-2 gap-2">
                <input value={form.coordinates.latitude} onChange={e => setForm({...form, coordinates: {...form.coordinates, latitude: e.target.value}})} placeholder="Latitude" className="w-full border px-3 py-2 rounded-lg" />
                <input value={form.coordinates.longitude} onChange={e => setForm({...form, coordinates: {...form.coordinates, longitude: e.target.value}})} placeholder="Longitude" className="w-full border px-3 py-2 rounded-lg" />
              </div>

              <div className="mt-3">
                <div className="h-64 w-full rounded overflow-hidden border">
                  <MapContainer center={form.coordinates.latitude && form.coordinates.longitude ? [Number(form.coordinates.latitude), Number(form.coordinates.longitude)] : [20.5937,78.9629]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                      attribution='&copy; OpenStreetMap contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationPicker coords={form.coordinates} onChange={(c) => {
                      setForm(prev => ({ ...prev, coordinates: { latitude: c.latitude, longitude: c.longitude }, address: { ...prev.address, coordinates: { latitude: c.latitude, longitude: c.longitude } } }));
                    }} />
                  </MapContainer>
                </div>

                <div className="flex items-center space-x-3 mt-2">
                  <button onClick={() => {
                    if (!navigator.geolocation) return toast.error('Geolocation not supported');
                    navigator.geolocation.getCurrentPosition((pos) => {
                      const lat = pos.coords.latitude;
                      const lng = pos.coords.longitude;
                      setForm(prev => ({ ...prev, coordinates: { latitude: lat, longitude: lng }, address: { ...prev.address, coordinates: { latitude: lat, longitude: lng } } }));
                      toast.success('Location updated');
                    }, (err) => {
                      toast.error('Failed to get location');
                    });
                  }} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Use current location</button>
                  <p className="text-sm text-gray-500">Click on the map to pick location, or use current location.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Working Hours & Description */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Working Hours & Description</h3>
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Open</label>
                <input value={form.operatingHours.open} onChange={e => setForm({...form, operatingHours: {...form.operatingHours, open: e.target.value}})} type="time" className="w-full border px-3 py-2 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Close</label>
                <input value={form.operatingHours.close} onChange={e => setForm({...form, operatingHours: {...form.operatingHours, close: e.target.value}})} type="time" className="w-full border px-3 py-2 rounded-lg" />
              </div>
            </div>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full border px-3 py-2 rounded-lg" rows={4} placeholder="Short description about your business" />
          </div>

          <div className="flex justify-end">
            <button onClick={saveProfile} className="bg-primary-600 text-white px-6 py-2 rounded-lg">Save Settings</button>
          </div>
        </div>

        {/* Bank Details & Wallet Section - Separate from main form */}
        <BankDetailsSection />
      </div>
    );
  };

  // Bank Details & Wallet Sub-component
  const BankDetailsSection = () => {
    const [bank, setBank] = useState({
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      bankName: '',
      accountType: 'savings'
    });
    const [wallet, setWallet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
      const fetchData = async () => {
        try {
          const [bankRes, walletRes] = await Promise.all([
            providerApi.getBankDetails(),
            providerApi.getWallet()
          ]);
          if (bankRes?.data?.bankDetails) {
            setBank(prev => ({ ...prev, ...bankRes.data.bankDetails }));
          }
          if (walletRes?.data) {
            setWallet(walletRes.data);
          }
        } catch (err) {
          console.error('Failed to load bank/wallet data', err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }, []);

    const saveBankDetails = async () => {
      if (!bank.accountHolderName || !bank.accountNumber || !bank.ifscCode) {
        return toast.error('Please fill account holder name, account number and IFSC code');
      }
      setSaving(true);
      try {
        await providerApi.updateBankDetails(bank);
        toast.success('Bank details saved successfully');
        // Refresh wallet data
        const walletRes = await providerApi.getWallet();
        if (walletRes?.data) setWallet(walletRes.data);
      } catch (err) {
        toast.error(err?.response?.data?.message || 'Failed to save bank details');
      } finally {
        setSaving(false);
      }
    };

    if (loading) return <div className="mt-6"><LoadingSpinner /></div>;

    return (
      <div className="mt-8 space-y-6">
        {/* Wallet Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center"><IndianRupee className="h-5 w-5 mr-2 text-green-600" /> Wallet & Earnings</h3>
          {wallet ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Pending Balance</p>
                <p className="text-xl font-bold text-yellow-700">{formatCurrency(wallet.pending_balance || 0)}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Settled Balance</p>
                <p className="text-xl font-bold text-green-700">{formatCurrency(wallet.settled_balance || 0)}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Refund Deductions</p>
                <p className="text-xl font-bold text-red-700">{formatCurrency(wallet.refund_deductions || 0)}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Earnings</p>
                <p className="text-xl font-bold text-blue-700">{formatCurrency(wallet.total_earnings || 0)}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">Unable to load wallet data</p>
          )}
          {wallet && (
            <div className="mt-4 flex items-center space-x-4 text-sm">
              <span className={`px-2 py-1 rounded ${wallet.bankDetailsAdded ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {wallet.bankDetailsAdded ? '✓ Bank Added' : '✗ Bank Not Added'}
              </span>
              <span className={`px-2 py-1 rounded ${wallet.bankVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {wallet.bankVerified ? '✓ Bank Verified' : '⏳ Pending Verification'}
              </span>
              <span className={`px-2 py-1 rounded ${wallet.razorpayLinkedActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {wallet.razorpayLinkedActive ? '✓ Payouts Active' : '○ Payouts Inactive'}
              </span>
            </div>
          )}
        </div>

        {/* Bank Details Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Bank Account Details</h3>
          <p className="text-sm text-gray-500 mb-4">Add your bank account to receive payments directly. Payments are transferred after order delivery is confirmed.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name *</label>
              <input 
                value={bank.accountHolderName || ''} 
                onChange={e => setBank({...bank, accountHolderName: e.target.value})} 
                type="text" 
                placeholder="Name as per bank records"
                className="w-full border border-gray-300 rounded-lg px-4 py-2" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Number *</label>
              <input 
                value={bank.accountNumber || ''} 
                onChange={e => setBank({...bank, accountNumber: e.target.value})} 
                type="text" 
                placeholder="Bank account number"
                className="w-full border border-gray-300 rounded-lg px-4 py-2" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code *</label>
              <input 
                value={bank.ifscCode || ''} 
                onChange={e => setBank({...bank, ifscCode: e.target.value.toUpperCase()})} 
                type="text" 
                placeholder="e.g. SBIN0001234"
                maxLength={11}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 uppercase" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
              <input 
                value={bank.bankName || ''} 
                onChange={e => setBank({...bank, bankName: e.target.value})} 
                type="text" 
                placeholder="e.g. State Bank of India"
                className="w-full border border-gray-300 rounded-lg px-4 py-2" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
              <select 
                value={bank.accountType || 'savings'} 
                onChange={e => setBank({...bank, accountType: e.target.value})} 
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="savings">Savings</option>
                <option value="current">Current</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button 
              onClick={saveBankDetails} 
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Bank Details'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardHome />;
      case 'active-orders': return <ActiveOrders />;
      case 'delivery-management': return <DeliveryBoys />;
      case 'history': return <HistoryPage />;
      case 'order-history': return <OrderHistory />;
      case 'revenue': return <RevenueDashboard />;
      case 'customers': return <CustomerList />;
      case 'settings': return <ProviderSettings />;
      default: return <DashboardHome />;
    }
  };

  return (
    <DashboardLayout navigation={navigation} activeTab={activePage}>
      {renderPage()}
    </DashboardLayout>
  );
};

export default ProviderDashboard;
