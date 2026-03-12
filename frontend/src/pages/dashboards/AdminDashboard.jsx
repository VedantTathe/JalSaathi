import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Users, 
  Store, 
  Truck, 
  Package, 
  TrendingUp, 
  AlertTriangle,
  Shield,
  Settings,
  BarChart3,
  UserPlus,
  UserX,
  CheckCircle,
  XCircle,
  Eye,
  DollarSign,
  Calendar,
  Filter,
  Download,
  CreditCard
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { adminApi } from '../../services/api';
import { formatCurrency, formatDateTime, getStatusColor, getStatusText } from '../../utils/helpers';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery(
    'admin-dashboard',
    adminApi.getDashboardStats
  );
  
  const { data: pendingProviders, isLoading: providersLoading } = useQuery(
    'pending-providers',
    () => adminApi.getPendingProviders({ limit: 10 })
  );
  
  const { data: recentOrders, isLoading: ordersLoading } = useQuery(
    'recent-orders',
    () => adminApi.getAllOrders({ limit: 10 })
  );

  const approveProviderMutation = useMutation(
    (providerId) => adminApi.approveProvider(providerId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('pending-providers');
        queryClient.invalidateQueries('admin-dashboard');
        toast.success('Provider approved successfully!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to approve provider');
      }
    }
  );

  const rejectProviderMutation = useMutation(
    ({ providerId, reason }) => adminApi.rejectProvider(providerId, reason),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('pending-providers');
        toast.success('Provider rejected');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to reject provider');
      }
    }
  );

  const handleNavigationClick = (key) => {
    setActiveTab(key);
  };

  const navigation = [
    { 
      key: 'dashboard', 
      name: 'Dashboard', 
      icon: BarChart3,
      onClick: () => handleNavigationClick('dashboard')
    },
    { 
      key: 'providers', 
      name: 'Providers', 
      icon: Store,
      onClick: () => handleNavigationClick('providers')
    },
  ];

  const stats = dashboardData?.data || {};
  const providers = pendingProviders?.data?.providers || [];
  const orders = recentOrders?.data?.orders || [];

  if (dashboardLoading) {
    return (
      <DashboardLayout navigation={navigation} activeTab={activeTab}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navigation={navigation} activeTab={activeTab}>
      {/* Providers Section - Accessed from Sidebar */}
      {activeTab === 'providers' && <ProvidersManagement />}

      {/* Dashboard Section - With Tabs */}
      {activeTab === 'dashboard' && (
        <>
          <div className="mb-6">
            <div className="flex space-x-4 border-b border-gray-200">
              <button
                onClick={() => handleNavigationClick('dashboard')}
                className="px-4 py-2 font-medium transition-colors text-primary-600 border-b-2 border-primary-600"
              >
                Dashboard Overview
              </button>
              <button
                onClick={() => handleNavigationClick('settlements')}
                className="px-4 py-2 font-medium transition-colors text-gray-600 hover:text-gray-900"
              >
                Settlements Management
              </button>
            </div>
          </div>

          <DashboardOverview
            stats={stats}
            providers={providers}
            orders={orders}
            providersLoading={providersLoading}
            ordersLoading={ordersLoading}
            approveProviderMutation={approveProviderMutation}
            rejectProviderMutation={rejectProviderMutation}
            setSelectedProvider={setSelectedProvider}
            selectedProvider={selectedProvider}
          />
        </>
      )}

      {/* Settlements Section */}
      {activeTab === 'settlements' && (
        <>
          <div className="mb-6">
            <div className="flex space-x-4 border-b border-gray-200">
              <button
                onClick={() => handleNavigationClick('dashboard')}
                className="px-4 py-2 font-medium transition-colors text-gray-600 hover:text-gray-900"
              >
                Dashboard Overview
              </button>
              <button
                onClick={() => handleNavigationClick('settlements')}
                className="px-4 py-2 font-medium transition-colors text-primary-600 border-b-2 border-primary-600"
              >
                Settlements Management
              </button>
            </div>
          </div>

          <SettlementsManagement />
        </>
      )}
    </DashboardLayout>
  );
};

