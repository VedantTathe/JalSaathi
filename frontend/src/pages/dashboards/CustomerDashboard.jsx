import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  ShoppingCart, Package, Droplets, MapPin,
  Clock, CheckCircle, Truck, Filter, Star, Phone, Plus,
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

  // Reset to dashboard home when component mounts
  useEffect(() => {
    setActivePage('dashboard');
  }, []);
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
    { key: 'my-orders', name: 'My Orders', icon: Package },
    { key: 'addresses', name: 'Address Management', icon: MapPin },
  ].map(item => ({
    ...item,
    href: item.href || '#',
    onClick: () => !item.href && setActivePage(item.key)
  }));

  // 🏠 1. DASHBOARD HOME - Swiggy-style Provider Selection
  const DashboardHome = () => {
    const providers = providersData?.data?.providers || [];
    const addresses = addressesData?.data?.addresses || [];
    const orders = ordersData?.data?.orders || [];
    const activeOrder = orders.find(o => ['pending', 'accepted', 'assigned', 'out_for_delivery'].includes(o.status));
    
    console.log('🔍 Dashboard Debug:');
    console.log('- providersData:', providersData);
    console.log('- providers array:', providers);
    console.log('- providers.length:', providers.length);
    
    // Debug: Check distance field for each provider
    providers.forEach(p => {
      console.log(`Provider: ${p.businessName}, Distance: ${p.distance}, Coordinates: ${p.coordinates?.latitude}, ${p.coordinates?.longitude}`);
    });
    
    const [searchQuery, setSearchQuery] = useState('');
    const [priceFilter, setPriceFilter] = useState('all');
    const [sortBy, setSortBy] = useState('rating'); // rating, price, delivery
    
    if (providersLoading) return <LoadingSpinner />;

    // Filter and sort providers
    let filteredProviders = providers.filter(provider => {
      const matchesSearch = provider.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           provider.area?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPrice = priceFilter === 'all' || 
                          (priceFilter === 'low' && provider.pricePerCan <= 35) ||
                          (priceFilter === 'medium' && provider.pricePerCan > 35 && provider.pricePerCan <= 45) ||
                          (priceFilter === 'high' && provider.pricePerCan > 45);
      return matchesSearch && matchesPrice;
    });

    // Sort providers
    filteredProviders = [...filteredProviders].sort((a, b) => {
      if (sortBy === 'rating') {
        const aRating = typeof a.rating === 'object' ? (a.rating?.average || 4.5) : 4.5;
        const bRating = typeof b.rating === 'object' ? (b.rating?.average || 4.5) : 4.5;
        return bRating - aRating;
      }
      if (sortBy === 'price') return a.pricePerCan - b.pricePerCan;
      return 0;
    });

    return (
      <div>
        {/* Location Warning Banner - showed when customer has no coordinates */}
        {providers.length > 0 && providers.every(p => p.distance === null || p.distance === undefined) && (
          <div className="bg-warning-50 border border-warning-200 rounded-lg p-4 mb-6 flex items-start space-x-3">
            <MapPin className="h-5 w-5 text-warning-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-warning-900 mb-1">Set Your Location for Better Experience</h3>
              <p className="text-sm text-warning-700 mb-2">
                You haven't set your location yet! To see accurate distances and get providers who can deliver to you, please update your profile with your location.
              </p>
              <button
                onClick={() => setActivePage('profile')}
                className="text-sm font-medium text-warning-800 hover:text-warning-900 underline"
              >
                Update Location in Profile →
              </button>
            </div>
          </div>
        )}

        {/* Hero Banner with Greeting */}
        <div className="bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 rounded-2xl p-8 mb-6 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">
              Hello, {JSON.parse(localStorage.getItem('user') || '{}')?.name?.split(' ')[0] || 'Customer'}! 👋
            </h1>
            <p className="text-primary-100 text-lg mb-4">What would you like to order today?</p>
            
            {/* Quick Stats Row */}
            <div className="flex items-center space-x-6 mt-4">
              <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <Droplets className="h-5 w-5" />
                <span className="font-medium">{providers.length} Providers</span>
              </div>
              {activeOrder && (
                <div className="flex items-center space-x-2 bg-success-500/20 backdrop-blur-sm rounded-lg px-4 py-2">
                  <Truck className="h-5 w-5" />
                  <span className="font-medium">Order On The Way</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-full -mb-24 -mr-24"></div>
        </div>

        {/* Active Order Banner (if exists) */}
        {activeOrder && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-full bg-success-100 flex items-center justify-center">
                  <Package className="h-6 w-6 text-success-600" />
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-semibold text-gray-900">Order #{activeOrder.orderNumber || activeOrder._id.slice(-6)}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(activeOrder.status)}`}>
                      {getStatusText(activeOrder.status)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {activeOrder.items?.quantity || 0} cans • ₹{activeOrder.items?.totalPrice || 0}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActivePage('my-orders')}
                className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors"
              >
                Track Order
              </button>
            </div>
          </div>
        )}

        {/* Search and Filters - Swiggy Style */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Bar */}
            <div className="md:col-span-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for water providers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg pl-11 pr-4 py-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
                />
                <Filter className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
            
            {/* Sort Dropdown */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all font-medium"
              >
                <option value="rating">Sort: Highest Rated</option>
                <option value="price">Sort: Lowest Price</option>
                <option value="delivery">Sort: Fastest Delivery</option>
              </select>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center space-x-3 mt-4">
            <span className="text-sm font-medium text-gray-700">Filter by Price:</span>
            <button
              onClick={() => setPriceFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                priceFilter === 'all'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setPriceFilter('low')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                priceFilter === 'low'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Budget ≤₹35
            </button>
            <button
              onClick={() => setPriceFilter('medium')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                priceFilter === 'medium'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              ₹36-45
            </button>
            <button
              onClick={() => setPriceFilter('high')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                priceFilter === 'high'
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Premium
            </button>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-600">
            <strong>{filteredProviders.length}</strong> water provider{filteredProviders.length !== 1 ? 's' : ''} available near you
          </div>
        </div>

        {/* Providers Grid - Swiggy Style Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProviders.map((provider) => (
            <div 
              key={provider._id} 
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
              onClick={() => {
                if (provider.isOnline) {
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
                }
              }}
            >
              {/* Image Header with Badge */}
              <div className="relative h-40 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                <Droplets className="h-20 w-20 text-white/30" />
                <div className="absolute top-3 right-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold shadow-lg ${
                    provider.isOnline 
                      ? 'bg-success-500 text-white' 
                      : 'bg-gray-500 text-white'
                  }`}>
                    {provider.isOnline ? '● Online' : '● Offline'}
                  </span>
                </div>
                
                {/* Discount Badge (if applicable) */}
                {provider.pricePerCan <= 35 && (
                  <div className="absolute top-3 left-3 bg-warning-500 text-white px-2 py-1 rounded-lg text-xs font-bold shadow-lg">
                    💰 BUDGET
                  </div>
                )}
              </div>

              {/* Card Content */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                      {provider.businessName || 'Water Provider'}
                    </h3>
                    <p className="text-sm text-gray-600 flex items-center">
                      <MapPin className="h-3.5 w-3.5 mr-1" />
                      {provider.area || 'Local Area'}
                    </p>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-warning-500 fill-current" />
                    <span className="font-semibold text-gray-900">
                      {typeof provider.rating === 'object' ? provider.rating?.average || 4.5 : 4.5}
                    </span>
                    <span className="text-xs text-gray-500">(120+)</span>
                  </div>
                  
                  <div className="flex items-center space-x-1 text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">~30 mins</span>
                  </div>
                </div>

                {/* Service Info */}
                <div className="mb-3 space-y-1">
                  {provider.distance !== undefined && provider.distance !== null ? (
                    <div className="text-sm text-white bg-primary-600 px-3 py-1.5 rounded-md font-bold flex items-center w-fit">
                      📍 {provider.distance} km away
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 italic flex items-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-gray-300 mr-2"></div>
                      Distance not available
                    </div>
                  )}
                  {provider.serviceRadius && (
                    <div className="text-xs text-gray-600 flex items-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-gray-400 mr-2"></div>
                      Delivers within {provider.serviceRadius} km radius
                    </div>
                  )}
                </div>

                {/* Price and Order Button */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-primary-600">
                      ₹{provider.pricePerCan}
                    </div>
                    <div className="text-xs text-gray-500">per can</div>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (provider.isOnline) {
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
                      }
                    }}
                    disabled={!provider.isOnline}
                    className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                      provider.isOnline 
                        ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-md hover:shadow-lg' 
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {provider.isOnline ? 'Order Now' : 'Closed'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredProviders.length === 0 && (
          <div className="text-center py-16 bg-gray-50 rounded-2xl">
            <div className="mb-4">
              <Droplets className="h-16 w-16 text-gray-300 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Providers Found</h3>
            <p className="text-gray-600 mb-6">
              {providers.length === 0 
                ? "We couldn't find any water providers in your area yet." 
                : 'Try adjusting your search or filters.'}
            </p>
            {searchQuery || priceFilter !== 'all' ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setPriceFilter('all');
                }}
                className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
              >
                Clear Filters
              </button>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  // 🛒 2. ORDER WATER
  // 📦 2. MY ORDERS
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
                  <p className="font-medium text-gray-900">{order.providerId?.businessName || 'N/A'}</p>
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

              {/* Special Instructions */}
              {order.specialInstructions && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Special Instructions</p>
                  <p className="text-sm text-gray-900 italic">"{order.specialInstructions}"</p>
                </div>
              )}
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

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardHome />;
      case 'my-orders': return <MyOrders />;
      case 'addresses': return <AddressManagement />;
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
