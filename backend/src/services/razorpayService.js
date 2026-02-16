const axios = require('axios');
const Provider = require('../modules/provider/model');

const RAZORPAY_BASE = 'https://api.razorpay.com/v1';

// Get auth lazily to ensure env vars are loaded
function getRazorAuth() {
  return {
    username: process.env.RAZORPAY_KEY_ID || '',
    password: process.env.RAZORPAY_KEY_SECRET || ''
  };
}

/**
 * Create a Razorpay Linked Account (Route) for a provider
 * This allows automatic fund transfers to the provider's bank when payments are captured
 * 
 * Docs: https://razorpay.com/docs/route/api-reference/#create-an-account
 */
async function createLinkedAccount(providerId) {
  try {
    const provider = await Provider.findById(providerId).populate('userId', 'email phone name');
    if (!provider) {
      throw new Error('Provider not found');
    }

    if (!provider.bankDetails || !provider.bankDetails.accountNumber || !provider.bankDetails.ifscCode) {
      throw new Error('Provider bank details are incomplete');
    }

    // Check if linked account already exists
    if (provider.razorpayLinkedAccount && provider.razorpayLinkedAccount.accountId) {
      console.log('RazorpayService: Linked account already exists for provider', providerId);
      return provider.razorpayLinkedAccount.accountId;
    }

    const user = provider.userId;
    const bank = provider.bankDetails;

    // Create linked account via Razorpay API
    const payload = {
      email: user.email,
      phone: user.phone,
      type: 'route',
      legal_business_name: provider.businessName,
      business_type: 'individual', // or 'proprietorship', 'partnership', etc.
      contact_name: bank.accountHolderName || user.name,
      profile: {
        category: 'services',
        subcategory: 'water_supply',
        addresses: {
          registered: {
            street1: provider.area || 'N/A',
            city: 'City',
            state: 'State',
            postal_code: '000000',
            country: 'IN'
          }
        }
      },
      legal_info: {
        pan: 'XXXXX0000X', // Placeholder - should be collected from provider
        gst: null
      },
      // Bank account for settlements
      bank_account: {
        ifsc_code: bank.ifscCode,
        beneficiary_name: bank.accountHolderName,
        account_type: bank.accountType || 'savings',
        account_number: bank.accountNumber
      }
    };

    console.log('RazorpayService: Creating linked account for provider', providerId);
    
    const response = await axios.post(`${RAZORPAY_BASE}/accounts`, payload, { 
      auth: getRazorAuth(),
      timeout: 30000
    });

    const account = response.data;
    console.log('RazorpayService: Linked account created', account.id);

    // Update provider with linked account info
    provider.razorpayLinkedAccount = {
      accountId: account.id,
      status: 'active',
      createdAt: new Date()
    };
    provider.bankDetails.verified = true;
    await provider.save();

    return account.id;
  } catch (err) {
    console.error('RazorpayService: createLinkedAccount error', err.response?.data || err.message);
    throw err;
  }
}

/**
 * Create a Route Transfer to send money to provider's linked account
 * Called after payment is captured
 * 
 * Docs: https://razorpay.com/docs/route/api-reference/#create-a-transfer
 */
async function createRouteTransfer(paymentId, providerId, amount, orderId) {
  try {
    const provider = await Provider.findById(providerId);
    if (!provider) {
      throw new Error('Provider not found');
    }

    const linkedAccountId = provider.razorpayLinkedAccount?.accountId;
    if (!linkedAccountId) {
      console.warn('RazorpayService: Provider has no linked account, skipping transfer', providerId);
      return null;
    }

    // Calculate platform commission (1% of order amount)
    const platformCommissionPercent = 1;
    const commission = Math.round(amount * (platformCommissionPercent / 100));
    const providerAmount = amount - commission;

    if (providerAmount <= 0) {
      console.warn('RazorpayService: Provider amount is 0 or negative after commission', { amount, commission });
      return null;
    }

    // Razorpay amounts are in paise
    const transferPayload = {
      transfers: [
        {
          account: linkedAccountId,
          amount: providerAmount * 100, // Convert to paise
          currency: 'INR',
          notes: {
            order_id: orderId?.toString() || '',
            provider_id: providerId.toString(),
            type: 'order_payment'
          },
          on_hold: 0 // Set to 1 if you want to hold funds until delivery confirmed
        }
      ]
    };

    console.log('RazorpayService: Creating transfer for payment', paymentId, 'to provider', providerId, 'amount', providerAmount);

    const response = await axios.post(`${RAZORPAY_BASE}/payments/${paymentId}/transfers`, transferPayload, {
      auth: getRazorAuth(),
      timeout: 30000
    });

    console.log('RazorpayService: Transfer created', response.data);
    return response.data;
  } catch (err) {
    console.error('RazorpayService: createRouteTransfer error', err.response?.data || err.message);
    // Don't throw - we don't want to fail the payment flow if transfer fails
    // The platform can manually reconcile later
    return null;
  }
}

/**
 * Fetch linked account details from Razorpay
 */
async function getLinkedAccount(accountId) {
  try {
    const response = await axios.get(`${RAZORPAY_BASE}/accounts/${accountId}`, {
      auth: getRazorAuth(),
      timeout: 20000
    });
    return response.data;
  } catch (err) {
    console.error('RazorpayService: getLinkedAccount error', err.response?.data || err.message);
    throw err;
  }
}

/**
 * Trigger a refund and reverse the transfer
 */
async function reverseTransfer(transferId, amount) {
  try {
    const response = await axios.post(`${RAZORPAY_BASE}/transfers/${transferId}/reversals`, {
      amount: amount ? amount * 100 : undefined // Full reversal if no amount specified
    }, {
      auth: getRazorAuth(),
      timeout: 20000
    });
    console.log('RazorpayService: Transfer reversed', response.data);
    return response.data;
  } catch (err) {
    console.error('RazorpayService: reverseTransfer error', err.response?.data || err.message);
    throw err;
  }
}

module.exports = {
  createLinkedAccount,
  createRouteTransfer,
  getLinkedAccount,
  reverseTransfer
};