const DashboardOverview = ({ 
  stats, 
  providers, 
  orders, 
  providersLoading, 
  ordersLoading, 
  approveProviderMutation, 
  rejectProviderMutation, 
  setSelectedProvider,
  selectedProvider 
}) => {
  return (
    <>
      <div className="space-y-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">JalSaathi Admin Panel</h2>
              <p className="text-gray-600">System overview and management</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm text-gray-600">System Status</p>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-success-500 rounded-full"></div>
                  <span className="text-success-600 font-medium">All Systems Operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Statistics - Prominent Display */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Today's Revenue */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="h-5 w-5" />
                  <p className="text-sm font-medium opacity-90 uppercase tracking-wide">Today's Revenue</p>
                </div>
                <p className="text-5xl font-bold mb-2">
                  {formatCurrency(stats.today?.revenue || 0)}
                </p>
                <div className="flex items-center space-x-4 mt-3">
                  <div>
                    <p className="text-xs opacity-75">Orders Today</p>
                    <p className="text-xl font-semibold">{stats.today?.orders || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-full p-6">
                <DollarSign className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>

          {/* This Month's Revenue */}
          <div className="bg-gradient-to-r from-success-500 to-success-600 rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="h-5 w-5" />
                  <p className="text-sm font-medium opacity-90 uppercase tracking-wide">This Month's Revenue</p>
                </div>
                <p className="text-5xl font-bold mb-2">
                  {formatCurrency(stats.monthly?.revenue || 0)}
                </p>
                <div className="flex items-center space-x-4 mt-3">
                  <div>
                    <p className="text-xs opacity-75">Orders This Month</p>
                    <p className="text-xl font-semibold">{stats.monthly?.orders || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white bg-opacity-20 rounded-full p-6">
                <TrendingUp className="h-12 w-12 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Total Revenue - Overall Summary */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div className="text-white">
              <p className="text-sm font-medium opacity-90 uppercase tracking-wide mb-1">Total Platform Revenue (All Time)</p>
              <p className="text-4xl font-bold mb-2">
                {formatCurrency(stats.totalRevenue || 0)}
              </p>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4" />
                  <span className="text-sm">{stats.totalOrders || 0} Total Orders</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Store className="h-4 w-4" />
                  <span className="text-sm">{stats.activeProviders || 0} Active Providers</span>
                </div>
              </div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-full p-4">
              <CreditCard className="h-10 w-10 text-white" />
            </div>
          </div>
        </div>

        {/* Other Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers || 0}</p>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-success-600">↗ +{stats.newUsersThisMonth || 0} this month</span>
                </div>
              </div>
              <Users className="h-8 w-8 text-primary-500" />
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Providers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeProviders || 0}</p>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-warning-600">{stats.pendingProviders || 0} pending approval</span>
                </div>
              </div>
              <Store className="h-8 w-8 text-success-500" />
            </div>
          </div>
          
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOrders || 0}</p>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-success-600">↗ +{stats.ordersThisMonth || 0} this month</span>
                </div>
              </div>
              <Package className="h-8 w-8 text-water-500" />
            </div>
          </div>
        </div>

        {providers.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Pending Provider Approvals</h3>
                <p className="text-sm text-gray-600">{providers.length} providers waiting for approval</p>
              </div>
              <AlertTriangle className="h-5 w-5 text-warning-500" />
            </div>
            
            {providersLoading ? (
              <div className="flex items-center justify-center h-32">
                <LoadingSpinner />
              </div>
            ) : (
              <div className="space-y-4">
                {providers.slice(0, 5).map((provider) => (
                  <ProviderApprovalCard
                    key={provider._id}
                    provider={provider}
                    onApprove={() => approveProviderMutation.mutate(provider._id)}
                    onReject={(reason) => rejectProviderMutation.mutate({ providerId: provider._id, reason })}
                    onViewDetails={() => setSelectedProvider(provider)}
                    isLoading={approveProviderMutation.isLoading || rejectProviderMutation.isLoading}
                  />
                ))}
                
                {providers.length > 5 && (
                  <div className="text-center pt-4">
                    <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                      View All Pending ({providers.length - 5} more)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
            <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View All Orders
            </button>
          </div>
          
          {ordersLoading ? (
            <div className="flex items-center justify-center h-32">
              <LoadingSpinner />
            </div>
          ) : orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Order</th>
                    <th className="table-header-cell">Customer</th>
                    <th className="table-header-cell">Provider</th>
                    <th className="table-header-cell">Amount</th>
                    <th className="table-header-cell">Status</th>
                    <th className="table-header-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {orders.slice(0, 8).map((order) => (
                    <tr key={order._id}>
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-gray-900">#{order.orderNumber}</p>
                          <p className="text-sm text-gray-600">{order.items?.quantity} cans</p>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-gray-900">{order.customerId?.name}</p>
                          <p className="text-sm text-gray-600">{order.customerId?.phone}</p>
                        </div>
                      </td>
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-gray-900">{order.providerId?.businessName}</p>
                          <p className="text-sm text-gray-600">{order.providerId?.area}</p>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="font-medium">
                          {formatCurrency(order.items?.totalPrice)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className="text-sm text-gray-600">
                          {formatDateTime(order.createdAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No recent orders</p>
            </div>
          )}
        </div>
      </div>

      {selectedProvider && (
        <ProviderDetailsModal 
          provider={selectedProvider}
          onClose={() => setSelectedProvider(null)}
          onApprove={() => {
            approveProviderMutation.mutate(selectedProvider._id);
            setSelectedProvider(null);
          }}
          onReject={(reason) => {
            rejectProviderMutation.mutate({ providerId: selectedProvider._id, reason });
            setSelectedProvider(null);
          }}
        />
      )}
    </>
  );
};

const ProvidersManagement = () => {
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedProviders, setExpandedProviders] = useState(new Set());

  const { data: providersData, isLoading: providersLoading } = useQuery(
    ['all-providers', filterStatus],
    () => adminApi.getAllProviders({ 
      isApproved: filterStatus === 'approved' ? 'true' : filterStatus === 'pending' ? 'false' : undefined 
    })
  );

  const providers = providersData?.data?.providers || [];

  const toggleProvider = (providerId) => {
    const newExpanded = new Set(expandedProviders);
    if (newExpanded.has(providerId)) {
      newExpanded.delete(providerId);
    } else {
      newExpanded.add(providerId);
    }
    setExpandedProviders(newExpanded);
  };

  const expandAll = () => {
    setExpandedProviders(new Set(providers.map(p => p._id)));
  };

  const collapseAll = () => {
    setExpandedProviders(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Providers Management</h2>
            <p className="text-gray-600">View all providers and their customer orders</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={expandAll}
              className="btn-secondary text-sm"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="btn-secondary text-sm"
            >
              Collapse All
            </button>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
            >
              <option value="all">All Providers</option>
              <option value="approved">Approved Only</option>
              <option value="pending">Pending Approval</option>
            </select>
          </div>
        </div>
      </div>

      {/* Providers List */}
      {providersLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" />
        </div>
      ) : providers.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          {providers.map((provider) => (
            <ProviderCardWithOrders
              key={provider._id}
              provider={provider}
              isExpanded={expandedProviders.has(provider._id)}
              onToggle={() => toggleProvider(provider._id)}
              onViewDetails={() => setSelectedProvider(provider)}
            />
          ))}
        </div>
      ) : (
        <div className="card text-center py-12">
          <Store className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Providers Found</h3>
          <p className="text-gray-600">No providers match the selected filter.</p>
        </div>
      )}

      {selectedProvider && (
        <ProviderOrdersModal
          provider={selectedProvider}
          onClose={() => setSelectedProvider(null)}
        />
      )}
    </div>
  );
};

