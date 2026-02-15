import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  ShoppingCart, Package, CreditCard, Droplets, MapPin, IndianRupee,
  Clock, CheckCircle, Truck, Filter, Star, Phone, Bell, User, Plus,
  Edit2, Trash2, Home as HomeIcon, X, Briefcase, MapPinned
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { userApi, addressApi } from '../../services/api';
import { formatCurrency, formatDateTime, getStatusColor, getStatusText } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const CustomerDashboard = () => {
  const queryClient = useQueryClient();
  const [activePage, setActivePage] = useState('dashboard');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [orderForm, setOrderForm] = useState({
    providerId: '',
    quantity: 1,
    paymentMethod: 'cash_on_delivery',
    specialInstructions: '',
    deliveryAddress: null,
    deliveryTime: 'immediate'
  });
  const [addressForm, setAddressForm] = useState({
    label: 'home',
    street: '',
    area: '',
    city: '',
    pincode: '',
    coordinates: {
      latitude: null,
      longitude: null
    }
  });
  const [gettingLocation, setGettingLocation] = useState(false);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // India center [lat, lng]
  const [mapZoom, setMapZoom] = useState(5);
  const [markerPosition, setMarkerPosition] = useState(null);

  // Fetch data
  const { data: providersData, isLoading: providersLoading } = useQuery('nearby-providers', () => userApi.getNearbyProviders());
  const { data: ordersData, isLoading: ordersLoading } = useQuery('customer-orders', () => userApi.getCustomerOrders());
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery('customer-payments', () => userApi.getPayments());
  const { data: addressesData, isLoading: addressesLoading } = useQuery('customer-addresses', () => addressApi.getAddresses());

  // Mutations
  const placeOrderMutation = useMutation((orderData) => userApi.placeOrder(orderData), {
    onSuccess: () => {
      queryClient.invalidateQueries('customer-orders');
      toast.success('Order placed successfully!');
      setShowOrderModal(false);
      setOrderForm({ providerId: '', quantity: 1, paymentMethod: 'cash_on_delivery', specialInstructions: '', deliveryAddress: null, deliveryTime: 'immediate' });
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to place order')
  });

  const createAddressMutation = useMutation((addressData) => addressApi.createAddress(addressData), {
    onSuccess: () => {
      queryClient.invalidateQueries('customer-addresses');
      toast.success('Address added successfully!');
      setShowAddressModal(false);
      setAddressForm({ label: 'home', street: '', area: '', city: '', pincode: '', coordinates: { latitude: null, longitude: null } });
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to add address')
  });

  const updateAddressMutation = useMutation(({ addressId, data }) => addressApi.updateAddress(addressId, data), {
    onSuccess: () => {
      queryClient.invalidateQueries('customer-addresses');
      toast.success('Address updated successfully!');
      setShowAddressModal(false);
      setEditingAddress(null);
      setAddressForm({ label: 'home', street: '', area: '', city: '', pincode: '', coordinates: { latitude: null, longitude: null } });
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to update address')
  });

  const deleteAddressMutation = useMutation((addressId) => addressApi.deleteAddress(addressId), {
    onSuccess: () => {
      queryClient.invalidateQueries('customer-addresses');
      toast.success('Address deleted successfully!');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to delete address')
  });

  const setDefaultAddressMutation = useMutation((addressId) => addressApi.setDefaultAddress(addressId), {
    onSuccess: () => {
      queryClient.invalidateQueries('customer-addresses');
      toast.success('Default address updated!');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to set default address')
  });

  // Get current location using browser Geolocation API
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Update map center and marker
        setMapCenter([latitude, longitude]);
        setMapZoom(15);
        setMarkerPosition([latitude, longitude]);
        
        // Update coordinates in form
        setAddressForm(prev => ({
          ...prev,
          coordinates: { latitude, longitude }
        }));

        // Try to reverse geocode to get address details
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          
          if (data.address) {
            // Auto-fill address fields from geocoded data
            setAddressForm(prev => ({
              ...prev,
              street: data.address.road || data.address.suburb || prev.street,
              area: data.address.neighbourhood || data.address.suburb || prev.area,
              city: data.address.city || data.address.town || data.address.village || prev.city,
              pincode: data.address.postcode || prev.pincode,
              coordinates: { latitude, longitude }
            }));
            toast.success('Location captured and address auto-filled!');
          } else {
            toast.success('Location captured successfully!');
          }
        } catch (error) {
          console.error('Geocoding error:', error);
          toast.success('Location captured! Please fill address details manually.');
        }
        
        setGettingLocation(false);
      },
      (error) => {
        setGettingLocation(false);
        switch(error.code) {
          case error.PERMISSION_DENIED:
            toast.error('Location permission denied. Please enable location access.');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('Location information unavailable.');
            break;
          case error.TIMEOUT:
            toast.error('Location request timed out.');
            break;
          default:
            toast.error('An error occurred while getting location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Map click handler component
  const LocationMarker = () => {
    useMapEvents({
      click: async (e) => {
        const { lat, lng } = e.latlng;
        
        // Update marker position
        setMarkerPosition([lat, lng]);
        
        // Update coordinates in form
        setAddressForm(prev => ({
          ...prev,
          coordinates: { latitude: lat, longitude: lng }
        }));

        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await response.json();
          
          if (data.address) {
            setAddressForm(prev => ({
              ...prev,
              street: data.address.road || data.address.suburb || prev.street,
              area: data.address.neighbourhood || data.address.suburb || prev.area,
              city: data.address.city || data.address.town || data.address.village || prev.city,
              pincode: data.address.postcode || prev.pincode,
              coordinates: { latitude: lat, longitude: lng }
            }));
            toast.success('Location selected! Address auto-filled.');
          } else {
            toast.success('Location selected!');
          }
        } catch (error) {
          console.error('Geocoding error:', error);
          toast.success('Location selected! Please fill address details.');
        }
      },
    });

    return markerPosition ? <Marker position={markerPosition} /> : null;
  };

  const navigation = [
    { key: 'dashboard', name: 'Dashboard Home', icon: HomeIcon },
    { key: 'order-water', name: 'Order Water', icon: ShoppingCart },
    { key: 'my-orders', name: 'My Orders', icon: Package },
    { key: 'addresses', name: 'Address Management', icon: MapPin },
    { key: 'payments', name: 'Payments', icon: CreditCard },
    { key: 'notifications', name: 'Notifications', icon: Bell, badge: 3 },
    { key: 'profile', name: 'Profile', href: '/profile', icon: User },
  ].map(item => ({
    ...item,
    href: item.href || '#',
    onClick: () => !item.href && setActivePage(item.key)
  }));

  // 🏠 1. DASHBOARD HOME
  const DashboardHome = () => {
    const orders = ordersData?.data?.orders || [];
    const activeOrder = orders.find(o => ['pending', 'accepted', 'assigned', 'out_for_delivery'].includes(o.status));
    const lastOrder = orders[0];
    
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h1>
        
        {/* Quick Action */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Need Water?</h2>
              <p className="text-primary-100">Order from nearby providers in just a few clicks</p>
            </div>
            <button
              onClick={() => setActivePage('order-water')}
              className="bg-white text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
            >
              Order Now
            </button>
          </div>
        </div>

        {/* Widgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Current Order Widget */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">📦 Current Order</h3>
              {activeOrder && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activeOrder.status)}`}>
                  {getStatusText(activeOrder.status)}
                </span>
              )}
            </div>
            {activeOrder ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Order #{activeOrder.orderNumber}</p>
                <p className="font-semibold text-gray-900">{activeOrder.items?.quantity || 0} cans</p>
                <p className="text-primary-600 font-semibold">₹{activeOrder.items?.totalPrice || 0}</p>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No active order</p>
            )}
          </div>

          {/* Last Order Widget */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">💰 Last Order</h3>
            {lastOrder ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">{formatDateTime(lastOrder.timeline?.ordered)}</p>
                <p className="font-semibold text-gray-900">{lastOrder.items?.quantity || 0} cans</p>
                <p className="text-gray-600 text-sm">₹{lastOrder.items?.totalPrice || 0}</p>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No orders yet</p>
            )}
          </div>

          {/* Notifications Widget */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">🔔 Notifications</h3>
              <span className="bg-error-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-gray-600">Order #12345 delivered</p>
              <p className="text-gray-600">New offer available</p>
              <button onClick={() => setActivePage('notifications')} className="text-primary-600 hover:text-primary-700 font-medium">
                View all
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 🛒 2. ORDER WATER
  const OrderWater = () => {
    const providers = providersData?.data?.providers || [];
    const addresses = addressesData?.data?.addresses || [];
    const [searchQuery, setSearchQuery] = useState('');
    const [priceFilter, setPriceFilter] = useState('all');
    
    if (providersLoading) return <LoadingSpinner />;

    // Filter providers
    const filteredProviders = providers.filter(provider => {
      const matchesSearch = provider.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           provider.area?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPrice = priceFilter === 'all' || 
                          (priceFilter === 'low' && provider.pricePerCan <= 35) ||
                          (priceFilter === 'medium' && provider.pricePerCan > 35 && provider.pricePerCan <= 45) ||
                          (priceFilter === 'high' && provider.pricePerCan > 45);
      return matchesSearch && matchesPrice;
    });

    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Water</h1>
        <p className="text-gray-600 mb-6">Select a provider and place your order</p>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Providers</label>
              <input
                type="text"
                placeholder="Search by name or area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Price</label>
              <select
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="all">All Prices</option>
                <option value="low">Budget (≤₹35)</option>
                <option value="medium">Standard (₹36-45)</option>
                <option value="high">Premium (&gt;₹45)</option>
              </select>
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-600">
            Found {filteredProviders.length} provider{filteredProviders.length !== 1 ? 's' : ''} in your area
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProviders.map((provider) => (
            <div key={provider._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
                    <Droplets className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{provider.businessName || 'Water Provider'}</h3>
                    <p className="text-sm text-gray-600">{provider.area || 'Local Area'}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  provider.isOnline ? 'bg-success-100 text-success-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {provider.isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Price per can:</span>
                  <span className="font-semibold text-gray-900">₹{provider.pricePerCan || 40}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Rating:</span>
                  <span className="flex items-center text-warning-600">
                    {provider.rating?.average || provider.rating || 4.5} ⭐
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Delivery:</span>
                  <span className="text-gray-900">~30 mins</span>
                </div>
              </div>

              <button
                onClick={() => {
                  const defaultAddress = addresses.find(addr => addr.isDefault);
                  setSelectedProvider(provider);
                  setOrderForm({ 
                    providerId: provider._id,
                    quantity: 1,
                    paymentMethod: 'cash_on_delivery',
                    specialInstructions: '',
                    deliveryAddress: defaultAddress || null,
                    deliveryTime: 'immediate'
                  });
                  setShowOrderModal(true);
                }}
                disabled={!provider.isOnline}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                  provider.isOnline ? 'bg-primary-600 text-white hover:bg-primary-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {provider.isOnline ? 'Order Now' : 'Currently Offline'}
              </button>
            </div>
          ))}
        </div>

        {filteredProviders.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Droplets className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">
              {providers.length === 0 ? 'No providers available in your area' : 'No providers match your filters'}
            </p>
          </div>
        )}
      </div>
    );
  };

  // 📦 3. MY ORDERS
  const MyOrders = () => {
    const [orderFilter, setOrderFilter] = useState('all');
    const orders = ordersData?.data?.orders || [];
    
    const filteredOrders = orders.filter(order => {
      if (orderFilter === 'active') return ['pending', 'accepted', 'assigned', 'out_for_delivery'].includes(order.status);
      if (orderFilter === 'past') return order.status === 'delivered';
      if (orderFilter === 'cancelled') return order.status === 'cancelled';
      return true;
    });

    if (ordersLoading) return <LoadingSpinner />;

    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-6">
            {['all', 'active', 'past', 'cancelled'].map(filter => (
              <button
                key={filter}
                onClick={() => setOrderFilter(filter)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  orderFilter === filter
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div key={order._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
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
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-xl font-semibold text-primary-600">₹{order.items?.totalPrice || 0}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Provider</p>
                  <p className="font-medium text-gray-900">{order.provider?.businessName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Quantity</p>
                  <p className="font-medium text-gray-900">{order.items?.quantity || 0} cans</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Payment</p>
                  <p className="font-medium text-gray-900">{order.paymentStatus || 'Pending'}</p>
                </div>
                {order.deliveryBoyId && (
                  <div>
                    <p className="text-xs text-gray-600">Delivery Partner</p>
                    <p className="font-medium text-gray-900">{order.deliveryBoy?.name || 'Assigned'}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No {orderFilter} orders found</p>
          </div>
        )}
      </div>
    );
  };

  // 📍 4. ADDRESS MANAGEMENT
  const AddressManagement = () => {
    const addresses = addressesData?.data?.addresses || [];
    
    const handleAddAddress = () => {
      setEditingAddress(null);
      setAddressForm({ 
        label: 'home', 
        street: '', 
        area: '', 
        city: '', 
        pincode: '', 
        coordinates: { latitude: null, longitude: null } 
      });
      setMarkerPosition(null);
      setMapCenter([20.5937, 78.9629]); // Reset to India center
      setMapZoom(5);
      setShowAddressModal(true);
    };

    const handleEditAddress = (address) => {
      setEditingAddress(address);
      setAddressForm({
        label: address.label,
        street: address.street,
        area: address.area,
        city: address.city,
        pincode: address.pincode,
        coordinates: address.coordinates || { latitude: null, longitude: null }
      });
      
      // Set map center and marker if coordinates exist
      if (address.coordinates?.latitude && address.coordinates?.longitude) {
        const position = [address.coordinates.latitude, address.coordinates.longitude];
        setMapCenter(position);
        setMapZoom(15);
        setMarkerPosition(position);
      } else {
        setMarkerPosition(null);
        setMapCenter([20.5937, 78.9629]);
        setMapZoom(5);
      }
      
      setShowAddressModal(true);
    };

    const handleDeleteAddress = (addressId) => {
      if (window.confirm('Are you sure you want to delete this address?')) {
        deleteAddressMutation.mutate(addressId);
      }
    };

    const handleSetDefault = (addressId) => {
      setDefaultAddressMutation.mutate(addressId);
    };

    const getAddressIcon = (label) => {
      switch(label) {
        case 'home': return <HomeIcon className="h-5 w-5 text-primary-600" />;
        case 'work': return <Briefcase className="h-5 w-5 text-primary-600" />;
        default: return <MapPinned className="h-5 w-5 text-primary-600" />;
      }
    };

    if (addressesLoading) return <LoadingSpinner />;

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Address Management</h1>
          <button 
            onClick={handleAddAddress}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700 flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Add New Address</span>
          </button>
        </div>

        {addresses.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">No addresses saved</p>
            <button
              onClick={handleAddAddress}
              className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700"
            >
              Add Your First Address
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {addresses.map((address) => (
              <div key={address._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getAddressIcon(address.label)}
                    <div>
                      <h3 className="font-semibold text-gray-900 capitalize">{address.label}</h3>
                      {address.isDefault && (
                        <span className="text-xs bg-success-100 text-success-800 px-2 py-1 rounded mt-1 inline-block">
                          Default
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleEditAddress(address)}
                      className="text-gray-400 hover:text-primary-600"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteAddress(address._id)}
                      className="text-gray-400 hover:text-error-600"
                      disabled={deleteAddressMutation.isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="text-gray-700 text-sm space-y-1 mb-4">
                  <p>{address.street}</p>
                  <p>{address.area}</p>
                  <p>{address.city} - {address.pincode}</p>
                  {address.coordinates?.latitude && address.coordinates?.longitude && (
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-1 text-xs text-success-600">
                        <MapPin className="h-3 w-3" />
                        <span>GPS coordinates saved</span>
                      </div>
                      <a
                        href={`https://www.google.com/maps?q=${address.coordinates.latitude},${address.coordinates.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center space-x-1"
                      >
                        <MapPin className="h-3 w-3" />
                        <span>View on Map</span>
                      </a>
                    </div>
                  )}
                </div>
                {!address.isDefault && (
                  <button
                    onClick={() => handleSetDefault(address._id)}
                    disabled={setDefaultAddressMutation.isLoading}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                  >
                    Set as Default
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 💳 5. PAYMENTS
  const Payments = () => {
    const paymentsResponse = paymentsData?.data || {};
    const summary = paymentsResponse.summary || { totalAmount: 0, totalPaid: 0, totalPending: 0 };
    const transactions = paymentsResponse.transactions || [];

    if (paymentsLoading) return <LoadingSpinner />;

    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Payments</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-6">
            <p className="text-sm text-primary-700 mb-1">Total Spent</p>
            <p className="text-2xl font-bold text-primary-900">₹{summary.totalAmount || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-success-50 to-success-100 rounded-lg p-6">
            <p className="text-sm text-success-700 mb-1">Paid</p>
            <p className="text-2xl font-bold text-success-900">₹{summary.totalPaid || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-warning-50 to-warning-100 rounded-lg p-6">
            <p className="text-sm text-warning-700 mb-1">Pending</p>
            <p className="text-2xl font-bold text-warning-900">₹{summary.totalPending || 0}</p>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Transaction History</h3>
          <div className="space-y-4">
            {transactions.map((txn) => (
              <div key={txn.id} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">Order #{txn.orderNumber}</p>
                  <p className="text-sm text-gray-600">{txn.provider}</p>
                  <p className="text-xs text-gray-500">{formatDateTime(txn.date)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">₹{txn.amount}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    txn.paymentStatus === 'paid' ? 'bg-success-100 text-success-800' : 'bg-warning-100 text-warning-800'
                  }`}>
                    {txn.paymentStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 🔔 6. NOTIFICATIONS
  const Notifications = () => {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Notifications</h1>
        
        <div className="space-y-4">
          {[
            { type: 'success', title: 'Order Delivered', message: 'Your order #12345 has been delivered successfully', time: '2 hours ago' },
            { type: 'info', title: 'Order Accepted', message: 'Provider accepted your order #12344', time: '5 hours ago' },
            { type: 'warning', title: 'Payment Pending', message: 'Payment pending for order #12343', time: '1 day ago' },
          ].map((notif, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-start space-x-4">
              <Bell className={`h-5 w-5 ${notif.type === 'success' ? 'text-success-600' : notif.type === 'warning' ? 'text-warning-600' : 'text-primary-600'}`} />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{notif.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
                <p className="text-xs text-gray-500 mt-2">{notif.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardHome />;
      case 'order-water': return <OrderWater />;
      case 'my-orders': return <MyOrders />;
      case 'addresses': return <AddressManagement />;
      case 'payments': return <Payments />;
      case 'notifications': return <Notifications />;
      default: return <DashboardHome />;
    }
  };

  return (
    <DashboardLayout navigation={navigation} activeTab={activePage}>
      {renderPage()}

      {/* Order Modal */}
      {showOrderModal && selectedProvider && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Place Water Order</h2>
              <button 
                type="button"
                onClick={() => setShowOrderModal(false)} 
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto p-6">
              <form onSubmit={(e) => { 
                e.preventDefault(); 
                if (!orderForm.deliveryAddress) {
                  toast.error('Please select a delivery address');
                  return;
                }
                placeOrderMutation.mutate({
                  ...orderForm,
                  providerId: selectedProvider._id
                }); 
              }} className="space-y-5">
                
                {/* Provider Info */}
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
                      <Droplets className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedProvider.businessName}</h3>
                      <p className="text-sm text-gray-600">{selectedProvider.area || 'Local Area'}</p>
                      <p className="text-sm text-primary-600 font-medium">₹{selectedProvider.pricePerCan} per can</p>
                    </div>
                  </div>
                </div>

                {/* Quantity Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      onClick={() => setOrderForm({ ...orderForm, quantity: Math.max(1, orderForm.quantity - 1) })}
                      className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-xl font-bold text-gray-600">−</span>
                    </button>
                    <div className="flex-1 text-center">
                      <div className="text-3xl font-bold text-gray-900">{orderForm.quantity}</div>
                      <div className="text-sm text-gray-600">cans</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOrderForm({ ...orderForm, quantity: orderForm.quantity + 1 })}
                      className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-xl font-bold text-gray-600">+</span>
                    </button>
                  </div>
                </div>

                {/* Delivery Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address *</label>
                  <select
                    value={orderForm.deliveryAddress ? JSON.stringify(orderForm.deliveryAddress) : ''}
                    onChange={(e) => setOrderForm({ ...orderForm, deliveryAddress: e.target.value ? JSON.parse(e.target.value) : null })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    <option value="">Select delivery address</option>
                    {addressesData?.data?.addresses?.map((addr) => (
                      <option key={addr._id} value={JSON.stringify(addr)}>
                        🏠 {addr.label.toUpperCase()} - {addr.street}, {addr.area}, {addr.city}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setShowOrderModal(false);
                      setActivePage('addresses');
                    }}
                    className="mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    + Add New Address
                  </button>
                </div>

                {/* Delivery Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Time *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setOrderForm({ ...orderForm, deliveryTime: 'immediate' })}
                      className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                        orderForm.deliveryTime === 'immediate'
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <Clock className="h-5 w-5 mx-auto mb-1" />
                      Immediate
                      <div className="text-xs text-gray-600 mt-1">~30 mins</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderForm({ ...orderForm, deliveryTime: 'scheduled' })}
                      className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                        orderForm.deliveryTime === 'scheduled'
                          ? 'border-primary-600 bg-primary-50 text-primary-700'
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <Clock className="h-5 w-5 mx-auto mb-1" />
                      Later Today
                      <div className="text-xs text-gray-600 mt-1">Choose time</div>
                    </button>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setOrderForm({ ...orderForm, paymentMethod: 'cash_on_delivery' })}
                      className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                        orderForm.paymentMethod === 'cash_on_delivery'
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-success-100 flex items-center justify-center">
                            <IndianRupee className="h-5 w-5 text-success-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">Cash on Delivery</div>
                            <div className="text-xs text-gray-600">Pay when you receive</div>
                          </div>
                        </div>
                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                          orderForm.paymentMethod === 'cash_on_delivery'
                            ? 'border-primary-600 bg-primary-600'
                            : 'border-gray-300'
                        }`}>
                          {orderForm.paymentMethod === 'cash_on_delivery' && (
                            <CheckCircle className="h-4 w-4 text-white" />
                          )}
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderForm({ ...orderForm, paymentMethod: 'online' })}
                      className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                        orderForm.paymentMethod === 'online'
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">UPI / Online Payment</div>
                            <div className="text-xs text-gray-600">GPay, PhonePe, Paytm, Cards</div>
                          </div>
                        </div>
                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                          orderForm.paymentMethod === 'online'
                            ? 'border-primary-600 bg-primary-600'
                            : 'border-gray-300'
                        }`}>
                          {orderForm.paymentMethod === 'online' && (
                            <CheckCircle className="h-4 w-4 text-white" />
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Special Instructions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Special Instructions (Optional)</label>
                  <textarea
                    value={orderForm.specialInstructions}
                    onChange={(e) => setOrderForm({ ...orderForm, specialInstructions: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    rows="2"
                    placeholder="e.g., Call before delivery, Gate code, etc."
                  />
                </div>
              </form>
            </div>

            {/* Fixed Footer with Total and Submit */}
            <div className="border-t border-gray-200 p-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Quantity:</span>
                  <span className="font-medium text-gray-900">{orderForm.quantity} cans</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Price per can:</span>
                  <span className="font-medium text-gray-900">₹{selectedProvider.pricePerCan}</span>
                </div>
                <div className="h-px bg-gray-300 my-2"></div>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total:</span>
                  <span className="text-2xl font-bold text-primary-600">
                    ₹{selectedProvider.pricePerCan * orderForm.quantity}
                  </span>
                </div>
              </div>
              
              <button
                type="submit"
                onClick={(e) => {
                  e.preventDefault();
                  if (!orderForm.deliveryAddress) {
                    toast.error('Please select a delivery address');
                    return;
                  }
                  placeOrderMutation.mutate({
                    ...orderForm,
                    providerId: selectedProvider._id
                  });
                }}
                disabled={placeOrderMutation.isLoading}
                className="w-full bg-primary-600 text-white py-3.5 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
              >
                {placeOrderMutation.isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Placing Order...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    <span>Confirm Order</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{editingAddress ? 'Edit Address' : 'Add New Address'}</h2>
              <button 
                type="button"
                onClick={() => {
                  setShowAddressModal(false);
                  setEditingAddress(null);
                  setAddressForm({ 
                    label: 'home', 
                    street: '', 
                    area: '', 
                    city: '', 
                    pincode: '', 
                    coordinates: { latitude: null, longitude: null } 
                  });
                  setMarkerPosition(null);
                  setMapCenter([20.5937, 78.9629]);
                  setMapZoom(5);
                }} 
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="overflow-y-auto p-6">
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              if (editingAddress) {
                updateAddressMutation.mutate({ addressId: editingAddress._id, data: addressForm });
              } else {
                createAddressMutation.mutate(addressForm);
              }
            }}>
              {/* Interactive Map with OpenStreetMap (100% Free - No API Key!) */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">📍 Select Your Delivery Location</p>
                <p className="text-xs text-gray-600 mb-3">Click anywhere on the map or use your current location</p>
                <div className="relative border border-gray-300 rounded-lg overflow-hidden" style={{ height: '320px' }}>
                  <MapContainer
                    center={mapCenter}
                    zoom={mapZoom}
                    style={{ height: '100%', width: '100%' }}
                    key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker />
                  </MapContainer>
                  
                  {/* Floating "Use My Location" Button */}
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={gettingLocation}
                    className="absolute top-3 right-3 bg-white shadow-lg border border-gray-300 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 z-[1000]"
                    title="Use my current location"
                  >
                    {gettingLocation ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-gray-700">Locating...</span>
                      </>
                    ) : (
                      <>
                        <MapPinned className="h-4 w-4 text-primary-600" />
                        <span className="text-gray-700">Use My Location</span>
                      </>
                    )}
                  </button>
                  
                  {/* Coordinates Display Badge */}
                  {addressForm.coordinates.latitude && addressForm.coordinates.longitude && (
                    <div className="absolute bottom-3 left-3 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg z-[1000] flex items-center space-x-1">
                      <MapPin className="h-3 w-3" />
                      <span>
                        {addressForm.coordinates.latitude.toFixed(4)}, {addressForm.coordinates.longitude.toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                <select
                  value={addressForm.label}
                  onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="home">Home</option>
                  <option value="work">Work</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
                <input
                  type="text"
                  value={addressForm.street}
                  onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="House/Flat No., Building Name, Street"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area/Locality *</label>
                <input
                  type="text"
                  value={addressForm.area}
                  onChange={(e) => setAddressForm({ ...addressForm, area: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  placeholder="Area, Locality"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="City"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
                  <input
                    type="text"
                    value={addressForm.pincode}
                    onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="123456"
                    pattern="[0-9]{6}"
                    maxLength="6"
                    required
                  />
                </div>
              </div>
              </div>
            </form>
            </div>
            
            {/* Fixed Footer with Submit Button */}
            <div className="border-t border-gray-200 p-6">
              <button
                type="submit"
                onClick={(e) => {
                  e.preventDefault();
                  if (editingAddress) {
                    updateAddressMutation.mutate({ addressId: editingAddress._id, data: addressForm });
                  } else {
                    createAddressMutation.mutate(addressForm);
                  }
                }}
                disabled={createAddressMutation.isLoading || updateAddressMutation.isLoading}
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {(createAddressMutation.isLoading || updateAddressMutation.isLoading) ? 'Saving...' : editingAddress ? 'Update Address' : 'Add Address'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default CustomerDashboard;
