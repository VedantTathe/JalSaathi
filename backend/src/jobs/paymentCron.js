const paymentService = require('../services/paymentService');

let intervalId = null;

function startPaymentCron(intervalMinutes = 5) {
  // Run immediately, then every interval
  const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;

  async function run() {
    try {
      const result = await paymentService.runCronCheck();
      if (result && result.updated) {
        console.log(`[paymentCron] checked ${result.checked}, updated ${result.updated}`);
      }
    } catch (err) {
      console.error('[paymentCron] error:', err);
    }
  }

  run();
  intervalId = setInterval(run, intervalMs);
}

function stopPaymentCron() {
  if (intervalId) clearInterval(intervalId);
}

module.exports = { startPaymentCron, stopPaymentCron };
