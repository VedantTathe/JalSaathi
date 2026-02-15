import React, { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { useParams, Link } from 'react-router-dom';
import { 
  Package, 
  MapPin, 
  Phone, 
  Navigation, 
  Clock,
  ChevronLeft,
  Truck,
  CheckCircle,
  User,
  RefreshCw
} from 'lucide-react';
import { userApi } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency, formatDateTime, getStatusColor, getStatusText } from '../utils/helpers';

const TrackOrder = () => {
  const { orderId } = useParams();
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch order tracking details
  const { data: trackingData, isLoading, error, refetch } = useQuery(
    ['track-order', orderId],
    () => userApi.trackOrder(orderId),
    {
      refetchInterval: autoRefresh ? 30000 : false, // Auto-refresh every 30 seconds
      refetchOnWindowFocus: true
    }
  );

  // Auto-disable refresh when order is completed
  useEffect(() => {
    if (trackingData?.order?.status === 'delivered' || trackingData?.order?.status === 'cancelled') {
      setAutoRefresh(false);
    }
  }, [trackingData?.order?.status]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Order not found</h2>
          <p className="text-gray-600 mb-4">Unable to track this order</p>
          <Link to="/orders" className="btn-primary">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const order = trackingData?.order || {};
  const deliveryBoy = order.assignedDeliveryBoy;

  const getEstimatedDeliveryTime = () => {
    const orderTime = new Date(order.createdAt);
    const estimatedTime = new Date(orderTime.getTime() + (60 * 60 * 1000)); // Add 1 hour
    return estimatedTime;
  };

  const trackingSteps = [
    { 
      key: 'pending', 
      label: 'Order Placed', 
      description: 'Your order has been received',
      icon: Package,
      completed: order.status !== 'pending'
    },
    { 
      key: 'accepted', 
      label: 'Order Confirmed', 
      description: 'Provider has accepted your order',
      icon: CheckCircle,
      completed: ['accepted', 'assigned', 'out_for_delivery', 'delivered'].includes(order.status)
    },
    { 
      key: 'assigned', 
      label: 'Assigned for Delivery', 
      description: 'Delivery person has been assigned',
      icon: User,
      completed: ['assigned', 'out_for_delivery', 'delivered'].includes(order.status)
    },
    { 
      key: 'out_for_delivery', 
      label: 'Out for Delivery', 
      description: 'Your order is on the way',
      icon: Truck,
      completed: ['out_for_delivery', 'delivered'].includes(order.status)
    },
    { 
      key: 'delivered', 
      label: 'Delivered', 
      description: 'Order has been delivered',
      icon: CheckCircle,
      completed: order.status === 'delivered'
    }
  ];

  const getCurrentStepIndex = () => {
    const currentStep = trackingSteps.findIndex(step => step.key === order.status);
    return Math.max(0, currentStep);
  };

  const isOrderActive = ['pending', 'accepted', 'assigned', 'out_for_delivery'].includes(order.status);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link to="/orders" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Orders
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Track Order #{order.orderNumber}
              </h1>
              <p className="text-gray-600">
                Real-time tracking for your water delivery
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              {isOrderActive && (
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                  <span className="text-sm text-gray-600">
                    {autoRefresh ? 'Live tracking' : 'Paused'}
                  </span>
                </div>
              )}
              
              <button
                onClick={() => refetch()}
                className="btn-outline text-sm"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Current Status Banner */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                order.status === 'delivered' ? 'bg-success-100' :
                order.status === 'cancelled' ? 'bg-error-100' :
                'bg-primary-100'
              }`}>
                <Package className={`h-6 w-6 ${
                  order.status === 'delivered' ? 'text-success-600' :
                  order.status === 'cancelled' ? 'text-error-600' :
                  'text-primary-600'
                }`} />
              </div>
              <div>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {getStatusText(order.status)}
                </span>
                <p className="text-gray-600 mt-1">
                  {order.status === 'delivered' && 'Your order has been successfully delivered'}
                  {order.status === 'out_for_delivery' && 'Your order is on the way'}
                  {order.status === 'assigned' && 'Delivery person assigned, preparing for delivery'}
                  {order.status === 'accepted' && 'Your order is being prepared'}
                  {order.status === 'pending' && 'Waiting for provider confirmation'}
                  {order.status === 'cancelled' && 'This order has been cancelled'}
                  {order.status === 'rejected' && 'This order was rejected by the provider'}
                </p>
              </div>
            </div>
            
            {order.status === 'delivered' && order.deliveredAt && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Delivered at</p>
                <p className="font-medium text-gray-900">
                  {formatDateTime(order.deliveredAt)}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Tracking */}
          <div className="lg:col-span-2 space-y-8">
            {/* Progress Tracker */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Delivery Progress</h2>
              
              <div className="space-y-6">
                {trackingSteps.map((step, index) => {
                  const StepIcon = step.icon;
                  const isCompleted = step.completed;
                  const isCurrent = getCurrentStepIndex() === index && !isCompleted;
                  
                  return (
                    <div key={step.key} className="flex items-start space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isCompleted ? 'bg-success-100' :
                        isCurrent ? 'bg-primary-100 ring-2 ring-primary-200' :
                        'bg-gray-100'
                      }`}>
                        <StepIcon className={`h-5 w-5 ${
                          isCompleted ? 'text-success-600' :
                          isCurrent ? 'text-primary-600' :
                          'text-gray-400'
                        }`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className={`font-medium ${
                            isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'
                          }`}>
                            {step.label}
                          </h3>
                          {isCompleted && (
                            <span className="text-xs text-success-600 bg-success-100 px-2 py-1 rounded-full">
                              Completed
                            </span>
                          )}
                          {isCurrent && (
                            <span className="text-xs text-primary-600 bg-primary-100 px-2 py-1 rounded-full animate-pulse">
                              In Progress
                            </span>
                          )}
                        </div>
                        <p className={`text-sm mt-1 ${
                          isCompleted || isCurrent ? 'text-gray-600' : 'text-gray-400'
                        }`}>
                          {step.description}
                        </p>
                        
                        {/* Step-specific details */}
                        {step.key === order.status && order.timeline && (
                          <div className="mt-2 text-xs text-gray-500">
                            Updated {formatDateTime(order.timeline[order.timeline.length - 1]?.timestamp)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Estimated delivery time */}
              {isOrderActive && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center text-blue-800">
                    <Clock className="h-4 w-4 mr-2" />
                    <span className="font-medium">
                      Estimated delivery: {formatDateTime(getEstimatedDeliveryTime(), { dateOnly: false })}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Live Location (if available) */}
            {deliveryBoy && order.status === 'out_for_delivery' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Live Tracking</h2>
                
                {/* Placeholder for map - would integrate with Google Maps/Mapbox in real app */}
                <div className="bg-gray-100 h-64 rounded-lg flex items-center justify-center mb-4">
                  <div className="text-center">
                    <Navigation className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">Live map tracking</p>
                    <p className="text-sm text-gray-500">
                      Your delivery person is on the way
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Distance remaining</span>
                  <span className="font-medium">~ 2.3 km</span>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Quantity</span>
                  <span className="font-medium">{order.items?.quantity} cans</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="font-medium">{formatCurrency(order.items?.totalPrice)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-gray-600">Order Date</span>
                  <span className="font-medium">{formatDateTime(order.createdAt, { dateOnly: true })}</span>
                </div>
              </div>
            </div>

            {/* Delivery Person Details */}
            {deliveryBoy && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Person</h2>
                
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{deliveryBoy.name}</p>
                    <p className="text-sm text-gray-600">Delivery Executive</p>
                  </div>
                </div>
                
                <button className="btn-primary w-full text-sm">
                  <Phone className="h-4 w-4 mr-2" />
                  Call {deliveryBoy.name}
                </button>
              </div>
            )}

            {/* Delivery Address */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Address</h2>
              
              <div className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="text-sm text-gray-600">
                  <p>{order.deliveryAddress?.street}</p>
                  <p>{order.deliveryAddress?.area}</p>
                  <p>{order.deliveryAddress?.city} - {order.deliveryAddress?.pincode}</p>
                </div>
              </div>
            </div>

            {/* Support */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h2>
              
              <div className="space-y-3">
                <button className="btn-outline w-full text-sm">
                  Contact Support
                </button>
                <button className="btn-outline w-full text-sm">
                  Report Issue
                </button>
                <Link to={`/orders/${order._id}`} className="btn-outline w-full text-sm text-center block">
                  View Order Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackOrder;