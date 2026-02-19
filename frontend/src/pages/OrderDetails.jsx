import React from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useParams, Link } from 'react-router-dom';
import { 
  Package, 
  MapPin, 
  Phone, 
  User, 
  Store, 
  Clock, 
  CreditCard,
  ChevronLeft,
  Download,
  Truck
} from 'lucide-react';
import { userApi, orderApi } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { formatCurrency, formatDateTime, getStatusColor, getStatusText } from '../utils/helpers';
import toast from 'react-hot-toast';

// Helper to load Cashfree SDK
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

// Payment button component
const MakePaymentButton = ({ order, onSuccess }) => {
  const createPayment = useMutation(() => orderApi.createPayment(order._id));
  const verifyPayment = useMutation(({ orderId, payload }) => orderApi.verifyPayment(orderId, payload));

  const handlePay = async () => {
    try {
      console.log('Creating payment for order:', order._id);
      const res = await createPayment.mutateAsync();
      console.log('Payment creation response:', res);

      const responseData = res?.data || res;
      const rOrder = responseData?.order || responseData?.data || responseData;

      // Prefer a direct checkout URL if backend returned one
      const checkoutUrl = rOrder?.checkout_url || rOrder?.payment_link || rOrder?.paymentLink || rOrder?.data?.checkout_url;
      if (checkoutUrl) {
        window.open(checkoutUrl, '_blank');
        return;
      }

      // Otherwise try to use Cashfree JS SDK if available
      console.log('Loading Cashfree SDK...');
      await loadCashfreeScript();
      console.log('Cashfree SDK loaded successfully');

      // Cashfree SDK usage varies; attempt a generic init if available
      if (window.cashfree && typeof window.cashfree.init === 'function') {
        try {
          await window.cashfree.init({
            orderToken: rOrder?.order_token || rOrder?.token || rOrder?.data?.order_token,
            orderId: rOrder?.order_id || rOrder?.orderId || rOrder?.id,
            appId: responseData?.appId || responseData?.key || process.env.REACT_APP_CASHFREE_APP_ID
          });
          // After init, open checkout (SDK-specific)
          if (typeof window.cashfree.open === 'function') window.cashfree.open();
          return;
        } catch (e) {
          console.warn('Cashfree SDK init failed:', e);
        }
      }

      toast.error('Unable to open Cashfree checkout. Contact support.');
    } catch (error) {
      console.error('Payment error:', error);
      const errorMsg = error?.response?.data?.message || error.message || 'Payment failed';
      toast.error(errorMsg);
    }
  };

  return (
    <button 
      onClick={handlePay} 
      disabled={createPayment.isLoading || verifyPayment.isLoading}
      className="btn-primary w-full disabled:opacity-50"
    >
      {createPayment.isLoading ? 'Processing...' : 'Make Payment'}
    </button>
  );
};

