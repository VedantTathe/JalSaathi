import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Home as HomeIcon, Package, Truck, Users, History, TrendingUp, UserCircle,
  Settings, CheckCircle, XCircle, Clock, IndianRupee, Phone, MapPin,
  Calendar, Filter, Plus, Edit2, Trash2, BarChart3, DollarSign, Power
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { providerApi, orderApi } from '../../services/api';
import { formatCurrency, formatDateTime, getStatusColor, getStatusText } from '../../utils/helpers';
import toast from 'react-hot-toast';

const ProviderDashboard = () => {
  const queryClient = useQueryClient();
  const [activePage, setActivePage] = useState('dashboard');
  const [isOnline, setIsOnline] = useState(true);

  // Fetch data
  const { data: ordersData, isLoading: ordersLoading } = useQuery('provider-orders', () => providerApi.getOrders());
  const { data: customersData, isLoading: customersLoading } = useQuery('provider-customers', () => providerApi.getCustomers());
  const { data: deliveryBoysData, isLoading: deliveryBoysLoading } = useQuery('provider-delivery-boys', () => providerApi.getDeliveryBoys());

  

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

  const navigation = [
    { key: 'dashboard', name: 'Dashboard Home', icon: HomeIcon },
    { key: 'active-orders', name: 'View Orders', icon: Clock },
    { key: 'delivery-management', name: 'Delivery Management', icon: Truck },
    { key: 'order-history', name: 'Order History', icon: History },
    { key: 'revenue', name: 'Revenue Dashboard', icon: TrendingUp },
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
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const activeOrders = orders.filter(o => ['accepted', 'assigned', 'out_for_delivery'].includes(o.status)).length;
    const completedToday = todayOrders.filter(o => o.status === 'delivered').length;

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          
          {/* IMPORTANT: Online/Offline Toggle */}
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              isOnline 
                ? 'bg-success-100 text-success-700 hover:bg-success-200' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Power className="h-5 w-5" />
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </button>
        </div>

        {/* Analytics Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <Package className="h-8 w-8 text-primary-600" />
              <span className="bg-error-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                {pendingOrders}
              </span>
            </div>
            <p className="text-2xl font-bold text-primary-900">{pendingOrders}</p>
            <p className="text-sm text-primary-700">Pending Orders</p>
          </div>

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
            <p className="text-2xl font-bold text-purple-900">₹1,240</p>
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
            onClick={() => setActivePage('active-orders')}
            className="bg-white border-2 border-warning-200 hover:border-warning-400 rounded-lg p-6 text-left transition-all"
          >
            <Truck className="h-8 w-8 text-warning-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">Manage Active Orders</h3>
            <p className="text-sm text-gray-600">Assign delivery partners</p>
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

  // 🕐 2. ACTIVE / RECEIVED ORDERS (replaces IncomingOrders)
  const ActiveOrders = () => {
    const orders = ordersData?.data?.orders || [];
    // Show received orders (accepted/assigned/out_for_delivery) and also include recently received
    const receivedOrders = orders.filter(o => ['pending', 'accepted', 'assigned', 'out_for_delivery'].includes(o.status));

    const [selectedOrders, setSelectedOrders] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [selectedDeliveryBoy, setSelectedDeliveryBoy] = useState('');

    if (ordersLoading) return <LoadingSpinner />;

    const toggleSelect = (orderId) => {
      const next = new Set(selectedOrders);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      setSelectedOrders(next);
      setSelectAll(next.size === receivedOrders.length && receivedOrders.length > 0);
    };

    const handleSelectAll = () => {
      if (selectAll) {
        setSelectedOrders(new Set());
        setSelectAll(false);
      } else {
        const allIds = receivedOrders.map(o => o._id);
        setSelectedOrders(new Set(allIds));
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
          <h1 className="text-2xl font-bold text-gray-900">View Orders</h1>
          <div className="flex items-center space-x-3">
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

        {receivedOrders.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No orders received</p>
          </div>
        ) : (
          <div className="space-y-4">
            {receivedOrders.map((order) => (
              <div key={order._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <input type="checkbox" checked={selectedOrders.has(order._id)} onChange={() => toggleSelect(order._id)} className="h-4 w-4" />
                    <div>
                      <div className="flex items-center space-x-3 mb-2">
                        <Package className="h-5 w-5 text-gray-400" />
                        <span className="font-mono text-sm text-gray-600">#{order.orderNumber || order._id.slice(-8)}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{formatDateTime(order.timeline?.ordered)}</p>
                    </div>
                  </div>
                  <p className="text-xl font-semibold text-primary-600">₹{order.items?.totalPrice || 0}</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600">Customer</p>
                    <p className="font-medium text-gray-900">{order.customer?.name || 'N/A'}</p>
                    <p className="text-xs text-gray-600">{order.customer?.phone || ''}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Quantity</p>
                    <p className="font-medium text-gray-900">{order.items?.quantity || 0} cans</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Delivery Partner</p>
                    {order.deliveryBoyId ? (
                      <p className="font-medium text-success-600">{order.deliveryBoy?.name || 'Assigned'}</p>
                    ) : (
                      <p className="text-sm text-gray-600">Not assigned</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Payment</p>
                    <p className="font-medium text-gray-900">{order.paymentStatus || 'Pending'}</p>
                  </div>
                </div>

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
              </div>
            ))}
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

  // 🚚 4. DELIVERY MANAGEMENT
  const DeliveryManagement = () => {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Delivery Management</h1>
          <button className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Add Delivery Partner</span>
          </button>
        </div>

        {/* Sample Delivery Partners */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { name: 'John Doe', phone: '+91 98765 43210', activeOrders: 3, completedOrders: 145, rating: 4.8, status: 'active' },
            { name: 'Jane Smith', phone: '+91 98765 43211', activeOrders: 2, completedOrders: 89, rating: 4.6, status: 'active' },
          ].map((partner, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
                    <Truck className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{partner.name}</h3>
                    <p className="text-sm text-gray-600">{partner.phone}</p>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-800">
                  {partner.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-600">Active</p>
                  <p className="font-semibold text-gray-900">{partner.activeOrders}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Completed</p>
                  <p className="font-semibold text-gray-900">{partner.completedOrders}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Rating</p>
                  <p className="font-semibold text-warning-600">{partner.rating} ⭐</p>
                </div>
              </div>

              <div className="flex space-x-2">
                <button className="flex-1 text-primary-600 border border-primary-600 py-2 rounded-lg font-medium hover:bg-primary-50">
                  View Details
                </button>
                <button className="text-gray-400 hover:text-error-600 px-3">
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 📜 5. ORDER HISTORY
  const OrderHistory = () => {
    const [dateFilter, setDateFilter] = useState('all');
    const orders = ordersData?.data?.orders || [];
    const deliveredOrders = orders.filter(o => o.status === 'delivered' || o.status === 'cancelled');

    const stats = {
      totalOrders: deliveredOrders.length,
      avgDeliveryTime: '32 min',
      paymentReceived: deliveredOrders.reduce((sum, o) => sum + (o.items?.totalPrice || 0), 0)
    };

    if (ordersLoading) return <LoadingSpinner />;

    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Order History</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">Total Orders</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">Avg Delivery Time</p>
            <p className="text-2xl font-bold text-gray-900">{stats.avgDeliveryTime}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-sm text-gray-600 mb-1">Payment Received</p>
            <p className="text-2xl font-bold text-success-600">₹{stats.paymentReceived}</p>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">All Orders</h3>
            <select className="border border-gray-300 rounded-lg px-4 py-2 text-sm">
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          <div className="space-y-3">
            {deliveredOrders.map((order) => (
              <div key={order._id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">#{order.orderNumber || order._id.slice(-8)}</p>
                  <p className="text-sm text-gray-600">{order.customer?.name}</p>
                  <p className="text-xs text-gray-500">{formatDateTime(order.timeline?.ordered)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">₹{order.items?.totalPrice || 0}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 💰 6. REVENUE DASHBOARD
  const RevenueDashboard = () => {
    const [revenueView, setRevenueView] = useState('daily');
    
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Revenue Dashboard</h1>

        {/* View Selector */}
        <div className="flex space-x-4 mb-6">
          {['daily', 'weekly', 'monthly'].map(view => (
            <button
              key={view}
              onClick={() => setRevenueView(view)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                revenueView === view 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-success-50 to-success-100 rounded-lg p-6">
            <DollarSign className="h-8 w-8 text-success-600 mb-2" />
            <p className="text-sm text-success-700 mb-1">Total Revenue ({revenueView})</p>
            <p className="text-3xl font-bold text-success-900">₹5,240</p>
          </div>
          <div className="bg-gradient-to-br from-warning-50 to-warning-100 rounded-lg p-6">
            <Clock className="h-8 w-8 text-warning-600 mb-2" />
            <p className="text-sm text-warning-700 mb-1">Outstanding Payments</p>
            <p className="text-3xl font-bold text-warning-900">₹1,180</p>
          </div>
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-6">
            <BarChart3 className="h-8 w-8 text-primary-600 mb-2" />
            <p className="text-sm text-primary-700 mb-1">Orders ({revenueView})</p>
            <p className="text-3xl font-bold text-primary-900">67</p>
          </div>
        </div>

        {/* Chart Placeholder */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue Trends</h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Revenue chart will be displayed here</p>
          </div>
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
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Provider Settings</h1>

        <div className="space-y-6">
          {/* Pricing */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Pricing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price per Can (₹)</label>
                <input type="number" defaultValue="40" className="w-full border border-gray-300 rounded-lg px-4 py-2" />
              </div>
            </div>
          </div>

          {/* Delivery Areas */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Delivery Areas</h3>
            <textarea className="w-full border border-gray-300 rounded-lg px-4 py-2" rows="3" placeholder="Enter delivery areas..."></textarea>
          </div>

          {/* Working Hours */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Working Hours</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opening Time</label>
                <input type="time" defaultValue="08:00" className="w-full border border-gray-300 rounded-lg px-4 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Closing Time</label>
                <input type="time" defaultValue="20:00" className="w-full border border-gray-300 rounded-lg px-4 py-2" />
              </div>
            </div>
          </div>

          {/* Business Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Business Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <input type="text" placeholder="Your Business Name" className="w-full border border-gray-300 rounded-lg px-4 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                <input type="tel" placeholder="+91 98765 43210" className="w-full border border-gray-300 rounded-lg px-4 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea className="w-full border border-gray-300 rounded-lg px-4 py-2" rows="3" placeholder="Business address..."></textarea>
              </div>
            </div>
          </div>

          <button className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700">
            Save Settings
          </button>
        </div>
      </div>
    );
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardHome />;
      case 'active-orders': return <ActiveOrders />;
      case 'delivery-management': return <DeliveryManagement />;
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
