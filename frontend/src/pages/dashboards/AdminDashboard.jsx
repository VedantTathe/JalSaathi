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
  Eye
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { adminApi } from '../../services/api';
import { formatCurrency, formatDateTime, getStatusColor, getStatusText } from '../../utils/helpers';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState(null);
  
  // Fetch dashboard data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery(
    'admin-dashboard',
    adminApi.getDashboardStats
  );
  
  // Fetch pending providers
  const { data: pendingProviders, isLoading: providersLoading } = useQuery(
    'pending-providers',
    () => adminApi.getPendingProviders({ limit: 10 })
  );
  
  // Fetch recent orders
  const { data: recentOrders, isLoading: ordersLoading } = useQuery(
    'recent-orders',
    () => adminApi.getAllOrders({ limit: 10 })
  );

  // Approve provider mutation
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

  // Reject provider mutation
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

  const navigation = [
    { key: 'dashboard', name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { key: 'providers', name: 'Providers', href: '/providers', icon: Store },
    { key: 'customers', name: 'Customers', href: '/customers', icon: Users },
    { key: 'deliveries', name: 'Delivery Boys', href: '/delivery-personnel', icon: Truck },
    { key: 'orders', name: 'Orders', href: '/orders', icon: Package },
    { key: 'reports', name: 'Reports', href: '/reports', icon: TrendingUp },
    { key: 'settings', name: 'Settings', href: '/settings', icon: Settings },
  ];

  const stats = dashboardData || {};
  const providers = pendingProviders?.providers || [];
  const orders = recentOrders?.orders || [];

  if (dashboardLoading) {
    return (
      <DashboardLayout navigation={navigation} activeTab="dashboard">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navigation={navigation} activeTab="dashboard">
      <div className="space-y-8">
        {/* Header */}
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

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
          
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(stats.totalRevenue || 0)}
                </p>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-success-600">
                    ↗ {formatCurrency(stats.revenueThisMonth || 0)} this month
                  </span>
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-success-500" />
            </div>
          </div>
        </div>

        {/* Pending Provider Approvals */}
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

        {/* Recent Orders */}
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

        {/* Quick Actions & System Health */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <h4 className="font-medium text-gray-900 mb-4">Quick Actions</h4>
            <div className="space-y-3">
              <button className="btn-primary w-full text-sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Provider
              </button>
              <button className="btn-outline w-full text-sm">
                <Settings className="h-4 w-4 mr-2" />
                System Settings
              </button>
              <button className="btn-outline w-full text-sm">
                <TrendingUp className="h-4 w-4 mr-2" />
                Generate Report
              </button>
            </div>
          </div>

          <div className="card">
            <h4 className="font-medium text-gray-900 mb-4">System Health</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>API Status</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-success-500 rounded-full mr-2"></div>
                  <span className="text-success-600">Online</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Database</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-success-500 rounded-full mr-2"></div>
                  <span className="text-success-600">Connected</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Payment Gateway</span>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-success-500 rounded-full mr-2"></div>
                  <span className="text-success-600">Active</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h4 className="font-medium text-gray-900 mb-4">Recent Activity</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center text-gray-600">
                <CheckCircle className="h-4 w-4 text-success-500 mr-2" />
                Provider approved (2 min ago)
              </div>
              <div className="flex items-center text-gray-600">
                <Package className="h-4 w-4 text-primary-500 mr-2" />
                New order placed (5 min ago)
              </div>
              <div className="flex items-center text-gray-600">
                <UserPlus className="h-4 w-4 text-water-500 mr-2" />
                Customer registered (10 min ago)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Provider Details Modal */}
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
    </DashboardLayout>
  );
};

// Provider Approval Card Component
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

// Provider Details Modal Component
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
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
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

          {/* Address */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Business Address</h4>
            <p className="text-sm text-gray-600">
              {provider.address?.street}, {provider.address?.area}<br />
              {provider.address?.city} - {provider.address?.pincode}
            </p>
          </div>

          {/* Business Hours */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Business Hours</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <p>Opens: {provider.businessHours?.open || 'Not specified'}</p>
              <p>Closes: {provider.businessHours?.close || 'Not specified'}</p>
            </div>
          </div>

          {/* Documents */}
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

        {/* Actions */}
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

export default AdminDashboard;