const OrderDetails = () => {
  const { orderId } = useParams();
  const queryClient = useQueryClient();

  // Handle successful payment
  const handlePaymentSuccess = () => {
    queryClient.invalidateQueries(['order-details', orderId]);
    queryClient.invalidateQueries('customer-orders');
    // Refresh the page data after short delay to show updated status
    setTimeout(() => {
      queryClient.refetchQueries(['order-details', orderId]);
    }, 500);
  };

  // Fetch order details
  const { data: order, isLoading, error } = useQuery(
    ['order-details', orderId],
    () => userApi.getOrderDetails(orderId)
  );

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
          <p className="text-gray-600 mb-4">
            The order you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Link to="/orders" className="btn-primary">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const getDeliveryTime = () => {
    if (order.status === 'delivered' && order.deliveredAt) {
      const orderTime = new Date(order.createdAt);
      const deliveryTime = new Date(order.deliveredAt);
      const diffMinutes = Math.floor((deliveryTime - orderTime) / (1000 * 60));
      return `${Math.floor(diffMinutes / 60)}h ${diffMinutes % 60}m`;
    }
    return null;
  };

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
                Order #{order.orderNumber}
              </h1>
              <p className="text-gray-600">
                Placed on {formatDateTime(order.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <div className="mb-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {getStatusText(order.status)}
                </span>
              </div>
              {getDeliveryTime() && (
                <p className="text-sm text-gray-600">
                  Delivered in {getDeliveryTime()}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-water-100 rounded-lg flex items-center justify-center">
                      <Package className="h-6 w-6 text-water-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Water Can (20L)</h3>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(order.items?.pricePerCan)} per can
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">× {order.items?.quantity}</p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(order.items?.totalPrice)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900">{formatCurrency(order.items?.totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Delivery Fee</span>
                    <span className="text-gray-900">{formatCurrency(0)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold pt-2 border-t">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">{formatCurrency(order.items?.totalPrice)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Provider Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Provider Details</h2>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center">
                  <Store className="h-6 w-6 text-success-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{order.providerId?.businessName}</h3>
                  <p className="text-sm text-gray-600 mb-2">{order.providerId?.area}</p>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">Contact</p>
                      <div className="flex items-center text-gray-900">
                        <Phone className="h-4 w-4 mr-2" />
                        {order.providerId?.phone}
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Rating</p>
                      <div className="flex items-center">
                        <span className="text-gray-900 font-medium">
                          {order.providerId?.rating?.average?.toFixed(1) || 'N/A'}
                        </span>
                        <span className="text-yellow-400 ml-1">⭐</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Information</h2>
              
              {/* Delivery Address */}
              <div className="mb-6">
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                  <div>
                    <p className="font-medium text-gray-900 mb-1">Delivery Address</p>
                    <div className="text-gray-600">
                      <p>{order.deliveryAddress?.street}</p>
                      <p>{order.deliveryAddress?.area}</p>
                      <p>{order.deliveryAddress?.city} - {order.deliveryAddress?.pincode}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Boy Information */}
              {order.assignedDeliveryBoy && (
                <div>
                  <div className="flex items-start space-x-3">
                    <Truck className="h-5 w-5 text-gray-400 mt-1" />
                    <div>
                      <p className="font-medium text-gray-900 mb-1">Delivery Person</p>
                      <div className="text-gray-600">
                        <p className="font-medium">{order.assignedDeliveryBoy.name}</p>
                        <div className="flex items-center mt-1">
                          <Phone className="h-4 w-4 mr-2" />
                          {order.assignedDeliveryBoy.phone}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Special Instructions */}
              {order.specialInstructions && (
                <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                  <p className="font-medium text-gray-900 mb-1">Special Instructions</p>
                  <p className="text-gray-600">{order.specialInstructions}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Status */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Status</h2>
              <div className="space-y-4">
                <div className="text-center">
                  <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                    order.status === 'delivered' ? 'bg-success-100' :
                    order.status === 'cancelled' ? 'bg-error-100' :
                    order.status === 'rejected' ? 'bg-error-100' :
                    'bg-warning-100'
                  }`}>
                    <Package className={`h-8 w-8 ${
                      order.status === 'delivered' ? 'text-success-600' :
                      order.status === 'cancelled' ? 'text-error-600' :
                      order.status === 'rejected' ? 'text-error-600' :
                      'text-warning-600'
                    }`} />
                  </div>
                  <div className="mt-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-4 border-t">
                  {['out_for_delivery', 'assigned'].includes(order.status) && (
                    <Link to={`/track-order/${order._id}`} className="btn-primary w-full text-center">
                      Track Order
                    </Link>
                  )}
                  
                  {order.status === 'delivered' && (
                    <button className="btn-outline w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download Invoice
                    </button>
                  )}

                  {order.status === 'pending' && (
                    <button className="btn-error w-full">
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Method</span>
                  <div className="flex items-center">
                    <CreditCard className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="font-medium capitalize">
                      {order.paymentMethod?.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status</span>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    order.paymentStatus === 'completed' ? 'bg-success-100 text-success-800' :
                    order.paymentStatus === 'pending' ? 'bg-warning-100 text-warning-800' :
                    'bg-error-100 text-error-800'
                  }`}>
                    {order.paymentStatus || 'Pending'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="font-medium text-gray-900">Total Paid</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {formatCurrency(order.items?.totalPrice)}
                  </span>
                </div>
                {/* Make Payment Button for online payments */}
                {order.paymentStatus !== 'paid' && order.paymentMethod !== 'cash_on_delivery' && (
                  <div className="mt-4">
                    <MakePaymentButton order={order} onSuccess={handlePaymentSuccess} />
                  </div>
                )}
              </div>
            </div>

            {/* Order Timeline */}
            {order.timeline && order.timeline.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Timeline</h2>
                <div className="space-y-3">
                  {order.timeline.map((event, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 capitalize">
                          {event.status?.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDateTime(event.timestamp)}
                        </p>
                        {event.notes && (
                          <p className="text-xs text-gray-600 mt-1">
                            {event.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;