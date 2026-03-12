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
import { userApi, addressApi, orderApi } from '../../services/api';
import { formatCurrency, formatDateTime, getStatusColor, getStatusText } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';

// Load Cashfree SDK dynamically
const loadCashfreeScript = () => {
  return new Promise((resolve, reject) => {
    if (window.cashfree || window.CF) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v1/cashfree.js';
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Failed to load Cashfree SDK'));
    document.body.appendChild(script);
  });
};

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
  
  // Dashboard Home filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('rating');
  
  // My Orders filter state
  const [orderFilter, setOrderFilter] = useState('all');
  const [editingAddress, setEditingAddress] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [orderForm, setOrderForm] = useState({
    providerId: '',
    quantity: 1,
    paymentMethod: 'online',
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

  // Reset filters when navigating back to dashboard
  useEffect(() => {
    if (activePage === 'dashboard') {
      setSearchQuery('');
      setSortBy('rating');
    }
  }, [activePage]);

  // Fetch data with proper cache settings to prevent stale data
  const { data: providersData, isLoading: providersLoading, isRefetching: providersRefetching } = useQuery(
    'nearby-providers', 
    () => userApi.getNearbyProviders(),
    {
      staleTime: 0, // Always consider data stale
      cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
      refetchOnMount: true, // Refetch on component mount
      refetchOnWindowFocus: true, // Refetch when window regains focus
      refetchInterval: false, // Don't auto-refetch on interval
    }
  );
  
  const { data: ordersData, isLoading: ordersLoading } = useQuery(
    'customer-orders', 
    () => userApi.getCustomerOrders(),
    {
      staleTime: 0,
      cacheTime: 5 * 60 * 1000,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchInterval: false,
    }
  );

  // Handle Cashfree return redirect in the main window (if popup redirected here)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const cfOrderId = params.get('order_id') || params.get('orderId') || params.get('cf_order_id');
      const referenceId = params.get('reference_id') || params.get('referenceId') || params.get('reference');
      const txStatus = params.get('tx_status') || params.get('txStatus') || params.get('status');

      if (cfOrderId || referenceId || txStatus) {
        (async () => {
          // Refresh local orders list
          await queryClient.invalidateQueries('customer-orders');

          // Try to find a matching order by provider order id or by recent pending orders
          const ordersList = (ordersData && (ordersData.data?.orders || ordersData.orders)) || [];
          let matched = null;

          if (cfOrderId) {
            matched = ordersList.find(o => (o.paymentInfo && (o.paymentInfo.orderId === cfOrderId || o.paymentInfo.order_id === cfOrderId)));
          }

          // Fallback: pick latest pending online order if none matched
          if (!matched) {
            matched = ordersList.find(o => o.paymentMethod === 'online' && (o.paymentStatus === 'pending' || !o.paymentStatus));
          }

          if (matched) {
            try {
              const resp = await orderApi.checkPayment(matched._id);
              const payload = resp?.data || resp;
              const updated = payload?.data || payload;
              const paymentStatus = (updated?.paymentStatus || '').toString().toLowerCase();
              if (paymentStatus === 'paid') {
                toast.success('Payment successful!');
                queryClient.invalidateQueries('customer-orders');
                window.history.replaceState({}, document.title, window.location.pathname);
                navigate('/dashboard/my-orders');
                return;
              }

              // If payment not completed, just show the pending order
              // Cron job will auto-fail it after 1 minute
              toast.warning('Payment not completed. Order will be cancelled in 1 minute if not paid.');
              queryClient.invalidateQueries('customer-orders');
              window.history.replaceState({}, document.title, window.location.pathname);
              navigate('/dashboard/my-orders');
            } catch (e) {
              console.error('Return URL handling error:', e);
            }
          } else {
            // No match — just refresh queries and clear params
            queryClient.invalidateQueries('customer-orders');
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        })();
      }
    } catch (e) {
      console.error('Error parsing return URL params', e);
    }
  }, []);
  
  const { data: addressesData, isLoading: addressesLoading } = useQuery(
    'customer-addresses', 
    () => addressApi.getAddresses(),
    {
      staleTime: 0,
      cacheTime: 5 * 60 * 1000,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchInterval: false,
    }
  );

  // Normalize addresses coordinates to numeric values for validation
  const normalizedAddresses = (addressesData?.data?.addresses || []).map(a => ({
    ...a,
    coordinates: {
      latitude: a.coordinates && a.coordinates.latitude !== undefined ? Number(a.coordinates.latitude) : (a.coordinates?.lat ? Number(a.coordinates.lat) : null),
      longitude: a.coordinates && a.coordinates.longitude !== undefined ? Number(a.coordinates.longitude) : (a.coordinates?.lng ? Number(a.coordinates.lng) : null)
    }
  }));

  // State for payment processing
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Mutations
  // Always check and update payment status for any pending online orders on dashboard load
  useEffect(() => {
    const ordersList = (ordersData && (ordersData.data?.orders || ordersData.orders)) || [];
    ordersList.forEach(async (order) => {
      if (order.paymentMethod === 'online' && (order.paymentStatus === 'pending' || !order.paymentStatus)) {
        try {
          await orderApi.checkPayment(order._id);
          queryClient.invalidateQueries('customer-orders');
        } catch (e) {
          console.error('Auto payment status check failed for order', order._id, e);
        }
      }
    });
  }, [ordersData]);
  const placeOrderMutation = useMutation((orderData) => userApi.placeOrder(orderData), {
    onSuccess: async (response) => {
      // Extract order from response (handles both axios response shapes)
      const order = response?.data?.data || response?.data || response;
      const orderId = order?._id || order?.id;
      const paymentMethod = order?.paymentMethod || orderForm.paymentMethod;

      // If online payment, open Cashfree immediately
      if (paymentMethod === 'online' && orderId) {
        setIsProcessingPayment(true);
        try {
          await handleCashfreeCheckout(orderId, order);
        } catch (err) {
          console.error('Payment failed:', err);
          toast.error('Payment failed. You can pay later from Order Details.');
        }
        setIsProcessingPayment(false);
      } else {
        toast.success('Order placed successfully!');
      }

      queryClient.invalidateQueries('customer-orders');
      setShowOrderModal(false);
      setOrderForm({ providerId: '', quantity: 1, paymentMethod: 'online', specialInstructions: '', deliveryAddress: null, deliveryTime: 'immediate' });
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.message || 'Failed to place order';
      const statusCode = error.response?.status;
      
      // Special handling for rate limit (failed payment cooldown)
      if (statusCode === 429) {
        toast.error(errorMsg, { duration: 5000 });
      } else {
        toast.error(errorMsg);
      }
    }
  });

  // Handle Cashfree checkout after order is placed
  const navigate = useNavigate();

  const handleCashfreeCheckout = async (orderId, orderData) => {
    try {
      console.log('Starting Cashfree checkout for order:', orderId);

      const res = await orderApi.createPayment(orderId);
      console.log('Payment order response:', res);

      const responseData = res?.data || res;
      const rOrder = responseData?.order || responseData?.data || responseData;

      // If backend returned a direct checkout URL/open link, use it
      const checkoutUrl = rOrder?.checkout_url || rOrder?.payment_link || rOrder?.paymentLink || rOrder?.data?.checkout_url;
      if (checkoutUrl) {
        // Open Cashfree in the main window (not a popup)
        window.location.href = checkoutUrl;
        return true;
      }

      console.log('Loading Cashfree SDK...');
      await loadCashfreeScript();
      console.log('Cashfree SDK loaded successfully');

      // Try generic SDK init if available
      if (window.cashfree && typeof window.cashfree.init === 'function') {
        try {
          await window.cashfree.init({
            orderToken: rOrder?.order_token || rOrder?.token || rOrder?.data?.order_token,
            orderId: rOrder?.order_id || rOrder?.orderId || rOrder?.id,
            appId: responseData?.appId || process.env.REACT_APP_CASHFREE_APP_ID
          });
          if (typeof window.cashfree.open === 'function') {
            // Open SDK and then poll backend similarly to popup flow
            window.cashfree.open();

            // Polling fallback in case SDK doesn't provide callbacks
            const pollInterval = 3000;
            const maxAttempts = 40;
            let attempts = 0;
            return await new Promise((resolve) => {
              const timer = setInterval(async () => {
                attempts += 1;
                try {
                  const resp = await orderApi.getOrderById(orderId);
                  const data = resp?.data || resp;
                  const order = data?.data || data;
                  const paymentStatus = (order?.paymentStatus || '').toString().toLowerCase();
                  if (paymentStatus === 'paid') {
                    clearInterval(timer);
                    toast.success('Payment successful!');
                    queryClient.invalidateQueries('customer-orders');
                    navigate('/dashboard/my-orders');
                    resolve(true);
                  } else if (paymentStatus === 'failed') {
                    clearInterval(timer);
                    toast.error('Payment failed. You can retry from Order Details.');
                    queryClient.invalidateQueries('customer-orders');
                    resolve(false);
                  } else if (attempts >= maxAttempts) {
                    clearInterval(timer);
                    toast.error('Payment timeout. Check Order Details to retry.');
                    resolve(false);
                  }
                } catch (err) {
                  console.error('Polling order status error:', err);
                }
              }, pollInterval);
            });
          }
        } catch (e) {
          console.warn('Cashfree SDK init failed:', e);
        }
      }

      toast.error('Unable to open Cashfree checkout. Contact support.');
      return false;
    } catch (error) {
      console.error('Cashfree checkout error:', error);
      const errorMsg = error?.response?.data?.message || error.message || 'Failed to initialize payment';
      toast.error(errorMsg);
      throw error;
    }
  };

  const createAddressMutation = useMutation((addressData) => addressApi.createAddress(addressData), {
    onSuccess: () => {
      queryClient.invalidateQueries('customer-addresses');
      queryClient.invalidateQueries('nearby-providers'); // Refetch providers to recalculate distances
      toast.success('Address added successfully! Distances updated.');
      setShowAddressModal(false);
      setAddressForm({ label: 'home', street: '', area: '', city: '', pincode: '', coordinates: { latitude: null, longitude: null } });
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to add address')
  });

  const updateAddressMutation = useMutation(({ addressId, data }) => addressApi.updateAddress(addressId, data), {
    onSuccess: () => {
      queryClient.invalidateQueries('customer-addresses');
      queryClient.invalidateQueries('nearby-providers'); // Refetch providers to recalculate distances
      toast.success('Address updated successfully! Distances updated.');
      setShowAddressModal(false);
      setEditingAddress(null);
      setAddressForm({ label: 'home', street: '', area: '', city: '', pincode: '', coordinates: { latitude: null, longitude: null } });
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to update address')
  });

  const deleteAddressMutation = useMutation((addressId) => addressApi.deleteAddress(addressId), {
    onSuccess: () => {
      queryClient.invalidateQueries('customer-addresses');
      queryClient.invalidateQueries('nearby-providers'); // Refetch providers to recalculate distances
      toast.success('Address deleted successfully! Distances updated.');
    },
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to delete address')
  });

  const setDefaultAddressMutation = useMutation((addressId) => addressApi.setDefaultAddress(addressId), {
    onSuccess: () => {
      queryClient.invalidateQueries('customer-addresses');
      queryClient.invalidateQueries('nearby-providers'); // Refetch providers to recalculate distances
      // Navigate back to dashboard to show updated distances
      setTimeout(() => setActivePage('dashboard'), 1000);
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
    { key: 'dashboard', name: 'Dashboard Home', mobileName: 'Home', icon: HomeIcon },
    { key: 'my-orders', name: 'My Orders', mobileName: 'Orders', icon: Package },
    { key: 'addresses', name: 'Address Management', mobileName: 'Address', icon: MapPin },
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
    
    console.log('🔍 Dashboard Debug:');
    console.log('- providersData:', providersData);
    console.log('- providers array:', providers);
    console.log('- providers.length:', providers.length);
    
    // Debug: Check distance field for each provider
    providers.forEach(p => {
      console.log(`Provider: ${p.businessName}, Distance: ${p.distance}, Coordinates: ${p.coordinates?.latitude}, ${p.coordinates?.longitude}`);
    });
    
    // State is now managed at parent level to persist across re-renders
    
    if (providersLoading) return <LoadingSpinner />;

    // Filter and sort providers
    let filteredProviders = providers.filter(provider => {
      const matchesSearch = provider.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           provider.area?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
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
        {/* Selected Address Section - Compact */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4">
          <div className="flex items-center justify-between">
            {normalizedAddresses.length > 0 ? (
              (() => {
                const defaultAddress = normalizedAddresses.find(addr => addr.isDefault);
                const displayAddress = defaultAddress || normalizedAddresses[0];
                return (
                  <>
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <MapPin className="h-4 w-4 text-primary-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-0.5">
                          <span className="text-xs font-semibold text-gray-900">Delivery to:</span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800">
                            {displayAddress.label || 'Home'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 truncate">
                          {displayAddress.street}, {displayAddress.area}, {displayAddress.city} - {displayAddress.pincode}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActivePage('addresses')}
                      className="text-primary-600 hover:text-primary-700 text-xs font-medium flex items-center space-x-1 flex-shrink-0 ml-2"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Change</span>
                    </button>
                  </>
                );
              })()
            ) : (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2 flex-1">
                  <MapPinned className="h-4 w-4 text-warning-600" />
                  <span className="text-xs text-warning-700 font-medium">No delivery address added</span>
                </div>
                <button
                  onClick={() => {
                    setShowAddressModal(true);
                    setEditingAddress(null);
                    setAddressForm({ label: 'home', street: '', area: '', city: '', pincode: '', coordinates: { latitude: null, longitude: null } });
                  }}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 bg-warning-600 hover:bg-warning-700 text-white text-xs font-medium rounded-md transition-colors flex-shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Address</span>
                </button>
              </div>
            )}
          </div>
          {providersRefetching && normalizedAddresses.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="flex items-center space-x-2 text-xs text-primary-600">
                <div className="animate-spin h-3 w-3 border-2 border-primary-600 border-t-transparent rounded-full"></div>
                <span>Updating distances from new address...</span>
              </div>
            </div>
          )}
        </div>

        {/* Hero Banner with Greeting */}
        <div className="bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 rounded-2xl p-5 sm:p-8 mb-6 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">
              Hello, {JSON.parse(localStorage.getItem('user') || '{}')?.name?.split(' ')[0] || 'Customer'}! 👋
            </h1>
            <p className="text-primary-100 text-base sm:text-lg mb-3 sm:mb-4">What would you like to order today?</p>
            
            {/* Quick Stats Row */}
            <div className="flex items-center space-x-3 sm:space-x-6 mt-3 sm:mt-4">
              <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                <Droplets className="h-5 w-5" />
                <span className="font-medium">{providers.length} Providers</span>
              </div>
            </div>
          </div>
          
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-full -mb-24 -mr-24"></div>
        </div>

        {/* Search and Filters - Swiggy Style */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-5 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Search Bar */}
            <div className="sm:col-span-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for water providers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg pl-11 pr-4 py-3 text-base focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
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

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-600">
            <strong>{filteredProviders.length}</strong> water provider{filteredProviders.length !== 1 ? 's' : ''} available near you
          </div>
        </div>

        {/* Providers Grid - Swiggy Style Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredProviders.map((provider) => (
            <div 
              key={provider._id} 
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
              onClick={() => {
                if (provider.isOnline) {
                  const defaultAddress = normalizedAddresses.find(addr => addr.isDefault);
                  setSelectedProvider(provider);
                  setOrderForm({ 
                    providerId: provider._id,
                    quantity: 1,
                    paymentMethod: 'online',
                    specialInstructions: '',
                    deliveryAddress: defaultAddress || null,
                    deliveryTime: 'immediate'
                  });
                  setShowOrderModal(true);
                }
              }}
            >
              {/* Image Header with Status Badge */}
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
                  {normalizedAddresses.length > 0 ? (
                    provider.distance !== undefined && provider.distance !== null ? (
                      <div className="text-sm text-white bg-primary-600 px-3 py-1.5 rounded-md font-bold flex items-center w-fit">
                        📍 {provider.distance} km away
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 italic flex items-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-300 mr-2"></div>
                        Distance not available
                      </div>
                    )
                  ) : (
                    <div className="text-xs text-warning-600 italic flex items-center bg-warning-50 px-2 py-1 rounded">
                      <MapPinned className="h-3.5 w-3.5 mr-1.5" />
                      Add address to see distance
                    </div>
                  )}
                  {provider.serviceRadius && (
                    <div className="text-xs text-gray-600 flex items-center">
                      <div className="h-1.5 w-1.5 rounded-full bg-gray-400 mr-2"></div>
                      Delivers within {provider.serviceRadius} km radius
                    </div>
                  )}
                  {/* Operating Hours */}
                  {provider.operatingHours && (
                    <div className="text-xs text-gray-600 flex items-center">
                      <Clock className="h-3.5 w-3.5 mr-1.5" />
                      {provider.operatingHours.open} - {provider.operatingHours.close}
                      {!provider.isOnline && (
                        <span className="ml-1 text-red-600 font-medium">(Closed)</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Price and Order Button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="text-2xl font-bold text-primary-600">
                      Rs. {provider.pricePerCan}
                    </div>
                    <div className="text-sm text-gray-500">per can</div>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (provider.isOnline) {
                        const defaultAddress = normalizedAddresses.find(addr => addr.isDefault);
                        setSelectedProvider(provider);
                        setOrderForm({ 
                          providerId: provider._id,
                          quantity: 1,
                          paymentMethod: 'online',
                          specialInstructions: '',
                          deliveryAddress: defaultAddress || null,
                          deliveryTime: 'immediate'
                        });
                        setShowOrderModal(true);
                      }
                    }}
                    disabled={!provider.isOnline}
                    className={`w-full sm:w-auto py-3 px-5 rounded-xl font-semibold text-base transition-all min-h-[48px] ${
                      provider.isOnline
                        ? 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-md hover:shadow-lg' 
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
            {searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                }}
                className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors"
              >
                Clear Search
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
    // State is now managed at parent level to persist across re-renders
    const orders = ordersData?.data?.orders || [];
    
    const filteredOrders = orders.filter(order => {
      if (orderFilter === 'active') return ['pending', 'accepted', 'assigned', 'out_for_delivery'].includes(order.status);
      if (orderFilter === 'past') return order.status === 'delivered';
      if (orderFilter === 'cancelled') return ['cancelled', 'failed'].includes(order.status);
      return true;
    });

    if (ordersLoading) return <LoadingSpinner />;

    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6 overflow-x-auto -mx-1 sm:mx-0">
          <nav className="-mb-px flex px-1 sm:px-0" style={{WebkitOverflowScrolling: 'touch'}}>
            {['all', 'active', 'past', 'cancelled'].map(filter => (
              <button
                key={filter}
                onClick={() => setOrderFilter(filter)}
                className={`py-4 px-4 sm:px-3 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 transition-colors ${
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
            <div key={order._id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-2">
                    <Package className="h-5 w-5 text-gray-400" />
                    <span className="font-mono text-sm text-gray-600 truncate">#{order.orderNumber || order._id.slice(-8)}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {order.status === 'pending' && order.paymentMethod === 'online' ? 'Online Pending' : getStatusText(order.status)}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500">{formatDateTime(order.timeline?.ordered)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-lg sm:text-xl font-bold text-primary-600">Rs. {order.items?.totalPrice || 0}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Provider</p>
                  <p className="font-semibold text-gray-900 text-sm">{order.providerId?.businessName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Quantity</p>
                  <p className="font-semibold text-gray-900 text-sm">{order.items?.quantity || 0} cans</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Payment</p>
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    {order.paymentStatus || 'Pending'}
                    {order.paymentMethod === 'online' && (order.paymentStatus === 'pending' || !order.paymentStatus) && (
                      <button
                        className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors border border-blue-200"
                          onClick={async () => {
                            try {
                              const resp = await orderApi.checkPayment(order._id);
                              console.debug('checkPayment resp:', resp);
                              const payload = resp?.data || resp;
                              const updated = payload?.data || payload;
                              const paymentStatus = (updated?.paymentStatus || '').toString().toLowerCase();
                              
                              if (paymentStatus === 'paid') {
                                await queryClient.invalidateQueries('customer-orders', { refetchActive: true });
                                toast.success('Payment successful!');
                              } else if (paymentStatus === 'failed') {
                                await queryClient.invalidateQueries('customer-orders', { refetchActive: true });
                                toast.error('Payment failed.');
                              } else {
                                // Still pending - just refresh, let cron job handle auto-fail after 1 minute
                                await queryClient.invalidateQueries('customer-orders', { refetchActive: true });
                                toast.info('Payment still pending. Will auto-cancel in 1 minute if not completed.');
                              }
                            } catch (e) {
                              console.error('Refresh payment error:', e);
                              toast.error('Error checking payment status');
                            }
                          }}
                      >
                        Refresh
                      </button>
                    )}
                  </p>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Address Management</h1>
          <button 
            onClick={handleAddAddress}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 flex items-center justify-center space-x-2"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleEditAddress(address)}
                      className="text-gray-400 hover:text-primary-600 p-3 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteAddress(address._id)}
                      className="text-gray-400 hover:text-red-600 p-3 rounded-lg hover:bg-red-50 transition-colors"
                      disabled={deleteAddressMutation.isLoading}
                    >
                      <Trash2 className="h-5 w-5" />
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
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50 py-2"
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
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Place Water Order</h2>
              <button 
                type="button"
                onClick={() => setShowOrderModal(false)} 
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto p-4 sm:p-6">
              <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-4 sm:space-y-5">
                
                {/* Provider Info */}
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
                      <Droplets className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedProvider.businessName}</h3>
                      <p className="text-sm text-gray-600">{selectedProvider.area || 'Local Area'}</p>
                      <p className="text-sm text-primary-600 font-medium">Rs. {selectedProvider.pricePerCan} per can</p>
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
                      className="w-12 h-12 border-2 border-gray-300 rounded-xl flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors flex-shrink-0"
                    >
                      <span className="text-2xl font-bold text-gray-600 leading-none">−</span>
                    </button>
                    <div className="flex-1 text-center">
                      <div className="text-4xl font-bold text-gray-900">{orderForm.quantity}</div>
                      <div className="text-sm text-gray-500">cans</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOrderForm({ ...orderForm, quantity: orderForm.quantity + 1 })}
                      className="w-12 h-12 border-2 border-gray-300 rounded-xl flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors flex-shrink-0"
                    >
                      <span className="text-2xl font-bold text-gray-600 leading-none">+</span>
                    </button>
                  </div>
                </div>

                {/* Delivery Address */}
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Delivery Address *</label>
                  <select
                    value={orderForm.deliveryAddress ? orderForm.deliveryAddress._id : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return setOrderForm({ ...orderForm, deliveryAddress: null });
                      const selected = normalizedAddresses.find(a => String(a._id) === String(val));
                      if (selected) {
                        setOrderForm({ ...orderForm, deliveryAddress: selected });
                      } else {
                        setOrderForm({ ...orderForm, deliveryAddress: null });
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    <option value="">Select delivery address</option>
                    {normalizedAddresses.map((addr) => (
                      <option key={addr._id} value={addr._id}>
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

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                  <select
                    value={orderForm.paymentMethod}
                    onChange={(e) => setOrderForm({ ...orderForm, paymentMethod: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="online">💳 Pay Online (UPI/Card)</option>
                    <option value="cash_on_delivery">💵 Cash on Delivery</option>
                  </select>
                </div>
              </form>
            </div>

            {/* Fixed Footer with Total and Submit */}
            <div className="border-t border-gray-200 p-4 sm:p-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Quantity:</span>
                  <span className="font-medium text-gray-900">{orderForm.quantity} cans</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Price per can:</span>
                  <span className="font-medium text-gray-900">Rs. {selectedProvider.pricePerCan}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Payment:</span>
                  <span className="font-medium text-gray-900">{orderForm.paymentMethod === 'online' ? '💳 Online' : '💵 Cash'}</span>
                </div>
                <div className="h-px bg-gray-300 my-2"></div>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total:</span>
                  <span className="text-2xl font-bold text-primary-600">
                    Rs. {selectedProvider.pricePerCan * orderForm.quantity}
                  </span>
                </div>
              </div>
              
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  // Validate delivery address exists
                  if (!orderForm.deliveryAddress) {
                    toast.error('Please select a delivery address');
                    return;
                  }

                  // Check coordinates presence (coerce numeric strings)
                  const rawCoords = orderForm.deliveryAddress?.coordinates || orderForm.deliveryAddress?.address?.coordinates || null;
                  let lat = null;
                  let lng = null;
                  if (rawCoords) {
                    lat = rawCoords.latitude !== undefined ? Number(rawCoords.latitude) : (rawCoords.lat !== undefined ? Number(rawCoords.lat) : null);
                    lng = rawCoords.longitude !== undefined ? Number(rawCoords.longitude) : (rawCoords.lng !== undefined ? Number(rawCoords.lng) : null);
                  }
                  const hasCoords = lat !== null && !isNaN(lat) && lng !== null && !isNaN(lng);

                  if (!hasCoords) {
                    toast.error('Please select an address from the dropdown or add a new address with location');
                    return;
                  }

                  placeOrderMutation.mutate({
                    ...orderForm,
                    providerId: selectedProvider._id
                  });
                }}
                disabled={placeOrderMutation.isLoading || isProcessingPayment}
                className="w-full bg-primary-600 text-white py-3.5 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
              >
                {placeOrderMutation.isLoading || isProcessingPayment ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{isProcessingPayment ? 'Processing Payment...' : 'Placing Order...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    <span>{orderForm.paymentMethod === 'online' ? 'Confirm & Pay' : 'Confirm Order'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Address Coordinates Confirmation removed; simple validation toast used instead */}

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">{editingAddress ? 'Edit Address' : 'Add New Address'}</h2>
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
            <div className="overflow-y-auto p-4 sm:p-6">
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
                <p className="text-xs text-gray-600 mb-3">Click on the map, use your current location, or manually enter coordinates below</p>
                <div className="relative border border-gray-300 rounded-lg overflow-hidden h-52 sm:h-80">
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
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base"
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
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base"
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
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base"
                  placeholder="Area, Locality"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base"
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
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base"
                    placeholder="123456"
                    pattern="[0-9]{6}"
                    maxLength="6"
                    required
                  />
                </div>
              </div>

              {/* Manual Coordinates Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude
                    <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={addressForm.coordinates.latitude || ''}
                    onChange={(e) => {
                      const lat = e.target.value ? parseFloat(e.target.value) : null;
                      setAddressForm({ 
                        ...addressForm, 
                        coordinates: { ...addressForm.coordinates, latitude: lat }
                      });
                      // Update map position if both lat and lng are set
                      if (lat !== null && addressForm.coordinates.longitude !== null) {
                        setMarkerPosition([lat, addressForm.coordinates.longitude]);
                        setMapCenter([lat, addressForm.coordinates.longitude]);
                        setMapZoom(15);
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base"
                    placeholder="e.g., 19.0760"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Longitude
                    <span className="text-xs text-gray-500 ml-1">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={addressForm.coordinates.longitude || ''}
                    onChange={(e) => {
                      const lng = e.target.value ? parseFloat(e.target.value) : null;
                      setAddressForm({ 
                        ...addressForm, 
                        coordinates: { ...addressForm.coordinates, longitude: lng }
                      });
                      // Update map position if both lat and lng are set
                      if (addressForm.coordinates.latitude !== null && lng !== null) {
                        setMarkerPosition([addressForm.coordinates.latitude, lng]);
                        setMapCenter([addressForm.coordinates.latitude, lng]);
                        setMapZoom(15);
                      }
                    }}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base"
                    placeholder="e.g., 72.8777"
                  />
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start space-x-2">
                <MapPin className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  <strong>Tip:</strong> Click on the map, use "Use My Location" button, or manually enter latitude/longitude coordinates above.
                </p>
              </div>
              </div>
            </form>
            </div>
            
            {/* Fixed Footer with Submit Button */}
            <div className="border-t border-gray-200 p-4 sm:p-6">
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
