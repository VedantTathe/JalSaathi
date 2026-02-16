import axios from 'axios';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_APP_API_BASE_URL || 'http://localhost:5000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jalsaathi_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Remove invalid token
      localStorage.removeItem('jalsaathi_token');
      
      // Only redirect if not already on auth pages
      const authPages = ['/login', '/register'];
      const currentPath = window.location.pathname;
      
      if (!authPages.includes(currentPath)) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authApi = {
  login: (email, password) => apiClient.post('/auth/login', { email, password }),
  register: (userData) => apiClient.post('/auth/register', userData),
  registerProvider: (providerData) => apiClient.post('/auth/register/provider', providerData),
  logout: () => apiClient.post('/auth/logout'),
  verifyToken: () => apiClient.get('/auth/verify-token'),
  getProfile: () => apiClient.get('/auth/profile'),
  updateProfile: (profileData) => apiClient.put('/auth/profile', profileData),
  changePassword: (currentPassword, newPassword) => 
    apiClient.post('/auth/change-password', { currentPassword, newPassword }),
};

// User API
export const userApi = {
  getDashboard: () => apiClient.get('/user/dashboard'),
  getNearbyProviders: (area) => apiClient.get(`/user/nearby-providers?area=${area}`),
  getCustomerOrders: (params) => apiClient.get('/user/orders', { params }),
  rateOrder: (orderId, rating, feedback) => 
    apiClient.post(`/user/orders/${orderId}/rate`, { rating, feedback }),
  updateAddress: (address) => apiClient.put('/user/update-address', { address }),
  getOrderHistory: (params) => apiClient.get('/user/order-history', { params }),
  getPayments: (params) => apiClient.get('/user/payments', { params }),
  placeOrder: (orderData) => apiClient.post('/order/create', orderData),
};

// Address API
export const addressApi = {
  getAddresses: () => apiClient.get('/address'),
  createAddress: (addressData) => apiClient.post('/address', addressData),
  updateAddress: (addressId, addressData) => apiClient.put(`/address/${addressId}`, addressData),
  deleteAddress: (addressId) => apiClient.delete(`/address/${addressId}`),
  setDefaultAddress: (addressId) => apiClient.patch(`/address/${addressId}/set-default`),
};

// Provider API
export const providerApi = {
  toggleOnlineStatus: () => apiClient.patch('/provider/toggle-status'),
  updateProfile: (providerData) => apiClient.put('/provider/update-profile', providerData),
  getOrders: (params) => apiClient.get('/provider/orders', { params }),
  acceptOrder: (orderId) => apiClient.patch(`/provider/orders/${orderId}/accept`),
  rejectOrder: (orderId, reason) => apiClient.patch(`/provider/orders/${orderId}/reject`, { reason }),
  assignDeliveryBoy: (orderId, deliveryBoyId) => 
    apiClient.patch(`/provider/orders/${orderId}/assign-delivery`, { deliveryBoyId }),
  getDeliveryBoys: () => apiClient.get('/provider/delivery-boys'),
  addDeliveryBoy: (deliveryBoyData) => apiClient.post('/provider/delivery-boys', deliveryBoyData),
  removeDeliveryBoy: (deliveryBoyId) => apiClient.delete(`/provider/delivery-boys/${deliveryBoyId}`),
  getAnalytics: () => apiClient.get('/provider/analytics'),
  getCustomers: (params) => apiClient.get('/provider/customers', { params }),
  getHistory: (params) => apiClient.get('/provider/history', { params }),
};

// Order API
export const orderApi = {
  createOrder: (orderData) => apiClient.post('/order/create', orderData),
  getMyOrders: (params) => apiClient.get('/order/my-orders', { params }),
  getOrderById: (orderId) => apiClient.get(`/order/${orderId}`),
  trackOrder: (orderId) => apiClient.get(`/order/${orderId}/track`),
  cancelOrder: (orderId, reason) => apiClient.patch(`/order/${orderId}/cancel`, { reason }),
  getAllOrders: (params) => apiClient.get('/order', { params }),
  adminCancelOrder: (orderId, reason) => apiClient.patch(`/order/${orderId}/admin-cancel`, { reason }),
  createPayment: (orderId) => apiClient.post(`/order/${orderId}/payment/create`),
  verifyPayment: (orderId, payload) => apiClient.post(`/order/${orderId}/payment/verify`, payload),
};

