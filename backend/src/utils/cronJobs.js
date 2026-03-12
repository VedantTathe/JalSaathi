const cron = require('node-cron');
const Order = require('../modules/order/model');

/**
 * Auto-fail orders with pending payment status after 1 minute
 * Runs every minute to check for expired pending orders
 */
const autoFailPendingOrders = cron.schedule('* * * * *', async () => {
  try {
    const oneMinuteAgo = new Date(Date.now() - 1 * 60 * 1000);
    
    // Find orders that are:
    // 1. Payment status is 'pending'
    // 2. Payment method is 'online' (COD orders are handled differently)
    // 3. Created more than 1 minute ago
    // 4. Order status is still 'pending' (not accepted yet)
    const expiredOrders = await Order.find({
      paymentStatus: 'pending',
      paymentMethod: 'online',
      status: 'pending',
      createdAt: { $lt: oneMinuteAgo }
    });

    if (expiredOrders.length > 0) {
      console.log(`[CronJob] Found ${expiredOrders.length} expired pending orders`);
      
      // Update all expired orders
      const updatePromises = expiredOrders.map(async (order) => {
        order.paymentStatus = 'failed';
        order.status = 'failed';
        order.paymentInfo = order.paymentInfo || {};
        order.paymentInfo.failedAt = new Date();
        order.paymentInfo.failedReason = 'Payment timeout - order not completed within 1 minute';
        
        await order.save();
        console.log(`[CronJob] Auto-failed order ${order._id} (created at ${order.createdAt})`);
      });
      
      await Promise.all(updatePromises);
      console.log(`[CronJob] Successfully auto-failed ${expiredOrders.length} orders`);
    }
  } catch (error) {
    console.error('[CronJob] Error in autoFailPendingOrders:', error);
  }
}, {
  scheduled: false // Don't start automatically, will be started manually
});

/**
 * Initialize all cron jobs
 */
const initializeCronJobs = () => {
  console.log('[CronJob] Initializing cron jobs...');
  
  // Start auto-fail pending orders job (1 minute timeout)
  autoFailPendingOrders.start();
  console.log('[CronJob] Auto-fail pending orders job started (1 minute timeout)');
};

/**
 * Stop all cron jobs (useful for graceful shutdown)
 */
const stopCronJobs = () => {
  console.log('[CronJob] Stopping cron jobs...');
  autoFailPendingOrders.stop();
  console.log('[CronJob] All cron jobs stopped');
};

module.exports = {
  initializeCronJobs,
  stopCronJobs,
  autoFailPendingOrders
};
