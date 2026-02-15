import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Package, Filter, Search, Eye, Calendar, MapPin } from 'lucide-react';
import { userApi } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency, formatDateTime, getStatusColor, getStatusText } from '../utils/helpers';
import { Link } from 'react-router-dom';

const Orders = () => {
  const [filters, setFilters] = useState({
    status: '',
    dateRange: '',
    page: 1,
    limit: 10
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch orders
  const { data: ordersData, isLoading } = useQuery(
    ['user-orders', filters],
    () => userApi.getOrders(filters),
    {
      keepPreviousData: true
    }
  );

  const orders = ordersData?.orders || [];
  const pagination = ordersData?.pagination || {};

  const statusOptions = [
    { value: '', label: 'All Orders' },
    { value: 'pending', label: 'Pending' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'out_for_delivery', label: 'Out for Delivery' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'rejected', label: 'Rejected' }
  ];

  const dateRangeOptions = [
    { value: '', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: '3months', label: 'Last 3 Months' }
  ];

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const filteredOrders = orders.filter(order =>
    order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.providerId?.businessName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading && filters.page === 1) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-600 mt-2">Track and manage all your water delivery orders</p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input-field pl-10 w-full sm:w-64"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="input-field pl-10 pr-8 appearance-none w-full sm:w-48"
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <select
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                  className="input-field pl-10 pr-8 appearance-none w-full sm:w-48"
                >
                  {dateRangeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Order Count */}
            <div className="text-sm text-gray-600">
              Showing {filteredOrders.length} of {pagination.total || 0} orders
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => (
              <OrderCard key={order._id} order={order} />
            ))
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
              <div className="text-center">
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || filters.status || filters.dateRange
                    ? 'Try adjusting your search or filters'
                    : "You haven't placed any orders yet"
                  }
                </p>
                {!searchTerm && !filters.status && !filters.dateRange && (
                  <Link to="/dashboard" className="btn-primary">
                    Place Your First Order
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {pagination.currentPage} of {pagination.totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleFilterChange('page', Math.max(1, filters.page - 1))}
                  disabled={filters.page <= 1 || isLoading}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handleFilterChange('page', Math.min(pagination.totalPages, filters.page + 1))}
                  disabled={filters.page >= pagination.totalPages || isLoading}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading overlay for pagination */}
        {isLoading && filters.page > 1 && (
          <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6">
              <LoadingSpinner size="large" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Order Card Component
const OrderCard = ({ order }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
            <Package className="h-6 w-6 text-primary-600" />
          </div>
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">
                Order #{order.orderNumber}
              </h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                {getStatusText(order.status)}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Ordered on {formatDateTime(order.createdAt)}
            </p>
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="h-4 w-4 mr-1" />
              {order.deliveryAddress?.area}, {order.deliveryAddress?.city}
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(order.items?.totalPrice)}
          </p>
          <p className="text-sm text-gray-600">
            {order.items?.quantity} water cans
          </p>
        </div>
      </div>

      {/* Provider Info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">{order.providerId?.businessName}</p>
            <p className="text-sm text-gray-600">{order.providerId?.area}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Price per can</p>
            <p className="font-medium text-gray-900">
              {formatCurrency(order.items?.pricePerCan)}
            </p>
          </div>
        </div>
      </div>

      {/* Order Timeline */}
      {order.timeline && order.timeline.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-900 mb-3">Order Timeline</h4>
          <div className="space-y-2">
            {order.timeline.slice(-3).map((event, index) => (
              <div key={index} className="flex items-center text-sm">
                <div className="w-2 h-2 bg-primary-500 rounded-full mr-3"></div>
                <span className="text-gray-600">{event.status}</span>
                <span className="text-gray-500 ml-auto">
                  {formatDateTime(event.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t">
        <div className="space-y-1">
          <p className="text-sm text-gray-600">Payment Method</p>
          <p className="font-medium text-gray-900 capitalize">
            {order.paymentMethod?.replace('_', ' ')}
          </p>
        </div>

        <div className="flex space-x-3">
          {order.status === 'delivered' && (
            <button className="btn-outline text-sm">
              Download Invoice
            </button>
          )}
          
          {['out_for_delivery', 'assigned'].includes(order.status) && (
            <Link to={`/track-order/${order._id}`} className="btn-primary text-sm">
              Track Order
            </Link>
          )}
          
          <Link to={`/orders/${order._id}`} className="btn-outline text-sm">
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Orders;