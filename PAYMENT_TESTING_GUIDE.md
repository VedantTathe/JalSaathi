# 💳 Cashfree Payment Testing Guide

## Current Configuration

Your Cashfree credentials are configured in `.env`:
- **App ID**: set `CASHFREE_APP_ID` in `.env`
- **Secret Key**: set `CASHFREE_SECRET_KEY` in `.env`
- **Mode**: Test Mode (use test credentials)

## Recent Fixes Applied

- Backend: improved order/payment handling, logging and signature verification
- Frontend: unified response handling and Cashfree checkout integration

## Testing Steps

1. Start the Backend

```powershell
cd backend
npm start
```

2. Start the Frontend

```powershell
cd frontend
npm start
```

3. Place a Test Order

1. Login as Customer
2. Select a Provider (make sure provider is online)
3. Place Order with payment method: Online Payment
4. Cashfree Checkout should open automatically (or open the returned checkout link)

4. Test Cards / Flows

- Use Cashfree test flow as documented by Cashfree (UPI, cards, wallets may vary by provider)

## Common Issues & Solutions

1. "Payment gateway not configured"
- Check if `CASHFREE_APP_ID` and `CASHFREE_SECRET_KEY` are set in `.env`
- Restart backend after modifying `.env`

2. "Failed to load Cashfree SDK"
- Check internet connection and browser console (F12)

3. Payment successful but verification failed
- Check backend logs for signature mismatch
- Ensure `CASHFREE_SECRET_KEY` is correct

## Checking Payment Status

In browser console you should see logs like:

```
Creating payment for order: <orderId>
Payment creation response: {...}
Loading Cashfree SDK...
Cashfree SDK loaded successfully
Opening Cashfree checkout...
Payment successful, verifying...
Payment verified: {...}
```

Backend logs will show order creation and verification steps.

## Verify credentials

```powershell
node -e "require('dotenv').config({path:'.env'}); console.log('AppID:', process.env.CASHFREE_APP_ID, 'Secret:', process.env.CASHFREE_SECRET_KEY ? 'SET' : 'MISSING')"
```

## Production Checklist

1. Replace test keys with live Cashfree keys
2. Set `CASHFREE_SECRET_KEY` in production
3. Configure webhook URL in Cashfree dashboard
4. Enable HTTPS and proper CORS

## Additional Resources

- https://docs.cashfree.com/docs/
