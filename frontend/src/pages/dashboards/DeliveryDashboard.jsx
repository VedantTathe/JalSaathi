import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Home as HomeIcon, Package, MapPin, History, DollarSign, User,
  CheckCircle, Clock, Phone, Navigation, Truck, IndianRupee, Calendar,
  Wallet, Coins, ExternalLink
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import { deliveryApi } from '../../services/api';
import { formatCurrency, formatDateTime, getStatusColor, getStatusText } from '../../utils/helpers';
import toast from 'react-hot-toast';

const DeliveryDashboard = () => {
  const queryClient = useQueryClient();
  const [activePage, setActivePage] = useState('dashboard');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmOrderId, setConfirmOrderId] = useState(null);
  const confirmButtonRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') setConfirmModalOpen(false);
    };
    if (confirmModalOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [confirmModalOpen]);

  // Fetch data
  const { data: ordersData, isLoading: ordersLoading } = useQuery(
    'delivery-orders', 
    () => deliveryApi.getAssignedOrders(),
    {
      onError: (error) => console.error('Error fetching assigned orders:', error)
    }
  );

  const { data: historyData, isLoading: historyLoading } = useQuery(
    'delivery-history',
    () => deliveryApi.getDeliveryHistory(),
    {
      onError: (error) => console.error('Error fetching delivery history:', error)
    }
  );

  // Mutation to update delivery status
  const updateStatusMutation = useMutation(
    ({ orderId, status }) => deliveryApi.updateDeliveryStatus(orderId, status, ''),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('delivery-orders');
        queryClient.invalidateQueries('delivery-history');
        toast.success('Status updated!');
      },
      onError: () => toast.error('Failed to update status')
    }
  );

  const markDeliveredMutation = useMutation(
    (orderId) => deliveryApi.markAsDelivered(orderId, ''),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('delivery-orders');
        queryClient.invalidateQueries('delivery-history');
        toast.success('Order marked as delivered!');
      },
      onError: () => toast.error('Failed to update order')
    }
  );

  const markPaymentReceivedMutation = useMutation(
    (orderId) => deliveryApi.markPaymentReceived(orderId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('delivery-orders');
        queryClient.invalidateQueries('delivery-history');
        toast.success('Payment marked as received!');
      },
      onError: () => toast.error('Failed to update payment status')
    }
  );

  // Calculate pending orders count for badge
  const orders = Array.isArray(ordersData?.data) ? ordersData.data : [];
  const pendingOrdersCount = orders.filter(o => ['assigned', 'out_for_delivery'].includes(o.status)).length;

  const navigation = [
    { key: 'dashboard', name: 'Dashboard Home', mobileName: 'Home', icon: HomeIcon },
    { key: 'assigned-orders', name: 'Assigned Orders', mobileName: 'Orders', icon: Package, badge: pendingOrdersCount },
    { key: 'delivery-tracking', name: 'Delivery Tracking', mobileName: 'Route', icon: MapPin },
    { key: 'history', name: 'Delivery History', mobileName: 'History', icon: History },
    { key: 'stats', name: 'Stats', mobileName: 'Stats', icon: Calendar },
  ].map(item => ({
    ...item,
    href: item.href || '#',
    onClick: () => !item.href && setActivePage(item.key)
  }));

  // 🏠 1. DASHBOARD HOME
  const DashboardHome = () => {
    const orders = Array.isArray(ordersData?.data) ? ordersData.data : [];
    const completedOrders = Array.isArray(historyData?.data?.orders) ? historyData.data.orders : [];
    
    // Get today's date string for comparison
    const today = new Date().toDateString();
    
    // ALL orders delivered today (regardless of when assigned)
    const completedToday = completedOrders.filter(o => {
      if (!o.timeline?.delivered) return false;
      return new Date(o.timeline.delivered).toDateString() === today;
    }).length;
    
    // Pending deliveries assigned today
    const pendingAssignedToday = orders.filter(o => {
      if (!o.timeline?.assigned) return false;
      return new Date(o.timeline.assigned).toDateString() === today;
    }).length;
    
    // Total assigned today = completed today + pending today
    const assignedToday = completedToday + pendingAssignedToday;
    
    // All pending deliveries (assigned + out_for_delivery)
    const pendingDeliveries = orders.length;

    return (
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h1>

        {/* Today's Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-5 sm:p-6">
            <Package className="h-8 w-8 text-primary-600 mb-2" />
            <p className="text-3xl font-bold text-primary-900">{assignedToday}</p>
            <p className="text-sm text-primary-700">Assigned Today</p>
          </div>

        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
          <button
            onClick={() => setActivePage('assigned-orders')}
            className="bg-white border-2 border-primary-200 hover:border-primary-400 rounded-xl p-5 sm:p-6 text-left transition-all min-h-[150px]"
          >
            <div className="flex items-center justify-between mb-3">
              <Package className="h-8 w-8 text-primary-600" />
              <span className="bg-error-500 text-white text-sm rounded-full h-6 w-6 flex items-center justify-center">
                {pendingDeliveries}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">View Assigned Orders</h3>
            <p className="text-sm text-gray-600">Start delivering pending orders</p>
          </button>

          <button
            onClick={() => setActivePage('history')}
            className="bg-white border-2 border-success-200 hover:border-success-400 rounded-xl p-5 sm:p-6 text-left transition-all min-h-[150px]"
          >
            <History className="h-8 w-8 text-success-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-1">Delivery History</h3>
            <p className="text-sm text-gray-600">View completed deliveries</p>
          </button>
        </div>
      </div>
    );
  };

  // 📦 2. ASSIGNED ORDERS (Main Working Screen)
  const AssignedOrders = () => {
    const assignedOrders = Array.isArray(ordersData?.data) ? ordersData.data.filter(o => ['assigned', 'out_for_delivery', 'pending'].includes(o.status)) : [];

    const getNavigationUrl = (address, coords) => {
      if (coords?.latitude && coords?.longitude) {
        return `https://www.google.com/maps/dir/?api=1&destination=${coords.latitude},${coords.longitude}`;
      }
      const fullAddress = `${address?.street || ''}, ${address?.area || ''}, ${address?.city || ''}, ${address?.pincode || ''}`.trim();
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`;
    };

    if (ordersLoading) return <LoadingSpinner />;

    return (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Assigned Orders</h1>
            <p className="text-sm text-gray-600">Clear, concise view of your active deliveries</p>
          </div>
          <div className="text-sm text-gray-500">{assignedOrders.length} active</div>
        </div>

        {assignedOrders.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Package className="h-10 w-10 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">No orders assigned</p>
          </div>
        ) : (
          <div className="space-y-3">
            {assignedOrders.map((order) => (
              <div key={order._id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden p-4 sm:p-5">
                <div className="lg:flex lg:items-center lg:justify-between gap-3">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-5 w-5 text-primary-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-500">Customer</p>
                      <h3 className="text-base sm:text-sm font-semibold text-gray-900 truncate">{order.customerId?.name || 'Customer'}</h3>
                      <p className="text-xs text-gray-500 break-words">{order.deliveryAddress?.street || order.deliveryAddress?.area || ''} • {order.deliveryAddress?.city || ''} {order.deliveryAddress?.pincode || ''}</p>
                    </div>
                  </div>

                  <div className="mt-3 lg:mt-0 flex items-center gap-3 sm:gap-4 flex-wrap justify-between">
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Order</p>
                      <p className="text-sm font-mono text-gray-900">#{order.orderNumber || order._id.slice(-8)}</p>
                    </div>

                    <div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3 items-start">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Package className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-xs text-gray-500">Provider</div>
                      <div className="text-sm font-medium text-gray-900 truncate">{order.providerId?.businessName || 'N/A'}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-xs text-gray-500">Assigned</div>
                      <div className="text-sm text-gray-900">{formatDateTime(order.timeline?.assigned)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="text-xs text-gray-500">Contact</div>
                      <a href={`tel:${order.customerId?.phone || ''}`} className="text-sm font-medium text-primary-600">{order.customerId?.phone || 'No phone'}</a>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    {order.paymentMethod === 'cash_on_delivery' ? (
                      <Coins className="h-4 w-4 text-orange-500" />
                    ) : (
                      <Wallet className="h-4 w-4 text-green-500" />
                    )}
                    <div>
                      <div className="text-xs text-gray-500">Payment</div>
                      <div className="text-sm font-medium">
                        <span className={order.paymentMethod === 'cash_on_delivery' ? 'text-orange-600' : 'text-green-600'}>
                          {order.paymentMethod === 'cash_on_delivery' ? 'COD' : 'Online'}
                        </span>
                        {order.paymentMethod === 'cash_on_delivery' && (
                          <span className={order.paymentStatus === 'paid' ? 'ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700' : 'ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700'}>
                            {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
                  <button
                    onClick={() => window.open(getNavigationUrl(order.deliveryAddress, order.deliveryAddress?.coordinates), '_blank')}
                    className="w-full sm:w-auto bg-white border border-primary-200 text-primary-700 py-3 px-4 rounded-lg text-sm font-medium hover:bg-primary-50 transition-colors min-h-[48px]"
                    aria-label={`Navigate to ${order.customerId?.name || 'customer'}`}
                  >
                    <Navigation className="h-4 w-4 inline-block mr-2" />
                    Navigate
                  </button>

                  {order.paymentMethod === 'cash_on_delivery' && order.paymentStatus !== 'paid' && (
                    <button
                      onClick={() => markPaymentReceivedMutation.mutate(order._id)}
                      disabled={markPaymentReceivedMutation.isLoading}
                      className="w-full sm:w-auto bg-orange-500 text-white py-3 px-4 rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors min-h-[48px]"
                      aria-label={`Mark payment received for order ${order.orderNumber || order._id.slice(-8)}`}
                    >
                      <IndianRupee className="h-4 w-4 inline-block mr-2" />
                      Payment Done
                    </button>
                  )}

                  {/* Disable Mark Delivered for COD orders until payment is collected */}
                  {(order.paymentMethod !== 'cash_on_delivery' || order.paymentStatus === 'paid') ? (
                    <button
                      onClick={() => { setConfirmOrderId(order._id); setConfirmModalOpen(true); }}
                      disabled={markDeliveredMutation.isLoading}
                      className="w-full sm:w-auto bg-green-600 text-white py-3 px-4 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors min-h-[48px]"
                      aria-label={`Mark order ${order.orderNumber || order._id.slice(-8)} as delivered`}
                    >
                      <CheckCircle className="h-4 w-4 inline-block mr-2" />
                      Mark Delivered
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full sm:w-auto bg-gray-300 text-gray-500 py-3 px-4 rounded-lg text-sm font-semibold cursor-not-allowed min-h-[48px]"
                      title="Collect payment first"
                    >
                      <CheckCircle className="h-4 w-4 inline-block mr-2" />
                      Mark Delivered
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 🗺️ 3. DELIVERY NAVIGATION - Single Map View
  const DeliveryTracking = () => {
    const [currentLocation, setCurrentLocation] = useState(null);
    const [locationError, setLocationError] = useState(null);
    const [optimizedRoute, setOptimizedRoute] = useState([]);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);

    // Get all orders that need delivery
    const allPendingOrders = orders.filter(o => 
      ['assigned', 'out_for_delivery'].includes(o.status)
    );

    // Calculate distance between two coordinates (Haversine formula)
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371; // Earth's radius in km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Optimize route using nearest neighbor algorithm
    const optimizeRoute = (startLat, startLon, ordersList) => {
      if (ordersList.length === 0) return [];
      if (ordersList.length === 1) return ordersList;

      const unvisited = [...ordersList];
      const route = [];
      let currentLat = startLat;
      let currentLon = startLon;

      while (unvisited.length > 0) {
        let nearestIndex = 0;
        let nearestDistance = Infinity;

        unvisited.forEach((order, index) => {
          const coords = order.deliveryAddress?.coordinates;
          if (coords?.latitude && coords?.longitude) {
            const distance = calculateDistance(
              currentLat, currentLon,
              coords.latitude, coords.longitude
            );
            if (distance < nearestDistance) {
              nearestDistance = distance;
              nearestIndex = index;
            }
          }
        });

        const nearest = unvisited.splice(nearestIndex, 1)[0];
        route.push(nearest);
        
        const coords = nearest.deliveryAddress?.coordinates;
        if (coords?.latitude && coords?.longitude) {
          currentLat = coords.latitude;
          currentLon = coords.longitude;
        }
      }

      return route;
    };

    // Get current location
    const getCurrentLocation = () => {
      setIsLoadingLocation(true);
      setLocationError(null);

      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported by your browser');
        setIsLoadingLocation(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          setCurrentLocation(location);
          
          // Optimize route from current location
          const route = optimizeRoute(
            location.latitude,
            location.longitude,
            allPendingOrders
          );
          setOptimizedRoute(route);
          setIsLoadingLocation(false);
        },
        (error) => {
          setLocationError('Unable to get your location. Please enable location services.');
          setIsLoadingLocation(false);
          toast.error('Location access denied');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    // Get address text for an order
    const getAddressText = (order) => {
      const addr = order.deliveryAddress;
      return `${addr?.street || ''}, ${addr?.area || ''}, ${addr?.city || ''}, ${addr?.pincode || ''}`;
    };

    // Build Google Maps URL with all markers
    const getMapUrl = () => {
      if (!currentLocation) return null;

      // Start with base URL
      let url = 'https://www.google.com/maps/dir/?api=1';
      
      // Add delivery boy's current location as origin
      url += `&origin=${currentLocation.latitude},${currentLocation.longitude}`;
      
      // If we have optimized route, show the route
      if (optimizedRoute.length > 0) {
        // Last stop is destination
        const lastStop = optimizedRoute[optimizedRoute.length - 1];
        const lastCoords = lastStop.deliveryAddress?.coordinates;
        if (lastCoords?.latitude && lastCoords?.longitude) {
          url += `&destination=${lastCoords.latitude},${lastCoords.longitude}`;
        } else {
          url += `&destination=${encodeURIComponent(getAddressText(lastStop))}`;
        }

        // All other stops are waypoints
        if (optimizedRoute.length > 1) {
          const waypoints = optimizedRoute.slice(0, -1)
            .map(order => {
              const coords = order.deliveryAddress?.coordinates;
              if (coords?.latitude && coords?.longitude) {
                return `${coords.latitude},${coords.longitude}`;
              }
              return encodeURIComponent(getAddressText(order));
            })
            .join('|');
          url += `&waypoints=${waypoints}`;
        }
      } else if (allPendingOrders.length > 0) {
        // If no optimization yet, show first order as destination
        const firstOrder = allPendingOrders[0];
        const coords = firstOrder.deliveryAddress?.coordinates;
        if (coords?.latitude && coords?.longitude) {
          url += `&destination=${coords.latitude},${coords.longitude}`;
        } else {
          url += `&destination=${encodeURIComponent(getAddressText(firstOrder))}`;
        }
      }

      url += `&travelmode=driving`;
      return url;
    };

    // Open full map in Google Maps
    const openFullMap = () => {
      const url = getMapUrl();
      if (url) {
        window.open(url, '_blank');
      }
    };

    // Mark order as delivered
    const handleMarkDelivered = (order) => {
      if (order.paymentMethod === 'cash_on_delivery' && order.paymentStatus !== 'paid') {
        toast.error('Please collect payment first');
        return;
      }

      markDeliveredMutation.mutate(order._id, {
        onSuccess: () => {
          toast.success('Order delivered! Route updated.');
          // Refresh location and route
          getCurrentLocation();
        }
      });
    };

    // Initial route optimization on component mount
    useEffect(() => {
      if (allPendingOrders.length > 0 && !currentLocation) {
        getCurrentLocation();
      }
    }, [allPendingOrders.length]);

    // Get nearest stop (first in optimized route)
    const nearestStop = optimizedRoute.length > 0 ? optimizedRoute[0] : null;

    return (
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Delivery Route Map</h1>
        <p className="text-sm sm:text-base text-gray-600 mb-4">View all delivery locations on one map</p>

        {/* No orders message */}
        {allPendingOrders.length === 0 && (
          <div className="bg-gray-100 rounded-xl p-8 text-center mb-6">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No pending deliveries</p>
            <p className="text-sm text-gray-500">All deliveries are complete!</p>
          </div>
        )}

        {allPendingOrders.length > 0 && (
          <>
            {/* Location Button */}
            <div className="mb-4">
              <button
                onClick={getCurrentLocation}
                disabled={isLoadingLocation}
                className="w-full bg-primary-600 text-white rounded-lg p-4 sm:p-5 font-semibold hover:bg-primary-700 disabled:opacity-50 transition-all flex items-center justify-center space-x-2 shadow-md active:scale-95"
              >
                <MapPin className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="text-base sm:text-lg">{isLoadingLocation ? 'Getting Location...' : currentLocation ? 'Refresh My Location' : 'Get My Location & Optimize Route'}</span>
              </button>
              {locationError && (
                <p className="text-sm text-error-600 mt-2 text-center">{locationError}</p>
              )}
            </div>

            {/* Map Container */}
            {currentLocation && (
              <div className="bg-white rounded-lg shadow-lg border-2 border-gray-200 overflow-hidden mb-4">
                {/* Map Display with Customer Labels */}
                <div className="relative h-[340px] sm:h-[500px] lg:h-[600px]">
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${currentLocation.latitude},${currentLocation.longitude}&destination=${
                      nearestStop?.deliveryAddress?.coordinates?.latitude && nearestStop?.deliveryAddress?.coordinates?.longitude
                        ? `${nearestStop.deliveryAddress.coordinates.latitude},${nearestStop.deliveryAddress.coordinates.longitude}`
                        : encodeURIComponent(getAddressText(nearestStop || allPendingOrders[0]))
                    }${optimizedRoute.length > 1 ? `&waypoints=${optimizedRoute.slice(1).map(o => {
                      const coords = o.deliveryAddress?.coordinates;
                      return coords?.latitude && coords?.longitude ? `${coords.latitude},${coords.longitude}` : encodeURIComponent(getAddressText(o));
                    }).join('|')}` : ''}&mode=driving`}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Delivery Route Map"
                  />
                  {/* Overlay Open in Google Maps Button */}
                  <button
                    onClick={openFullMap}
                    className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-white shadow-lg rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base font-semibold text-primary-600 hover:bg-primary-50 transition-colors flex items-center space-x-1.5 border-2 border-primary-200 z-10 active:scale-95"
                  >
                    <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">Open in Maps</span>
                    <span className="sm:hidden">Maps</span>
                  </button>

                  {/* Prominent Customer Labels Overlay - Left Side (Hidden on mobile) */}
                  <div className="hidden lg:flex absolute left-3 top-3 bottom-3 w-64 xl:w-72 bg-white shadow-2xl rounded-lg border-2 border-primary-300 overflow-hidden flex-col">
                    <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-3 py-2.5 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-white" />
                        <h4 className="text-sm font-bold text-white">Customer Stops</h4>
                      </div>
                      <span className="text-xs bg-white text-primary-700 font-bold px-2 py-1 rounded-full">{optimizedRoute.length}</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-2 space-y-1.5 bg-gray-50">
                      {optimizedRoute.map((order, index) => (
                        <div 
                          key={order._id} 
                          className={`rounded-lg p-2 shadow-sm border-2 ${
                            index === 0 
                              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-400' 
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          <div className="flex items-start space-x-2">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md ${
                              index === 0 ? 'bg-green-500' : 'bg-red-500'
                            }`}>
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate">
                                {order.customerId?.name || 'Customer'}
                              </p>
                              <p className="text-xs text-gray-600 truncate">
                                {order.deliveryAddress?.area || order.deliveryAddress?.street}
                              </p>
                              {index === 0 && (
                                <span className="inline-block mt-1 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-semibold">
                                  NEAREST
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-3 py-2 border-t border-gray-200">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                          <span className="text-gray-700 font-medium">Nearest</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="h-2 w-2 bg-red-500 rounded-full"></div>
                          <span className="text-gray-700 font-medium">Other Stops</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Your Location Indicator - Top Left (Responsive) */}
                  <div className="absolute top-2 left-2 lg:top-3 lg:left-[280px] xl:left-[300px] bg-blue-600 shadow-xl rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 border-2 border-blue-400">
                    <div className="flex items-center space-x-1.5 sm:space-x-2">
                      <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 bg-white rounded-full animate-pulse"></div>
                      <span className="text-xs font-bold text-white">You</span>
                    </div>
                  </div>
                </div>

                {/* Map Info Bar */}
                <div className="bg-gradient-to-r from-primary-50 to-blue-50 px-3 sm:px-4 py-2.5 sm:py-3 border-t-2 border-primary-200">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center space-x-2 sm:space-x-4 flex-wrap gap-1">
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <div className="h-3 w-3 sm:h-4 sm:w-4 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
                        <span className="text-gray-700 font-bold">You</span>
                      </div>
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <div className="h-3 w-3 sm:h-4 sm:w-4 bg-green-600 rounded-full border-2 border-white shadow-md"></div>
                        <span className="text-gray-700 font-bold hidden sm:inline">Stop #1 (Nearest)</span>
                        <span className="text-gray-700 font-bold sm:hidden">Nearest</span>
                      </div>
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <div className="h-3 w-3 sm:h-4 sm:w-4 bg-red-600 rounded-full border-2 border-white shadow-md"></div>
                        <span className="text-gray-700 font-bold">Other</span>
                      </div>
                    </div>
                    <span className="text-primary-700 font-extrabold text-base sm:text-lg whitespace-nowrap">{optimizedRoute.length} Stops</span>
                  </div>
                </div>
              </div>
            )}

            {/* Nearest Customer Highlight */}
            {nearestStop && currentLocation && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-300 rounded-lg p-4 sm:p-5 mb-4 shadow-md">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="h-12 w-12 sm:h-14 sm:w-14 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-lg">
                      1
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm text-green-700 font-semibold">NEAREST STOP</p>
                      <p className="font-bold text-gray-900 text-base sm:text-lg">{nearestStop.customerId?.name || 'Customer'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs sm:text-sm text-gray-600">Distance</p>
                    <p className="text-lg sm:text-xl font-bold text-green-600">
                      {calculateDistance(
                        currentLocation.latitude,
                        currentLocation.longitude,
                        nearestStop.deliveryAddress?.coordinates?.latitude || 0,
                        nearestStop.deliveryAddress?.coordinates?.longitude || 0
                      ).toFixed(1)} km
                    </p>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 shadow-sm">
                  <p className="text-sm sm:text-base text-gray-900 mb-2">
                    <MapPin className="h-4 w-4 sm:h-5 sm:w-5 inline-block text-gray-500 mr-1.5" />
                    {getAddressText(nearestStop)}
                  </p>
                  <div className="flex items-center space-x-2 sm:space-x-3 text-sm sm:text-base flex-wrap">
                    <span className="text-gray-600 font-medium">
                      {nearestStop.items?.quantity} cans • Rs. {nearestStop.items?.totalPrice}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs sm:text-sm font-semibold ${
                      nearestStop.paymentMethod === 'cash_on_delivery' 
                        ? 'bg-orange-100 text-orange-700' 
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {nearestStop.paymentMethod === 'cash_on_delivery' ? 'COD' : 'Paid'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                  {nearestStop.customerId?.phone && (
                    <a
                      href={`tel:${nearestStop.customerId.phone}`}
                      className="bg-white border-2 border-blue-500 text-blue-600 py-3 sm:py-3.5 px-3 sm:px-4 rounded-lg font-semibold hover:bg-blue-50 active:scale-95 transition-all flex items-center justify-center space-x-1 sm:space-x-2 shadow-sm min-h-[48px]"
                    >
                      <Phone className="h-5 w-5 sm:h-5 sm:w-5" />
                      <span className="text-xs sm:text-sm">Call</span>
                    </a>
                  )}
                  <button
                    onClick={openFullMap}
                    className="bg-blue-600 text-white py-3 sm:py-3.5 px-3 sm:px-4 rounded-lg font-semibold hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center space-x-1 sm:space-x-2 shadow-md min-h-[48px]"
                  >
                    <Navigation className="h-5 w-5 sm:h-5 sm:w-5" />
                    <span className="text-xs sm:text-sm">Navigate</span>
                  </button>
                  <button
                    onClick={() => handleMarkDelivered(nearestStop)}
                    disabled={markDeliveredMutation.isLoading}
                    className="bg-green-600 text-white py-3 sm:py-3.5 px-3 sm:px-4 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center space-x-1 sm:space-x-2 shadow-md min-h-[48px]"
                  >
                    <CheckCircle className="h-5 w-5 sm:h-5 sm:w-5" />
                    <span className="text-xs sm:text-sm">Done</span>
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Customer Stops List - Show on mobile, hide on large screens */}
            <div className="lg:hidden mb-4">
              <div className="bg-white rounded-lg shadow-md border-2 border-primary-300 overflow-hidden">
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5 text-white" />
                    <h4 className="text-base font-bold text-white">Customer Stops</h4>
                  </div>
                  <span className="text-sm bg-white text-primary-700 font-bold px-3 py-1 rounded-full">{optimizedRoute.length}</span>
                </div>
                
                <div className="p-3 space-y-2 bg-gray-50 max-h-96 overflow-y-auto">
                  {optimizedRoute.map((order, index) => (
                    <div 
                      key={order._id} 
                      className={`rounded-lg p-3 shadow-sm border-2 active:scale-98 transition-transform ${
                        index === 0 
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-400' 
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-md ${
                          index === 0 ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-bold text-gray-900 truncate">
                            {order.customerId?.name || 'Customer'}
                          </p>
                          <p className="text-sm text-gray-600 truncate">
                            {order.deliveryAddress?.area || order.deliveryAddress?.street}
                          </p>
                          {index === 0 && (
                            <span className="inline-block mt-1.5 text-xs bg-green-500 text-white px-2.5 py-1 rounded-full font-semibold shadow-sm">
                              NEAREST
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-gradient-to-r from-gray-100 to-gray-50 px-4 py-3 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-3">
                      <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                      <span className="text-gray-700 font-medium">Nearest</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="h-3 w-3 bg-red-500 rounded-full"></div>
                      <span className="text-gray-700 font-medium">Other Stops</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* All Stops List */}
            {optimizedRoute.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">All Delivery Stops (Optimized by Distance)</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {optimizedRoute.map((order, index) => {
                    const distance = currentLocation ? calculateDistance(
                      currentLocation.latitude,
                      currentLocation.longitude,
                      order.deliveryAddress?.coordinates?.latitude || 0,
                      order.deliveryAddress?.coordinates?.longitude || 0
                    ) : 0;

                    return (
                      <div 
                        key={order._id} 
                        className={`p-4 ${index === 0 ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                              index === 0 ? 'bg-green-500' : 'bg-blue-500'
                            }`}>
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <p className="font-medium text-gray-900">{order.customerId?.name || 'Customer'}</p>
                                {index === 0 && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-green-500 text-white font-semibold">Nearest</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 break-words mb-1">
                                {order.deliveryAddress?.street}, {order.deliveryAddress?.area}
                              </p>
                              <div className="flex items-center flex-wrap gap-2">
                                <span className="text-xs text-gray-600">{order.items?.quantity} cans • Rs. {order.items?.totalPrice}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  order.paymentMethod === 'cash_on_delivery' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                                }`}>
                                  {order.paymentMethod === 'cash_on_delivery' ? 'COD' : 'Paid'}
                                </span>
                                {distance > 0 && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                    {distance.toFixed(1)} km away
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                            {order.customerId?.phone && (
                              <a 
                                href={`tel:${order.customerId.phone}`} 
                                className="p-3 bg-blue-100 rounded-full text-blue-600 hover:bg-blue-200 min-h-[48px] min-w-[48px] flex items-center justify-center"
                              >
                                <Phone className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  // 📜 4. DELIVERY HISTORY
  const DeliveryHistory = () => {
    const [dateFilter, setDateFilter] = useState('today');
    const allCompletedOrders = Array.isArray(historyData?.data?.orders) ? historyData.data.orders : [];

    // Filter orders based on selected time period
    const getFilteredOrders = () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      switch (dateFilter) {
        case 'today':
          return allCompletedOrders.filter(order => {
            const deliveryDate = order.timeline?.delivered ? new Date(order.timeline.delivered) : null;
            return deliveryDate && deliveryDate >= today;
          });
        case 'week':
          return allCompletedOrders.filter(order => {
            const deliveryDate = order.timeline?.delivered ? new Date(order.timeline.delivered) : null;
            return deliveryDate && deliveryDate >= weekAgo;
          });
        case 'month':
          return allCompletedOrders.filter(order => {
            const deliveryDate = order.timeline?.delivered ? new Date(order.timeline.delivered) : null;
            return deliveryDate && deliveryDate >= monthStart;
          });
        case 'all':
        default:
          return allCompletedOrders;
      }
    };

    const completedOrders = getFilteredOrders();

    // Calculate total earnings for filtered period
    const totalEarnings = completedOrders.reduce((sum, order) => sum + (order.items?.totalPrice || 0), 0);

    if (historyLoading) return <LoadingSpinner />;

    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Delivery History</h1>

        {/* Date Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <select 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-3 text-base sm:text-sm font-medium w-full sm:w-auto"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="all">All Time</option>
            </select>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">{completedOrders.length}</span> deliveries completed
            </p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg px-4 py-3 border border-green-200">
            <p className="text-xs text-green-700 font-medium">Total Earnings</p>
            <p className="text-lg font-bold text-green-900">Rs. {totalEarnings.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* History List */}
        <div className="space-y-3">
          {completedOrders.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No deliveries found for this period</p>
            </div>
          ) : (
            completedOrders.map((order) => (
              <div key={order._id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-green-600 to-green-700 px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="bg-white/20 backdrop-blur-sm rounded-md px-2 py-1">
                      <span className="font-mono text-xs font-bold text-white">
                        #{order.orderNumber || order._id.slice(-8)}
                      </span>
                    </div>
                    <div className="bg-white/90 text-green-700 px-2 py-0.5 rounded-full flex items-center space-x-1">
                      <CheckCircle className="h-3 w-3" />
                      <span className="text-xs font-semibold">Delivered</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">Rs. {order.items?.totalPrice || 0}</p>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Left: Customer & Time Info */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <div className="bg-blue-100 rounded-full p-2">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Customer</p>
                          <p className="text-sm font-bold text-gray-900">{order.customerId?.name}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className="bg-purple-100 rounded-full p-2">
                          <Clock className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Delivered At</p>
                          <p className="text-sm font-medium text-gray-900">{formatDateTime(order.timeline?.delivered)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Right: Order Details */}
                    <div className="space-y-2">
                      <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                        <p className="text-xs text-gray-500">Quantity</p>
                        <p className="text-sm font-semibold text-gray-900">{order.items?.quantity || 0} cans</p>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                        <p className="text-xs text-gray-500">Provider</p>
                        <p className="text-sm font-semibold text-gray-900">{order.providerId?.businessName || 'N/A'}</p>
                      </div>

                      <div className={order.paymentMethod === 'cash_on_delivery' ? 'rounded-lg p-2 border bg-orange-50 border-orange-200' : 'rounded-lg p-2 border bg-green-50 border-green-200'}>
                        <p className="text-xs text-gray-500">Payment Method</p>
                        <div className="flex items-center gap-1.5">
                          {order.paymentMethod === 'cash_on_delivery' ? (
                            <Coins className="h-4 w-4 text-orange-500" />
                          ) : (
                            <Wallet className="h-4 w-4 text-green-500" />
                          )}
                          <p className={order.paymentMethod === 'cash_on_delivery' ? 'text-sm font-semibold text-orange-700' : 'text-sm font-semibold text-green-700'}>
                            {order.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : 'Online Payment'}
                          </p>
                          <span className={order.paymentStatus === 'paid' ? 'ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700' : order.paymentStatus === 'refunded' ? 'ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700' : 'ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700'}>
                            {order.paymentStatus === 'paid' ? 'Paid' : order.paymentStatus === 'refunded' ? 'Refunded' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Delivery Address */}
                  {order.deliveryAddress && (
                    <div className="mt-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-start space-x-2">
                        <MapPin className="h-4 w-4 text-primary-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">Delivery Location</p>
                          <p className="text-sm text-gray-900">
                            {order.deliveryAddress?.street}, {order.deliveryAddress?.area}, {order.deliveryAddress?.city} - {order.deliveryAddress?.pincode}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // 📊 5. STATS - show counts instead of earnings
  const Stats = () => {
    const assignedOrders = Array.isArray(ordersData?.data) ? ordersData.data : [];
    const historyOrders = Array.isArray(historyData?.data?.orders) ? historyData.data.orders : [];

    const allOrders = [...assignedOrders, ...historyOrders];
    const deliveredOrders = allOrders.filter(o => o.status === 'delivered');

    const today = new Date().toDateString();
    const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

    const deliveredToday = deliveredOrders.filter(o => o.timeline?.delivered && new Date(o.timeline.delivered).toDateString() === today).length;
    const totalDelivered = deliveredOrders.length;

    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Stats</h1>
        <p className="text-gray-600 mb-6">Delivery counts (no monetary data)</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
          <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-5 sm:p-6">
            <Calendar className="h-8 w-8 text-primary-600 mb-2" />
            <p className="text-3xl font-bold text-primary-900">{deliveredToday}</p>
            <p className="text-sm text-primary-700">Delivered Today</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 sm:p-6">
            <Package className="h-8 w-8 text-purple-600 mb-2" />
            <p className="text-3xl font-bold text-purple-900">{totalDelivered}</p>
            <p className="text-sm text-purple-700">Total Delivered</p>
          </div>
        </div>

        {/* Date grouped history: show recent days with delivered counts */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-semibold mb-3">Delivery History by Date</h3>
          <div className="space-y-2">
            {
              // Group delivered orders by date string
            }
            {(() => {
              const groups = {};
              deliveredOrders.forEach((o) => {
                if (!o.timeline?.delivered) return;
                const d = new Date(o.timeline.delivered);
                const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
                if (!groups[key]) groups[key] = { date: new Date(d.getFullYear(), d.getMonth(), d.getDate()), count: 0 };
                groups[key].count++;
              });

              const sorted = Object.values(groups).sort((a, b) => b.date - a.date).slice(0, 14);

              if (sorted.length === 0) {
                return (
                  <div className="text-center py-6 text-sm text-gray-600">No deliveries yet</div>
                );
              }

              return sorted.map((g) => {
                const todayLabel = new Date().toDateString();
                const yesterdayLabel = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
                const label = g.date.toDateString() === todayLabel ? 'Today' : (g.date.toDateString() === yesterdayLabel ? 'Yesterday' : g.date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }));
                return (
                  <div key={g.date.toISOString()} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                    <div className="text-sm text-gray-700">{label}</div>
                    <div className="text-sm font-semibold text-gray-900">{g.count} deliveries</div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
    );
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardHome />;
      case 'assigned-orders': return <AssignedOrders />;
      case 'delivery-tracking': return <DeliveryTracking />;
      case 'history': return <DeliveryHistory />;
      case 'stats': return <Stats />;
      default: return <DashboardHome />;
    }
  };

  return (
    <DashboardLayout navigation={navigation} activeTab={activePage}>
      {renderPage()}

      {/* Confirmation modal for marking delivered */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black opacity-40" onClick={() => setConfirmModalOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-lg max-w-md w-full p-4 sm:p-6 z-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Confirm Delivery</h2>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to mark this order as delivered? This action cannot be undone.</p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="w-full sm:w-auto bg-white border border-gray-200 py-3 px-4 rounded-lg text-sm text-gray-700 hover:bg-gray-50 min-h-[48px]"
              >
                Cancel
              </button>
              <button
                ref={confirmButtonRef}
                onClick={() => {
                  if (!confirmOrderId) return;
                  markDeliveredMutation.mutate(confirmOrderId, {
                    onSettled: () => {
                      setConfirmModalOpen(false);
                      setConfirmOrderId(null);
                    }
                  });
                }}
                className="w-full sm:w-auto bg-green-600 text-white py-3 px-4 rounded-lg text-sm font-semibold hover:bg-green-700 min-h-[48px]"
              >
                Yes, mark delivered
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DeliveryDashboard;