// Delivery API
export const deliveryApi = {
  getAssignedOrders: () => apiClient.get('/delivery/assigned-orders'),
  updateDeliveryStatus: (orderId, status, notes) => 
    apiClient.patch(`/delivery/orders/${orderId}/update-status`, { status, notes }),
  markAsDelivered: (orderId, deliveryNotes) => 
    apiClient.patch(`/delivery/orders/${orderId}/mark-delivered`, { deliveryNotes }),
  markPaymentReceived: (orderId) => 
    apiClient.patch(`/delivery/orders/${orderId}/mark-payment-received`),
  getDeliveryHistory: (params) => apiClient.get('/delivery/delivery-history', { params }),
  getPerformanceStats: () => apiClient.get('/delivery/performance'),
};

// Admin API
export const adminApi = {
  // Users
  getAllUsers: (params) => apiClient.get('/admin/users', { params }),
  getUserById: (userId) => apiClient.get(`/admin/users/${userId}`),
  toggleUserStatus: (userId) => apiClient.patch(`/admin/users/${userId}/toggle-status`),
  deleteUser: (userId) => apiClient.delete(`/admin/users/${userId}`),
  
  // Providers
  getAllProviders: (params) => apiClient.get('/admin/providers', { params }),
  getPendingProviders: (params) => apiClient.get('/admin/providers', { params: { ...params, isApproved: 'false' } }),
  getProviderById: (providerId) => apiClient.get(`/admin/providers/${providerId}`),
  approveProvider: (providerId) => apiClient.patch(`/admin/providers/${providerId}/approve`),
  rejectProvider: (providerId, reason) => apiClient.patch(`/admin/providers/${providerId}/reject`, { reason }),
  toggleProviderStatus: (providerId) => apiClient.patch(`/admin/providers/${providerId}/toggle-status`),
  
  // Orders
  getAllOrders: (params) => apiClient.get('/admin/orders', { params }),
  getOrderStatistics: () => apiClient.get('/admin/orders/statistics'),
  cancelOrder: (orderId, reason) => apiClient.patch(`/admin/orders/${orderId}/cancel`, { reason }),
  
  // Analytics
  getDashboard: () => apiClient.get('/admin/dashboard'),
  getDashboardStats: () => apiClient.get('/admin/dashboard'),
  getSystemOverview: () => apiClient.get('/admin/analytics/overview'),
  getRevenueAnalytics: (params) => apiClient.get('/admin/analytics/revenue', { params }),
  getPerformanceAnalytics: () => apiClient.get('/admin/analytics/performance'),
  
  // Maintenance
  cleanupCancelledOrders: () => apiClient.post('/admin/maintenance/cleanup-cancelled-orders'),
  getSystemHealth: () => apiClient.get('/admin/system/health'),
  
  // Settlements
  getAllSettlements: (params) => apiClient.get('/admin/settlements', { params }),
  getSettlementStats: () => apiClient.get('/admin/settlements/stats'),
  createSettlement: (data) => apiClient.post('/admin/settlements/create', data),
  updateSettlementStatus: (settlementId, data) => apiClient.patch(`/admin/settlements/${settlementId}/status`, data),
  completeSettlement: (settlementId, data) => apiClient.post(`/admin/settlements/${settlementId}/complete`, data),
  createMonthlySettlements: () => apiClient.post('/admin/settlements/create-monthly'),
};

// Settlement API (for providers)
export const settlementApi = {
  getMySettlements: () => apiClient.get('/settlement/provider/my-settlements'),
  getMyEarnings: () => apiClient.get('/settlement/provider/earnings'),
  getSettlementById: (settlementId) => apiClient.get(`/settlement/${settlementId}`),
};

export default apiClient;