const ProviderCardWithOrders = ({ provider, isExpanded, onToggle, onViewDetails }) => {
  const { data: providerData, isLoading } = useQuery(
    ['provider-orders', provider._id],
    () => adminApi.getProviderById(provider._id),
    { enabled: isExpanded }
  );

  const orders = providerData?.data?.orders || [];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Provider Header */}
      <div className="p-6 hover:bg-gray-50 transition-colors">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-primary-100 rounded-full p-3">
                <Store className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{provider.businessName}</h3>
                <p className="text-sm text-gray-600">{provider.area}, {provider.city}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Contact Person</p>
                <p className="font-semibold text-gray-900">{provider.userId?.name || 'N/A'}</p>
                <p className="text-xs text-gray-600">{provider.userId?.phone || 'N/A'}</p>
              </div>

              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Total Orders</p>
                <p className="text-2xl font-bold text-blue-600">{provider.orderCount || 0}</p>
              </div>

              <div className="bg-success-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Total Revenue</p>
                <p className="text-xl font-bold text-success-600">{formatCurrency(provider.totalRevenue || 0)}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Status</p>
                <div className="flex flex-col space-y-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    provider.isApproved ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'
                  }`}>
                    {provider.isApproved ? 'Approved' : 'Pending'}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    provider.isOnline ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {provider.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="ml-4 flex flex-col space-y-2">
            <button
              onClick={onToggle}
              className="btn-primary flex items-center space-x-2"
            >
              <Package className="h-4 w-4" />
              <span>{isExpanded ? 'Hide Orders' : 'Show Orders'}</span>
            </button>
            <button
              onClick={onViewDetails}
              className="btn-secondary flex items-center space-x-2 text-sm"
            >
              <Eye className="h-4 w-4" />
              <span>Full Details</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customer Orders Section */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : orders.length > 0 ? (
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-lg font-semibold text-gray-900">
                  Customer Orders ({orders.length})
                </h4>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead className="table-header bg-gray-100">
                      <tr>
                        <th className="table-header-cell">Order #</th>
                        <th className="table-header-cell">Customer</th>
                        <th className="table-header-cell">Contact</th>
                        <th className="table-header-cell">Address</th>
                        <th className="table-header-cell">Quantity</th>
                        <th className="table-header-cell">Amount</th>
                        <th className="table-header-cell">Status</th>
                        <th className="table-header-cell">Payment</th>
                        <th className="table-header-cell">Date</th>
                      </tr>
                    </thead>
                    <tbody className="table-body">
                      {orders.map((order) => (
                        <tr key={order._id} className="hover:bg-gray-50">
                          <td className="table-cell">
                            <span className="font-medium text-primary-600">#{order.orderNumber}</span>
                          </td>
                          <td className="table-cell">
                            <p className="font-medium text-gray-900">{order.customerId?.name || 'N/A'}</p>
                          </td>
                          <td className="table-cell">
                            <p className="text-sm text-gray-600">{order.customerId?.phone || 'N/A'}</p>
                            <p className="text-xs text-gray-500">{order.customerId?.email || 'N/A'}</p>
                          </td>
                          <td className="table-cell">
                            <div className="max-w-xs">
                              <p className="text-sm text-gray-900">{order.deliveryAddress?.street}</p>
                              <p className="text-xs text-gray-600">
                                {order.deliveryAddress?.area}, {order.deliveryAddress?.city}
                              </p>
                            </div>
                          </td>
                          <td className="table-cell">
                            <span className="font-medium">{order.items?.quantity || 0} cans</span>
                          </td>
                          <td className="table-cell">
                            <span className="font-bold text-gray-900">{formatCurrency(order.items?.totalPrice || 0)}</span>
                          </td>
                          <td className="table-cell">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                              {getStatusText(order.status)}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              order.paymentStatus === 'paid' ? 'bg-success-100 text-success-700' :
                              order.paymentStatus === 'pending' ? 'bg-warning-100 text-warning-700' :
                              'bg-error-100 text-error-700'
                            }`}>
                              {order.paymentStatus}
                            </span>
                          </td>
                          <td className="table-cell">
                            <span className="text-sm text-gray-600">{formatDateTime(order.createdAt)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Yet</h3>
              <p className="text-gray-600">This provider hasn't received any orders yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ProviderCard = ({ provider, onViewDetails }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-3">
            <div className="bg-primary-100 rounded-full p-3">
              <Store className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{provider.businessName}</h3>
              <p className="text-sm text-gray-600">{provider.area}, {provider.city}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div className="bg-gray-50 rounded-lg p-3">\n              <p className="text-xs text-gray-600 mb-1">Contact Person</p>
              <p className="font-semibold text-gray-900">{provider.userId?.name || 'N/A'}</p>
              <p className="text-xs text-gray-600">{provider.userId?.phone || 'N/A'}</p>
            </div>

            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">Total Orders</p>
              <p className="text-2xl font-bold text-blue-600">{provider.orderCount || 0}</p>
            </div>

            <div className="bg-success-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">Total Revenue</p>
              <p className="text-xl font-bold text-success-600">{formatCurrency(provider.totalRevenue || 0)}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600 mb-1">Status</p>
              <div className="flex flex-col space-y-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  provider.isApproved ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'
                }`}>
                  {provider.isApproved ? 'Approved' : 'Pending'}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  provider.isOnline ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {provider.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onViewDetails}
          className="ml-4 btn-primary flex items-center space-x-2"
        >
          <Eye className="h-4 w-4" />
          <span>View Orders</span>
        </button>
      </div>
    </div>
  );
};

const ProviderOrdersModal = ({ provider, onClose }) => {
  const { data: providerData, isLoading } = useQuery(
    ['provider-details', provider._id],
    () => adminApi.getProviderById(provider._id),
    { enabled: !!provider._id }
  );

  const orders = providerData?.data?.orders || [];
  const statistics = providerData?.data?.statistics || {};

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
                <Store className="h-6 w-6 text-primary-600" />
                <span>{provider.businessName} - Customer Orders</span>
              </h2>
              <p className="text-gray-600 mt-1">{provider.area}, {provider.city}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-900">{statistics.totalOrders || 0}</p>
                </div>
                <Package className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-3xl font-bold text-success-600">{formatCurrency(statistics.totalRevenue || 0)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-success-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Order Status</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {statistics.ordersByStatus?.map((stat) => (
                      <span key={stat._id} className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {stat._id}: {stat.count}
                      </span>
                    ))}
                  </div>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="large" />
            </div>
          ) : orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header sticky top-0 bg-gray-50">
                  <tr>
                    <th className="table-header-cell">Order #</th>
                    <th className="table-header-cell">Customer</th>
                    <th className="table-header-cell">Quantity</th>
                    <th className="table-header-cell">Amount</th>
                    <th className="table-header-cell">Status</th>
                    <th className="table-header-cell">Payment</th>
                    <th className="table-header-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {orders.map((order) => (
                    <tr key={order._id} className="hover:bg-gray-50">
                      <td className="table-cell">
                        <span className="font-medium text-primary-600">#{order.orderNumber}</span>
                      </td>
                      <td className="table-cell">
                        <div>
                          <p className="font-medium text-gray-900">{order.customerId?.name || 'N/A'}</p>
                          <p className="text-xs text-gray-600">{order.customerId?.phone || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className="font-medium">{order.items?.quantity || 0} cans</span>
                      </td>
                      <td className="table-cell">
                        <span className="font-bold text-gray-900">{formatCurrency(order.items?.totalPrice || 0)}</span>
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          order.paymentStatus === 'paid' ? 'bg-success-100 text-success-700' :
                          order.paymentStatus === 'pending' ? 'bg-warning-100 text-warning-700' :
                          'bg-error-100 text-error-700'
                        }`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className="text-sm text-gray-600">{formatDateTime(order.createdAt)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Yet</h3>
              <p className="text-gray-600">This provider hasn't received any orders yet.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="btn-secondary w-full">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const SettlementsManagement = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  const { data: settlementsData, isLoading: settlementsLoading } = useQuery(
    ['admin-settlements', statusFilter],
    () => adminApi.getAllSettlements({ status: statusFilter !== 'all' ? statusFilter : undefined })
  );

  const { data: settlementStats } = useQuery(
    'settlement-stats',
    adminApi.getSettlementStats
  );

  const createMonthlySettlementsMutation = useMutation(
    adminApi.createMonthlySettlements,
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-settlements');
        queryClient.invalidateQueries('settlement-stats');
        toast.success('Monthly settlements created successfully!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create settlements');
      }
    }
  );

  const updateSettlementStatusMutation = useMutation(
    ({ settlementId, status }) => adminApi.updateSettlementStatus(settlementId, status),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-settlements');
        queryClient.invalidateQueries('settlement-stats');
        toast.success('Settlement status updated!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update status');
      }
    }
  );

  const completeSettlementMutation = useMutation(
    ({ settlementId, data }) => adminApi.completeSettlement(settlementId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('admin-settlements');
        queryClient.invalidateQueries('settlement-stats');
        setShowCompleteModal(false);
        setSelectedSettlement(null);
        toast.success('Settlement completed successfully!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to complete settlement');
      }
    }
  );

  const settlements = settlementsData?.settlements || [];
  const stats = settlementStats || {
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0
  };

  const handleCompleteSettlement = (settlement) => {
    setSelectedSettlement(settlement);
    setShowCompleteModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Settlements</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
            </div>
            <DollarSign className="h-8 w-8 text-primary-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-warning-600">{stats.pending || 0}</p>
            </div>
            <Calendar className="h-8 w-8 text-warning-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Processing</p>
              <p className="text-2xl font-bold text-water-600">{stats.processing || 0}</p>
            </div>
            <CreditCard className="h-8 w-8 text-water-500" />
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-success-600">{stats.completed || 0}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-success-500" />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-gray-900">All Settlements</h3>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-field text-sm py-1"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => createMonthlySettlementsMutation.mutate()}
              disabled={createMonthlySettlementsMutation.isLoading}
              className="btn-primary text-sm"
            >
              {createMonthlySettlementsMutation.isLoading ? (
                <LoadingSpinner size="small" />
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Create Monthly Settlements
                </>
              )}
            </button>
            <button className="btn-outline text-sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {settlementsLoading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="large" />
          </div>
        ) : settlements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Provider</th>
                  <th className="table-header-cell">Period</th>
                  <th className="table-header-cell">Orders</th>
                  <th className="table-header-cell">Amount</th>
                  <th className="table-header-cell">Platform Fee</th>
                  <th className="table-header-cell">Net Amount</th>
                  <th className="table-header-cell">Status</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {settlements.map((settlement) => (
                  <tr key={settlement._id}>
                    <td className="table-cell">
                      <div>
                        <p className="font-medium text-gray-900">
                          {settlement.providerId?.businessName}
                        </p>
                        <p className="text-sm text-gray-600">
                          {settlement.providerId?.area}
                        </p>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div>
                        <p className="font-medium text-gray-900">
                          {new Date(settlement.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-gray-600">
                          {new Date(settlement.startDate).toLocaleDateString()} - {new Date(settlement.endDate).toLocaleDateString()}
                        </p>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="font-medium">{settlement.totalOrders}</span>
                    </td>
                    <td className="table-cell">
                      <span className="font-medium">
                        {formatCurrency(settlement.totalAmount)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="text-error-600">
                        {formatCurrency(settlement.platformFee)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="font-bold text-success-600">
                        {formatCurrency(settlement.netAmount)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        settlement.status === 'completed' ? 'bg-success-100 text-success-800' :
                        settlement.status === 'processing' ? 'bg-water-100 text-water-800' :
                        'bg-warning-100 text-warning-800'
                      }`}>
                        {settlement.status.charAt(0).toUpperCase() + settlement.status.slice(1)}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center space-x-2">
                        {settlement.status === 'pending' && (
                          <button
                            onClick={() => updateSettlementStatusMutation.mutate({
                              settlementId: settlement._id,
                              status: 'processing'
                            })}
                            className="text-water-600 hover:text-water-700 text-sm font-medium"
                          >
                            Process
                          </button>
                        )}
                        {settlement.status === 'processing' && (
                          <button
                            onClick={() => handleCompleteSettlement(settlement)}
                            className="text-success-600 hover:text-success-700 text-sm font-medium"
                          >
                            Complete
                          </button>
                        )}
                        <button className="text-primary-600 hover:text-primary-700">
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No settlements found</p>
            <p className="text-sm text-gray-500 mt-2">
              Create monthly settlements to process provider payments
            </p>
          </div>
        )}
      </div>

      {showCompleteModal && selectedSettlement && (
        <CompleteSettlementModal
          settlement={selectedSettlement}
          onClose={() => {
            setShowCompleteModal(false);
            setSelectedSettlement(null);
          }}
          onComplete={(data) => completeSettlementMutation.mutate({
            settlementId: selectedSettlement._id,
            data
          })}
          isLoading={completeSettlementMutation.isLoading}
        />
      )}
    </div>
  );
};

const ProviderApprovalCard = ({ provider, onApprove, onReject, onViewDetails, isLoading }) => {
  return (
    <div className="border border-warning-200 bg-warning-50 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center">
            <Store className="h-6 w-6 text-warning-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{provider.businessName}</p>
            <p className="text-sm text-gray-600">{provider.ownerName}</p>
            <p className="text-sm text-gray-600">{provider.area}, {provider.city}</p>
            <p className="text-xs text-gray-500">
              Applied {formatDateTime(provider.createdAt)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={onViewDetails}
            className="btn-outline text-sm"
          >
            <Eye className="h-4 w-4 mr-1" />
            View Details
          </button>
          <button
            onClick={() => onReject('Not meeting requirements')}
            disabled={isLoading}
            className="btn-error text-sm"
          >
            {isLoading ? (
              <LoadingSpinner size="small" />
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </>
            )}
          </button>
          <button
            onClick={onApprove}
            disabled={isLoading}
            className="btn-success text-sm"
          >
            {isLoading ? (
              <LoadingSpinner size="small" />
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const ProviderDetailsModal = ({ provider, onClose, onApprove, onReject }) => {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const handleReject = () => {
    if (rejectReason.trim()) {
      onReject(rejectReason);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container max-w-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900">Provider Details</h3>
          <p className="text-sm text-gray-600">Review provider application</p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Business Information</h4>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Name:</span> {provider.businessName}</p>
                <p><span className="font-medium">Owner:</span> {provider.ownerName}</p>
                <p><span className="font-medium">Phone:</span> {provider.phone}</p>
                <p><span className="font-medium">Email:</span> {provider.email}</p>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Location & Pricing</h4>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">Area:</span> {provider.area}</p>
                <p><span className="font-medium">City:</span> {provider.city}</p>
                <p><span className="font-medium">Price per Can:</span> {formatCurrency(provider.pricePerCan)}</p>
                <p><span className="font-medium">Min Order:</span> {provider.minimumOrder} cans</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Business Address</h4>
            <p className="text-sm text-gray-600">
              {provider.address?.street}, {provider.address?.area}<br />
              {provider.address?.city} - {provider.address?.pincode}
            </p>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Business Hours</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <p>Opens: {provider.businessHours?.open || 'Not specified'}</p>
              <p>Closes: {provider.businessHours?.close || 'Not specified'}</p>
            </div>
          </div>

          {provider.documents && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Business Documents</h4>
              <div className="space-y-2">
                {provider.documents.businessLicense && (
                  <div className="flex items-center text-sm">
                    <Shield className="h-4 w-4 text-success-500 mr-2" />
                    <span>Business License provided</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-8 pt-6 border-t">
          <div>
            <p className="text-xs text-gray-500">
              Application submitted on {formatDateTime(provider.createdAt)}
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button onClick={onClose} className="btn-secondary">
              Close
            </button>
            
            {!showRejectForm ? (
              <button
                onClick={() => setShowRejectForm(true)}
                className="btn-error"
              >
                Reject
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Rejection reason"
                  className="input-field text-sm w-40"
                />
                <button onClick={handleReject} className="btn-error text-sm">
                  Confirm
                </button>
              </div>
            )}
            
            <button onClick={onApprove} className="btn-success">
              Approve Provider
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CompleteSettlementModal = ({ settlement, onClose, onComplete, isLoading }) => {
  const [transactionId, setTransactionId] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (transactionId.trim()) {
      onComplete({
        transactionId: transactionId.trim(),
        notes: notes.trim()
      });
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900">Complete Settlement</h3>
          <p className="text-sm text-gray-600">
            Complete settlement for {settlement.providerId?.businessName}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Settlement Details</h4>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Period:</span>
                <span className="font-medium">
                  {new Date(settlement.startDate).toLocaleDateString()} - {new Date(settlement.endDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Orders:</span>
                <span className="font-medium">{settlement.totalOrders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-medium">{formatCurrency(settlement.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Platform Fee:</span>
                <span className="font-medium text-error-600">-{formatCurrency(settlement.platformFee)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold">Net Amount:</span>
                <span className="font-bold text-success-600 text-lg">
                  {formatCurrency(settlement.netAmount)}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction ID <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              placeholder="Enter bank transaction ID"
              className="input-field w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes"
              rows="3"
              className="input-field w-full"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-success"
              disabled={isLoading || !transactionId.trim()}
            >
              {isLoading ? (
                <LoadingSpinner size="small" />
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Settlement
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminDashboard;