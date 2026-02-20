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
import { providerApi, orderApi, authApi, settlementApi } from '../../services/api';
import { formatCurrency, formatDateTime, getStatusColor, getStatusText } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

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
      onError: (error) => {
        const message = error?.response?.data?.message || 'Failed to cancel order';
        toast.error(message);
      }
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
      onError: (error) => {
        const message = error?.response?.data?.message || 'Failed to assign delivery partner';
        toast.error(message);
      }
    }
  );

  // Delivery boy mutations
  const addDeliveryBoyMutation = useMutation(
    (data) => providerApi.addDeliveryBoy(data),
    {
      onSuccess: (res) => {
        queryClient.invalidateQueries('provider-delivery-boys');
        const generated = res?.data?.generatedPassword || res?.generatedPassword;
        if (generated) toast.success(`Delivery boy added! Password: ${generated}`);
        else toast.success('Delivery boy added successfully!');
      },
      onError: (error) => {
        const message = error?.response?.data?.message || 'Failed to add delivery boy';
        toast.error(message);
      }
    }
  );

  const removeDeliveryBoyMutation = useMutation(
    (deliveryBoyId) => providerApi.removeDeliveryBoy(deliveryBoyId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('provider-delivery-boys');
        toast.success('Delivery boy removed');
      },
      onError: (error) => {
        const message = error?.response?.data?.message || 'Failed to remove delivery boy';
        toast.error(message);
      }
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
    onError: (error) => {
      const message = error?.response?.data?.message || 'Failed to update status';
      toast.error(message);
    }
  });

  const navigation = [
    { key: 'dashboard', name: 'Dashboard Home', icon: HomeIcon },
    { key: 'active-orders', name: 'View Orders', icon: Clock },
    { key: 'delivery-management', name: 'Delivery Boys', icon: Truck },
    { key: 'history', name: 'History', icon: History },
    { key: 'earnings', name: 'Earnings', icon: DollarSign },
    { key: 'customers', name: 'Customer List', icon: Users },
    { key: 'settings', name: 'Provider Settings', icon: Settings },
  ].map(item => ({
    ...item,
    href: '#',
    onClick: () => setActivePage(item.key)
  }));

  // ðŸ  1. DASHBOARD HOME
  const DashboardHome = () => {
    const orders = ordersData?.data?.orders || [];
    const todayOrders = orders.filter(o => new Date(o.timeline?.ordered || o.createdAt).toDateString() === new Date().toDateString());
    const activeOrders = orders.filter(o => ['accepted', 'assigned', 'out_for_delivery'].includes(o.status)).length;
    const completedToday = todayOrders.filter(o => o.status === 'delivered').length;
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.items?.totalPrice || o.totalPrice || 0), 0);
    const todayOnlineCollected = todayOrders.filter(o => o.paymentStatus === 'paid').reduce((sum, o) => sum + (o.items?.totalPrice || o.totalPrice || 0), 0);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-warning-50 to-warning-100 rounded-lg p-5">
            <Clock className="h-7 w-7 text-warning-600 mb-2" />
            <p className="text-2xl font-bold text-warning-900">{activeOrders}</p>
            <p className="text-sm text-warning-700">Active Orders</p>
          </div>

          <div className="bg-gradient-to-br from-success-50 to-success-100 rounded-lg p-5">
            <CheckCircle className="h-7 w-7 text-success-600 mb-2" />
            <p className="text-2xl font-bold text-success-900">{completedToday}</p>
            <p className="text-sm text-success-700">Completed Today</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-5">
            <IndianRupee className="h-7 w-7 text-purple-600 mb-2" />
            <p className="text-2xl font-bold text-purple-900">Rs. {todayRevenue.toLocaleString('en-IN')}</p>
            <p className="text-sm text-purple-700">Today's Revenue</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5">
            <CheckCircle className="h-7 w-7 text-blue-600 mb-2" />
            <p className="text-2xl font-bold text-blue-900">Rs. {todayOnlineCollected.toLocaleString('en-IN')}</p>
            <p className="text-sm text-blue-700">Online Collected</p>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5">
            <DollarSign className="h-7 w-7 text-gray-500 mb-2" />
            <p className="text-2xl font-bold text-gray-600">—</p>
            <p className="text-sm text-gray-500">Settled to Bank</p>
            <p className="text-xs text-gray-400 mt-1">Admin pending</p>
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
            onClick={() => setActivePage('history')}
            className="bg-white border-2 border-purple-200 hover:border-purple-400 rounded-lg p-6 text-left transition-all"
          >
            <History className="h-8 w-8 text-purple-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">Order History</h3>
            <p className="text-sm text-gray-600">View past orders & stats</p>
          </button>

          <button
            onClick={() => setActivePage('earnings')}
            className="bg-white border-2 border-success-200 hover:border-success-400 rounded-lg p-6 text-left transition-all"
          >
            <TrendingUp className="h-8 w-8 text-success-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">Earnings</h3>
            <p className="text-sm text-gray-600">Check settlements</p>
          </button>
        </div>

        {/* Business Analytics Charts */}
        <div className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <BarChart3 className="h-6 w-6 mr-2 text-primary-600" />
            Business Analytics
          </h2>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Daily Orders & Revenue - Last 7 Days */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Orders & Revenue (Last 7 Days)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={(() => {
                  const last7Days = [];
                  for (let i = 6; i >= 0; i--) {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const dateStr = date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
                    const dayOrders = orders.filter(o => {
                      const orderDate = new Date(o.timeline?.ordered || o.createdAt);
                      return orderDate.toDateString() === date.toDateString();
                    });
                    const revenue = dayOrders.reduce((sum, o) => sum + (o.items?.totalPrice || o.totalPrice || 0), 0);
                    const delivered = dayOrders.filter(o => o.status === 'delivered').length;
                    const cans = dayOrders.reduce((sum, o) => sum + (o.items?.quantity || o.quantity || 0), 0);
                    last7Days.push({
                      day: dateStr,
                      orders: dayOrders.length,
                      delivered: delivered,
                      revenue: revenue,
                      cans: cans
                    });
                  }
                  return last7Days;
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={(v) => `Rs.${v}`} />
                  <Tooltip formatter={(value, name) => [name === 'revenue' ? `Rs. ${value}` : value, name === 'revenue' ? 'Revenue' : name === 'orders' ? 'Orders' : name === 'delivered' ? 'Delivered' : 'Cans']} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="orders" fill="#3b82f6" name="Orders" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="delivered" fill="#22c55e" name="Delivered" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#8b5cf6" strokeWidth={3} name="Revenue" dot={{ r: 5, fill: '#8b5cf6' }} />
                </BarChart>
              </ResponsiveContainer>
              {/* Summary Stats */}
              <div className="mt-4 grid grid-cols-4 gap-3 text-center">
                {(() => {
                  const totalOrders = orders.length;
                  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
                  const totalRevenue = orders.reduce((sum, o) => sum + (o.items?.totalPrice || o.totalPrice || 0), 0);
                  const totalCans = orders.reduce((sum, o) => sum + (o.items?.quantity || o.quantity || 0), 0);
                  return (
                    <>
                      <div className="bg-blue-50 rounded-lg p-2">
                        <p className="text-xs text-blue-600">Total Orders</p>
                        <p className="text-lg font-bold text-blue-700">{totalOrders}</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-2">
                        <p className="text-xs text-green-600">Delivered</p>
                        <p className="text-lg font-bold text-green-700">{deliveredOrders}</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-2">
                        <p className="text-xs text-purple-600">Revenue</p>
                        <p className="text-lg font-bold text-purple-700">Rs. {totalRevenue.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="bg-cyan-50 rounded-lg p-2">
                        <p className="text-xs text-cyan-600">Cans Sold</p>
                        <p className="text-lg font-bold text-cyan-700">{totalCans}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Peak Hours Analysis */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Peak Hours (Order Timing)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={(() => {
                  const hourCounts = {};
                  for (let i = 6; i <= 22; i++) {
                    hourCounts[i] = 0;
                  }
                  orders.forEach(o => {
                    const hour = new Date(o.timeline?.ordered || o.createdAt).getHours();
                    if (hour >= 6 && hour <= 22) {
                      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
                    }
                  });
                  return Object.entries(hourCounts).map(([hour, count]) => ({
                    hour: `${hour}:00`,
                    orders: count,
                    isPeak: count >= Math.max(...Object.values(hourCounts)) * 0.7
                  }));
                })()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={1} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="orders" name="Orders" radius={[4, 4, 0, 0]}>
                    {(() => {
                      const hourCounts = {};
                      orders.forEach(o => {
                        const hour = new Date(o.timeline?.ordered || o.createdAt).getHours();
                        if (hour >= 6 && hour <= 22) {
                          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
                        }
                      });
                      const maxCount = Math.max(...Object.values(hourCounts), 1);
                      return Object.entries(hourCounts).map(([hour, count], index) => (
                        <Cell key={`cell-${index}`} fill={count >= maxCount * 0.7 ? '#f59e0b' : '#3b82f6'} />
                      ));
                    })()}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 text-center mt-2">
                <span className="inline-block w-3 h-3 bg-amber-500 rounded mr-1"></span> Peak Hours
                <span className="inline-block w-3 h-3 bg-blue-500 rounded ml-3 mr-1"></span> Regular Hours
              </p>
            </div>

            {/* Area-wise Orders Distribution */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Area-wise Orders</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={(() => {
                      const areaCounts = {};
                      orders.forEach(o => {
                        const area = o.deliveryAddress?.area || o.deliveryAddress?.city || 'Unknown';
                        areaCounts[area] = (areaCounts[area] || 0) + 1;
                      });
                      const sortedAreas = Object.entries(areaCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 6); // Top 6 areas
                      return sortedAreas.map(([area, count]) => ({
                        name: area,
                        value: count
                      }));
                    })()}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name.substring(0, 10)}${name.length > 10 ? '..' : ''} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: '#666', strokeWidth: 1 }}
                  >
                    {(() => {
                      const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
                      const areaCounts = {};
                      orders.forEach(o => {
                        const area = o.deliveryAddress?.area || o.deliveryAddress?.city || 'Unknown';
                        areaCounts[area] = (areaCounts[area] || 0) + 1;
                      });
                      return Object.keys(areaCounts).slice(0, 6).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ));
                    })()}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Orders']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Delivery Boy Performance */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Boy Performance</h3>
              {(() => {
                const deliveryBoys = deliveryBoysData?.data?.deliveryBoys || deliveryBoysData?.data || [];
                const dbPerformance = {};
                orders.filter(o => o.deliveryBoyId).forEach(o => {
                  const dbId = o.deliveryBoyId._id || o.deliveryBoyId;
                  const dbName = o.deliveryBoyId.name || 'Unknown';
                  if (!dbPerformance[dbId]) {
                    dbPerformance[dbId] = { name: dbName, assigned: 0, delivered: 0, revenue: 0 };
                  }
                  dbPerformance[dbId].assigned++;
                  if (o.status === 'delivered') {
                    dbPerformance[dbId].delivered++;
                    dbPerformance[dbId].revenue += (o.items?.totalPrice || o.totalPrice || 0);
                  }
                });
                const performanceData = Object.values(dbPerformance).sort((a, b) => b.delivered - a.delivered).slice(0, 5);
                
                if (performanceData.length === 0) {
                  return (
                    <div className="flex items-center justify-center h-[250px] text-gray-500">
                      <div className="text-center">
                        <Truck className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                        <p>No delivery data yet</p>
                      </div>
                    </div>
                  );
                }
                
                return (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={performanceData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="assigned" fill="#3b82f6" name="Assigned" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="delivered" fill="#22c55e" name="Delivered" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>

            {/* Top Customers */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers</h3>
              {(() => {
                const customerStats = {};
                orders.forEach(o => {
                  const customerId = o.customerId?._id || o.customerId;
                  const customerName = o.customerId?.name || 'Unknown';
                  if (!customerStats[customerId]) {
                    customerStats[customerId] = { name: customerName, orders: 0, revenue: 0, cans: 0 };
                  }
                  customerStats[customerId].orders++;
                  customerStats[customerId].revenue += (o.items?.totalPrice || o.totalPrice || 0);
                  customerStats[customerId].cans += (o.items?.quantity || o.quantity || 0);
                });
                const topCustomers = Object.values(customerStats)
                  .sort((a, b) => b.orders - a.orders)
                  .slice(0, 5);
                
                if (topCustomers.length === 0) {
                  return (
                    <div className="flex items-center justify-center h-[200px] text-gray-500">
                      <div className="text-center">
                        <Users className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                        <p>No customer data yet</p>
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-3">
                    {topCustomers.map((customer, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                            index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-blue-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{customer.name}</p>
                            <p className="text-xs text-gray-500">{customer.orders} orders | {customer.cans} cans</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">Rs. {customer.revenue.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

          </div>
        </div>
      </div>
    );
  };

  // ðŸ• 2. VIEW ORDERS (shows ALL orders from last 16 hours including delivered)
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
                  <p className="text-xl font-semibold text-primary-600">Rs. {order.items?.totalPrice || 0}</p>
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
                      {order.paymentStatus === 'paid' ? 'œ“ Paid' : 'Pending'}
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

  // (Old ActiveOrders removed replaced by consolidated View Orders implementation above)

  // ðŸšš 4. DELIVERY BOYS
  const DeliveryBoys = () => {
    const [showAddModal, setShowAddModal] = useState(false);
      const [newBoy, setNewBoy] = useState({ name: '', phone: '', email: '', password: '' });

    const boys = deliveryBoysData?.data || [];

    const handleAdd = () => {
      if (!newBoy.name || !newBoy.phone) {
        return toast.error('Name and phone are required');
      }
      
      if (!newBoy.email || !newBoy.email.trim()) {
        return toast.error('Email is required - credentials will be sent to this address');
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newBoy.email)) {
        return toast.error('Please enter a valid email address');
      }

      // Send provided fields - password is optional, will be auto-generated if not provided
      const payload = { 
        name: newBoy.name, 
        phone: newBoy.phone, 
        email: newBoy.email.trim()
      };
      
      // Only include password if provided
      if (newBoy.password && newBoy.password.trim() !== '') {
        payload.password = newBoy.password;
      }

      addDeliveryBoyMutation.mutate(payload, {
        onSuccess: (response) => {
          setShowAddModal(false);
          setNewBoy({ name: '', phone: '', email: '', password: '' });
          toast.success(response.message || 'Delivery boy added! Credentials sent to email.');
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
                <input value={newBoy.name} onChange={e => setNewBoy({...newBoy, name: e.target.value})} placeholder="Name" className="w-full border px-3 py-2 rounded-lg" required />
                <input value={newBoy.phone} onChange={e => setNewBoy({...newBoy, phone: e.target.value})} placeholder="Phone" className="w-full border px-3 py-2 rounded-lg" required />
                <input type="email" value={newBoy.email} onChange={e => setNewBoy({...newBoy, email: e.target.value})} placeholder="Email (Required - credentials will be sent)" className="w-full border px-3 py-2 rounded-lg" required />
                <input type="password" value={newBoy.password} onChange={e => setNewBoy({...newBoy, password: e.target.value})} placeholder="Password (leave empty to auto-generate)" className="w-full border px-3 py-2 rounded-lg" />
                <p className="text-sm text-gray-500">Login credentials will be sent to the delivery boy's email.</p>
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

  // HISTORY PAGE - Order stats and daily breakdown
  const HistoryPage = () => {
    const [expandedDay, setExpandedDay] = useState(null);
    
    const dailySummary = historyData?.data?.dailySummary || [];
    const overallStats = historyData?.data?.overallStats || {};

    if (historyLoading) return <LoadingSpinner />;

    const totalOrders = overallStats.totalOrders || 0;
    const totalOrderValue = overallStats.totalRevenue || 0;
    const onlinePaymentReceived = overallStats.paidRevenue || 0;
    const paidOrders = overallStats.paidOrders || 0;
    const deliveredOrders = overallStats.deliveredOrders || 0;
    const awaitingPayment = totalOrderValue - onlinePaymentReceived;

    const formatDate = (dateStr) => {
      const date = new Date(dateStr + 'T00:00:00');
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) return 'Today';
      if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
      return date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order History</h1>
        <p className="text-sm text-gray-500 mb-6">Track all orders and payment status</p>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Orders */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary-600" />
              </div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Orders</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
            <p className="text-sm text-gray-500 mt-1">Total orders (Cash + Online)</p>
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-xs">
              <span className="text-success-600">{deliveredOrders} delivered</span>
              <span className="text-primary-600">{paidOrders} paid online</span>
            </div>
          </div>

          {/* Total Order Value */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <IndianRupee className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Total Value</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">Rs. {totalOrderValue.toLocaleString('en-IN')}</p>
            <p className="text-sm text-gray-500 mt-1">All orders value</p>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">Avg: Rs. {overallStats.avgOrderValue || 0}/order</p>
            </div>
          </div>

          {/* Online Payment Received */}
          <div className="bg-gradient-to-br from-success-50 to-success-100 rounded-xl shadow-sm border border-success-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-full bg-success-200 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-success-700" />
              </div>
              <span className="text-xs text-success-600 uppercase tracking-wide">Received</span>
            </div>
            <p className="text-2xl font-bold text-success-800">Rs. {onlinePaymentReceived.toLocaleString('en-IN')}</p>
            <p className="text-sm text-success-700 mt-1">Online payment received</p>
            <div className="mt-3 pt-3 border-t border-success-200">
              <p className="text-xs text-success-600">{paidOrders} orders paid online</p>
            </div>
          </div>

          {/* Awaiting Payment */}
          <div className="bg-gradient-to-br from-warning-50 to-warning-100 rounded-xl shadow-sm border border-warning-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-full bg-warning-200 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning-700" />
              </div>
              <span className="text-xs text-warning-600 uppercase tracking-wide">Pending</span>
            </div>
            <p className="text-2xl font-bold text-warning-800">Rs. {awaitingPayment.toLocaleString('en-IN')}</p>
            <p className="text-sm text-warning-700 mt-1">Awaiting payment (COD/Unpaid)</p>
            <div className="mt-3 pt-3 border-t border-warning-200">
              <p className="text-xs text-warning-600">{totalOrders - paidOrders} orders pending</p>
            </div>
          </div>
        </div>

        {/* Daily Order Breakdown */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Daily Breakdown</h2>
        <div className="space-y-3">
          {dailySummary.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No order history found</p>
            </div>
          ) : (
            dailySummary.map((day) => (
              <div key={day.date} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setExpandedDay(expandedDay === day.date ? null : day.date)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-lg bg-primary-100 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-primary-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">{formatDate(day.date)}</p>
                      <p className="text-xs text-gray-500">
                        {day.totalOrders} order{day.totalOrders !== 1 ? 's' : ''}
                        {day.deliveredOrders > 0 && <span className="text-success-600">  {day.deliveredOrders} delivered</span>}
                        {day.cancelledOrders > 0 && <span className="text-error-600">  {day.cancelledOrders} cancelled</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <p className="font-bold text-gray-900">Rs. {day.totalRevenue}</p>
                    {expandedDay === day.date ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                  </div>
                </button>

                {expandedDay === day.date && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                    <div className="space-y-2">
                      {(() => {
                        const uniqueOrders = Array.from(new Map((day.orders || []).map(o => [o._id, o])).values());
                        return uniqueOrders.map((order) => (
                          <div key={order._id} className="bg-white rounded-lg p-3 border border-gray-100 flex items-center justify-between">
                            <div className="text-left">
                              <div className="flex items-center space-x-2">
                                <p className="font-medium text-gray-900 text-sm">#{order.orderNumber || (order._id || '').slice(-8)}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(order.status)}`}>
                                  {getStatusText(order.status)}
                                </span>
                                {order.paymentStatus === 'paid' && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-success-100 text-success-700">Paid</span>
                                )}
                                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                  {order.paymentMethod === 'online' ? 'Online' : 'COD'}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {order.customerId?.name || order.customerName || 'Customer'} 
                                {(order.items?.quantity || order.quantity || 0)} can{(order.items?.quantity || order.quantity || 0) !== 1 ? 's' : ''} 
                                {new Date(order.createdAt || order.orderedAt || order.timeline?.ordered).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <p className="font-semibold text-gray-900">Rs. {order.items?.totalPrice || order.totalPrice || 0}</p>
                          </div>
                        ));
                      })()}
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

  // EARNINGS PAGE - Settlement from Admin
  const EarningsPage = () => {
    const { data: settlementsData, isLoading: settlementsLoading } = useQuery(
      'provider-settlements',
      () => settlementApi.getMySettlements()
    );
    
    const { data: earningsData, isLoading: earningsLoading } = useQuery(
      'provider-earnings',
      () => settlementApi.getMyEarnings()
    );

    if (settlementsLoading || earningsLoading) return <LoadingSpinner />;

    const settlements = settlementsData?.data || [];
    const earnings = earningsData?.data || {};
    const overallStats = historyData?.data?.overallStats || {};

    // Calculate card values from earnings data
    const totalEarned = earnings.overall?.netEarnings || overallStats.paidRevenue || 0;
    const totalSettled = (earnings.byStatus?.completed || 0);
    const pendingSettlement = (earnings.byStatus?.pending || 0) + (earnings.byStatus?.processing || 0);

    const formatDate = (dateStr) => {
      if (!dateStr) return '-';
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const getStatusBadge = (status) => {
      const statusConfig = {
        pending: { bg: 'bg-warning-100', text: 'text-warning-700', label: 'Pending' },
        processing: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Processing' },
        completed: { bg: 'bg-success-100', text: 'text-success-700', label: 'Completed' },
        failed: { bg: 'bg-danger-100', text: 'text-danger-700', label: 'Failed' }
      };
      const config = statusConfig[status] || statusConfig.pending;
      return (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
          {config.label}
        </span>
      );
    };

    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Earnings & Settlements</h1>
        <p className="text-sm text-gray-500 mb-6">Track money settled to your bank account by admin</p>

        {/* Settlement Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Total Earnings (Online Received) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <IndianRupee className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-xs text-gray-400 uppercase tracking-wide">Total Earned</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">₹{totalEarned.toLocaleString('en-IN')}</p>
            <p className="text-sm text-gray-500 mt-1">Online payments received</p>
          </div>

          {/* Settled to Bank */}
          <div className="bg-gradient-to-br from-success-50 to-success-100 rounded-xl shadow-sm border border-success-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-full bg-success-200 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-success-700" />
              </div>
              <span className="text-xs text-success-600 uppercase tracking-wide">Settled</span>
            </div>
            <p className="text-2xl font-bold text-success-800">
              {totalSettled !== null ? totalSettled.toLocaleString('en-IN') : '0'}
            </p>
            <p className="text-sm text-success-700 mt-1">Transferred to your bank</p>
            {totalSettled === null && (
              <p className="text-xs text-success-600 mt-2">Admin settlement pending</p>
            )}
          </div>

          {/* Pending Settlement */}
          <div className="bg-gradient-to-br from-warning-50 to-warning-100 rounded-xl shadow-sm border border-warning-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="h-10 w-10 rounded-full bg-warning-200 flex items-center justify-center">
                <Clock className="h-5 w-5 text-warning-700" />
              </div>
              <span className="text-xs text-warning-600 uppercase tracking-wide">Pending</span>
            </div>
            <p className="text-2xl font-bold text-warning-800">
              {pendingSettlement !== null ? `Rs. ${pendingSettlement.toLocaleString('en-IN')}` : 'NA'}
            </p>
            <p className="text-sm text-warning-700 mt-1">Awaiting settlement</p>
            {pendingSettlement === null && (
              <p className="text-xs text-warning-600 mt-2">Admin settlement not created</p>
            )}
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 flex items-start space-x-3">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Package className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-900">How settlements work</p>
            <p className="text-xs text-blue-700 mt-1">
              After customers pay online, the admin will process settlements daily/weekly and transfer funds to your bank account after deducting platform charges. Settlement details will appear here once processed.
            </p>
          </div>
        </div>

        {/* Settlement History */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Settlement History</h2>
        <div className="space-y-3">
          {settlements.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No settlements yet</p>
              <p className="text-sm text-gray-400 mt-1">Settlements will appear here once processed by admin</p>
            </div>
          ) : (
            settlements.map((settlement) => (
              <div key={settlement._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="h-9 w-9 rounded-lg bg-primary-100 flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {new Date(settlement.periodStart).toLocaleDateString()} - {new Date(settlement.periodEnd).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">{settlement.orderCount} orders</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Amount</p>
                        <p className="font-bold text-gray-900">₹{settlement.netAmount?.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="text-right min-w-[120px]">
                        <p className="text-xs text-gray-400">Status</p>
                        {settlement.status === 'completed' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-success-100 text-success-700">
                            Settled
                          </span>
                        ) : settlement.status === 'processing' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            Processing
                          </span>
                        ) : settlement.status === 'pending' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-warning-100 text-warning-700">
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-error-100 text-error-700">
                            Failed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    );
  };

  // 7. CUSTOMER LIST
  const CustomerList = () => {
    const customers = customersData?.data?.customers || [];

    const [query, setQuery] = useState('');

    if (customersLoading) return <LoadingSpinner />;

    const filteredCustomers = customers.filter(c => {
      if (!query || query.trim() === '') return true;
      const q = query.toLowerCase();
      return (c.name || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.phone || '').toLowerCase().includes(q) || (String(c.customerId || c._id) || '').toLowerCase().includes(q);
    });

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer List</h1>
            <p className="text-sm text-gray-500">Customers who ordered from your service</p>
          </div>
          <div className="w-72">
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, email or phone" className="w-full border px-3 py-2 rounded-lg" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No customers found</div>
          ) : (
            <div className="space-y-4">
              {filteredCustomers.map((customer) => (
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
          )}
        </div>
      </div>
    );
  };

  // š™ï¸ 8. PROVIDER SETTINGS
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
      address: contact.address || {},
      // Payment details (optional)
      bankDetails: provider.bankDetails || { accountHolder: '', bankName: '', accountNumber: '', ifsc: '' },
      upiId: provider.upiId || '',
      upiNumber: provider.upiNumber || ''
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
        address: c.address || prev.address,
        bankDetails: p.bankDetails || prev.bankDetails,
        upiId: p.upiId || prev.upiId,
        upiNumber: p.upiNumber || prev.upiNumber
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
        ,
        // Optional payment details
        bankDetails: form.bankDetails,
        upiId: form.upiId,
        upiNumber: form.upiNumber
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Price per Can ()</label>
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

          {/* Payment Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Payment Details (optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                <input value={form.bankDetails.accountHolder} onChange={e => setForm({...form, bankDetails: {...form.bankDetails, accountHolder: e.target.value}})} type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                <input value={form.bankDetails.bankName} onChange={e => setForm({...form, bankDetails: {...form.bankDetails, bankName: e.target.value}})} type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                <input value={form.bankDetails.accountNumber} onChange={e => setForm({...form, bankDetails: {...form.bankDetails, accountNumber: e.target.value}})} type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                <input value={form.bankDetails.ifsc} onChange={e => setForm({...form, bankDetails: {...form.bankDetails, ifsc: e.target.value}})} type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2" />
              </div>
              <div className="md:col-span-2">
                <div className="flex flex-col md:flex-row items-center gap-3">
                  <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-1">UPI ID</label>
                    <input value={form.upiId} onChange={e => setForm({...form, upiId: e.target.value})} placeholder="example@bank" type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                  </div>
                  <div className="flex items-center justify-center px-4 pt-6">
                    <span className="text-gray-400 font-semibold text-lg">OR</span>
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-1">UPI Number</label>
                    <input value={form.upiNumber} onChange={e => setForm({...form, upiNumber: e.target.value})} placeholder="98XXXXXXXX" type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Provide either UPI ID or phone number. All fields are optional.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={saveProfile} className="bg-primary-600 text-white px-6 py-2 rounded-lg">Save Settings</button>
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
      case 'order-history': return <HistoryPage />;
      case 'earnings': return <EarningsPage />;
      case 'revenue': return <EarningsPage />;
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
