# 💳 Razorpay Payment Testing Guide

## Current Configuration

Your Razorpay credentials are configured in `.env`:
- **Key ID**: `rzp_test_SGVJvHdNPGZTFD`
- **Key Secret**: `D8iKuGXrdZWi5qPmeDLqIfF1`
- **Mode**: Test Mode

## Recent Fixes Applied

### Backend Improvements ✅
1. **Enhanced error logging** - All payment operations now log detailed errors
2. **Better response handling** - Clear error messages returned to frontend
3. **Payment status checks** - Prevents duplicate payments
4. **Signature storage** - Saves payment signature for audit
5. **Populated responses** - Returns complete order data after verification

### Frontend Improvements ✅
1. **Better error messages** - User-friendly error descriptions
2. **Response format handling** - Handles axios interceptor response formats
3. **Payment failure callback** - Listens to Razorpay payment.failed event
4. **Console logging** - Debug logs for troubleshooting
5. **Modal dismiss handling** - Better UX when user cancels payment

## Testing Steps

### 1. Start the Backend
```powershell
cd "C:\Users\Sahil Patil\Desktop\Jalsathi\JalSaathi\backend"
npm start
```

### 2. Start the Frontend
```powershell
cd "C:\Users\Sahil Patil\Desktop\Jalsathi\JalSaathi\frontend"
npm start
```

### 3. Place a Test Order

1. **Login as Customer**
2. **Select a Provider** (make sure provider is online)
3. **Place Order** with payment method: **Online Payment**
4. **Razorpay Checkout** should open automatically

### 4. Use Razorpay Test Cards

#### ✅ Successful Payment
- **Card Number**: `4111 1111 1111 1111`
- **CVV**: Any 3 digits (e.g., `123`)
- **Expiry**: Any future date (e.g., `12/25`)
- **Name**: Any name

#### ❌ Failed Payment (to test error handling)
- **Card Number**: `4000 0000 0000 0002`
- **CVV**: `123`
- **Expiry**: `12/25`

#### 🔄 Other Test Scenarios
- **UPI**: Use `success@razorpay` or `failure@razorpay`
- **Netbanking**: Select any test bank
- **Wallet**: Use test credentials from Razorpay dashboard

## Common Issues & Solutions

### Issue 1: "Payment gateway not configured"
**Solution**: 
- Check if `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are in `.env`
- Restart backend server after modifying `.env`

### Issue 2: "Failed to load Razorpay SDK"
**Solution**: 
- Check internet connection
- Open browser console (F12) to see network errors
- Clear browser cache

### Issue 3: Payment successful but verification failed
**Solution**: 
- Check backend logs for signature mismatch
- Ensure `RAZORPAY_KEY_SECRET` is correct
- Check if order exists in database

### Issue 4: Razorpay modal doesn't open
**Solution**: 
- Open browser console (F12) and check for errors
- Ensure Razorpay script loaded successfully
- Check if order amount is valid (greater than 0)

## Checking Payment Status

### In Browser Console
After payment, check the console logs:
```
Creating payment for order: 65abc123...
Payment creation response: {...}
Loading Razorpay SDK...
Razorpay SDK loaded successfully
Opening Razorpay checkout...
Payment successful, verifying...
Payment verified: {...}
```

### In Backend Logs
```
Creating Razorpay order for: 65abc123... Amount: 2000
Razorpay order created successfully: order_xyz123
Payment verified successfully for order: 65abc123...
```

### In Database
Check order document:
```javascript
{
  paymentStatus: "paid",
  paymentMethod: "online",
  paymentInfo: {
    provider: "razorpay",
    paymentId: "pay_xyz123",
    orderId: "order_xyz123",
    signature: "abc123...",
    verifiedAt: "2026-02-15T10:30:00.000Z"
  }
}
```

## Debugging Tips

1. **Open Browser DevTools** (F12)
   - Check Console tab for JavaScript errors
   - Check Network tab for API request/response

2. **Backend Terminal**
   - Look for error messages
   - Check if Razorpay API responded

3. **Test with smaller amount first**
   - Order 1 can instead of multiple
   - Easier to debug

4. **Verify credentials**
   ```powershell
   # In backend directory
   node -e "require('dotenv').config({path:'.env'}); console.log('Key:', process.env.RAZORPAY_KEY_ID, 'Secret:', process.env.RAZORPAY_KEY_SECRET ? 'SET' : 'MISSING')"
   ```

## Production Checklist

Before going live:
1. ✅ Replace test keys with live Razorpay keys
2. ✅ Set `RAZORPAY_WEBHOOK_SECRET` in production
3. ✅ Configure webhook URL in Razorpay dashboard
4. ✅ Test with real bank accounts (small amounts)
5. ✅ Enable HTTPS (required for production)
6. ✅ Set proper CORS origins
7. ✅ Add rate limiting for payment endpoints
8. ✅ Monitor payment logs

## Support

If issues persist after following this guide:
1. Check Razorpay dashboard for payment status
2. Verify API logs in Razorpay dashboard
3. Contact Razorpay support with payment ID
4. Check order status in your MongoDB database

## Additional Resources

- [Razorpay Test Cards](https://razorpay.com/docs/payments/payments/test-card-details/)
- [Razorpay Integration Guide](https://razorpay.com/docs/payments/payment-gateway/web-integration/)
- [Razorpay Webhooks](https://razorpay.com/docs/webhooks/)
