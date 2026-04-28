# Backend Deployment Guide

## Deploy Backend to Vercel

### Step 1: Create New Vercel Project for Backend
1. Go to **vercel.com/new**
2. Import the same `JalSaathi` GitHub repository
3. In "Root Directory", select `backend`
4. Click "Deploy"

### Step 2: Add Environment Variables to Backend Vercel Project
In Vercel → Project Settings → Environment Variables, add:
- `MONGODB_URI` = your MongoDB connection string
- `JWT_SECRET` = your JWT secret key
- `CASHFREE_APP_ID` = your Cashfree app ID
- `CASHFREE_SECRET_KEY` = your Cashfree secret key
- `EMAIL_USER` = your email for OTP sending
- `EMAIL_PASS` = your email app password
- All other vars from your `.env` file (except `FRONTEND_URL`)
- `NODE_ENV` = `production`

### Step 3: Redeploy Backend
After adding env vars, trigger a redeploy in Vercel.

### Step 4: Copy Backend URL
Once deployed, Vercel shows your backend URL (e.g., `https://jalsaathi-backend-xxx.vercel.app`)

### Step 5: Update Frontend with Backend API URL
1. Go to **Frontend Vercel Project** → Settings → Environment Variables
2. Add: `VITE_APP_API_BASE_URL` = `https://your-backend-url/api`
3. Trigger a redeploy of frontend

### Step 6: Test OTP Generation
- Go to https://your-frontend-url/login
- Enter email and click "Send OTP"
- Check your email for the OTP

## Current Status
✅ Frontend: Deployed to Vercel
⏳ Backend: Ready to deploy (vercel.json configured)
⏳ API Connection: Waiting for backend URL

## Troubleshooting

If OTP still fails after backend deployment:
1. Check browser console for API errors
2. Check backend Vercel logs for server errors
3. Verify MONGODB_URI env var is set in backend Vercel project
4. Verify EMAIL credentials are correct
5. Check that VITE_APP_API_BASE_URL is correctly set in frontend
