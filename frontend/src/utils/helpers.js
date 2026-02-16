// Format currency (INR)
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) return 'NA';
  const num = Number(amount);
  if (isNaN(num)) return 'NA';
  return 'Rs. ' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

// Format date
export const formatDate = (date, options = {}) => {
  if (!date) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  
  return new Intl.DateTimeFormat('en-IN', defaultOptions).format(new Date(date));
};

// Format date and time
export const formatDateTime = (date, options = {}) => {
  if (!date) return '';
  
  const dateTimeOptions = options.dateOnly 
    ? {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }
    : {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      };
  
  return new Intl.DateTimeFormat('en-IN', dateTimeOptions).format(new Date(date));
};

// Format relative time (e.g., "2 hours ago")
export const formatRelativeTime = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const targetDate = new Date(date);
  const diffInSeconds = Math.floor((now - targetDate) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return formatDate(date);
};

// Get status color class
export const getStatusColor = (status) => {
  const colors = {
    pending: 'text-warning-700 bg-warning-100',
    accepted: 'text-primary-700 bg-primary-100',
    assigned: 'text-secondary-700 bg-secondary-100',
    out_for_delivery: 'text-purple-700 bg-purple-100',
    delivered: 'text-success-700 bg-success-100',
    cancelled: 'text-error-700 bg-error-100',
    online: 'text-success-700 bg-success-100',
    offline: 'text-gray-700 bg-gray-100',
    active: 'text-success-700 bg-success-100',
    inactive: 'text-error-700 bg-error-100',
    approved: 'text-success-700 bg-success-100',
    rejected: 'text-error-700 bg-error-100',
    paid: 'text-success-700 bg-success-100',
    unpaid: 'text-warning-700 bg-warning-100',
    failed: 'text-error-700 bg-error-100',
    refunded: 'text-gray-700 bg-gray-100',
  };
  
  return colors[status] || 'text-gray-700 bg-gray-100';
};

// Get status display text
export const getStatusText = (status) => {
  const statusTexts = {
    pending: 'Pending',
    accepted: 'Accepted',
    assigned: 'Assigned',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    online: 'Online',
    offline: 'Offline',
    active: 'Active',
    inactive: 'Inactive',
    approved: 'Approved',
    rejected: 'Rejected',
    paid: 'Paid',
    unpaid: 'Unpaid',
    failed: 'Failed',
    refunded: 'Refunded',
  };
  
  return statusTexts[status] || status;
};

// Validate email
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone number (Indian format)
export const isValidPhone = (phone) => {
  const phoneRegex = /^(\+91|91|0)?[6789]\d{9}$/;
  return phoneRegex.test(phone);
};

// Validate pincode (Indian format)
export const isValidPincode = (pincode) => {
  const pincodeRegex = /^[1-9][0-9]{5}$/;
  return pincodeRegex.test(pincode);
};

// Format phone number
export const formatPhone = (phone) => {
  if (!phone) return '';
  
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Handle Indian phone numbers
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  
  return phone;
};

// Calculate delivery time
export const calculateDeliveryTime = (orderTime, estimatedMinutes = 60) => {
  if (!orderTime) return null;
  
  const orderDate = new Date(orderTime);
  const deliveryDate = new Date(orderDate.getTime() + estimatedMinutes * 60 * 1000);
  
  return deliveryDate;
};

// Get delivery time status
export const getDeliveryTimeStatus = (orderTime, estimatedMinutes = 60) => {
  const estimatedTime = calculateDeliveryTime(orderTime, estimatedMinutes);
  const now = new Date();
  
  if (!estimatedTime) return 'unknown';
  
  const timeDiff = estimatedTime.getTime() - now.getTime();
  
  if (timeDiff > 30 * 60 * 1000) return 'on-time'; // More than 30 minutes left
  if (timeDiff > 0) return 'soon'; // Less than 30 minutes left
  if (timeDiff > -30 * 60 * 1000) return 'slight-delay'; // Up to 30 minutes late
  return 'delayed'; // More than 30 minutes late
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function
export const throttle = (func, limit) => {
  let lastFunc;
  let lastRan;
  return function(...args) {
    if (!lastRan) {
      func.apply(this, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(this, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
};

// Copy to clipboard
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

// Generate order number
export const generateOrderNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `JLS${dateStr}${randomStr}`;
};

// Format order number for display
export const formatOrderNumber = (orderNumber) => {
  if (!orderNumber) return '';
  
  // Add spaces for better readability: JLS20241214ABC123 -> JLS 2024-12-14 ABC123
  if (orderNumber.length >= 14) {
    const prefix = orderNumber.slice(0, 3);
    const date = orderNumber.slice(3, 11);
    const suffix = orderNumber.slice(11);
    
    const formattedDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
    return `${prefix} ${formattedDate} ${suffix}`;
  }
  
  return orderNumber;
};

// Calculate distance between two coordinates (Haversine formula)
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
};

const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

// Format distance
export const formatDistance = (distance) => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)}km`;
};

// Local storage helpers
export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error writing to localStorage:', error);
      return false;
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      return false;
    }
  }
};

// URL helpers
export const buildQueryString = (params) => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      searchParams.append(key, value);
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};