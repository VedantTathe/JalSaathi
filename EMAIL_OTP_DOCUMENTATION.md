# Email OTP Verification for Registration

## Overview
Email OTP verification has been added to the registration process for both **customers** and **providers** to ensure email authenticity before account activation.

## How It Works

### Registration Flow

1. **Send Registration Data & Receive OTP**
   - User submits registration information
   - System creates a temporary inactive user account
   - 6-digit OTP is generated (valid for 10 minutes)
   - OTP is sent to the provided email address

2. **Verify OTP**
   - User enters the OTP received via email
   - System verifies the OTP
   - Upon successful verification:
     - Email is marked as verified
     - Account is activated
     - Provider profile is created (for providers)
     - Welcome email is sent
     - JWT token is returned for immediate login

3. **Login Protection**
   - Users with unverified emails cannot log in
   - Error message prompts them to verify their email

## API Endpoints

### 1. Send Registration OTP
**POST** `/api/auth/send-otp`

Initiates registration and sends OTP to the provided email.

**Request Body (Customer):**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "phone": "9876543210",
  "role": "customer",
  "address": {
    "street": "123 Main St",
    "area": "Downtown",
    "city": "Mumbai",
    "pincode": "400001",
    "coordinates": {
      "latitude": 19.0760,
      "longitude": 72.8777
    }
  }
}
```

**Request Body (Provider):**
```json
{
  "name": "Water Supply Co",
  "email": "provider@example.com",
  "password": "securePassword123",
  "phone": "9876543210",
  "role": "provider",
  "address": {
    "street": "456 Business St",
    "area": "Commercial Area",
    "city": "Mumbai",
    "pincode": "400002",
    "coordinates": {
      "latitude": 19.0760,
      "longitude": 72.8777
    }
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Verification OTP sent to your email",
  "data": {
    "email": "john@example.com"
  }
}
```

**Response (Error - User Already Exists):**
```json
{
  "success": false,
  "message": "User already exists with this email"
}
```

---

### 2. Verify OTP and Complete Registration
**POST** `/api/auth/verify-otp`

Verifies the OTP and completes the registration process.

**Request Body (Customer):**
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

**Request Body (Provider - with additional provider details):**
```json
{
  "email": "provider@example.com",
  "otp": "123456",
  "registrationData": {
    "businessName": "Aqua Fresh Suppliers",
    "pricePerCan": 25,
    "serviceRadius": 10,
    "minimumOrder": 2,
    "operatingHours": {
      "open": "08:00",
      "close": "20:00"
    },
    "description": "Quality water supply service",
    "coordinates": {
      "latitude": 19.0760,
      "longitude": 72.8777
    },
    "bankDetails": {
      "accountHolder": "Water Supply Co",
      "bankName": "HDFC Bank",
      "accountNumber": "1234567890",
      "ifsc": "HDFC0001234"
    },
    "upiId": "watersupply@upi",
    "upiNumber": "9876543210"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Email verified successfully. Registration complete!",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "60d5ec49f1b2c72b8c8e4f1a",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "customer",
      "phone": "9876543210"
    }
  }
}
```

**Response (Error - Invalid OTP):**
```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

---

### 3. Resend OTP
**POST** `/api/auth/resend-otp`

Resends a new OTP to the user's email if the previous one expired or was not received.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "New OTP sent to your email"
}
```

**Response (Error - Email Already Verified):**
```json
{
  "success": false,
  "message": "Email already verified"
}
```

---

### 4. Login (Updated)
**POST** `/api/auth/login`

Users must have verified their email before they can log in.

**Request Body:**
```json
{
  "identifier": "john@example.com",
  "password": "securePassword123"
}
```

**Response (Error - Unverified Email):**
```json
{
  "success": false,
  "message": "Please verify your email before logging in"
}
```

---

## Email Templates

### OTP Verification Email
- **Subject:** JalSaathi - Email Verification OTP
- **Content:** Nicely formatted HTML email with:
  - 6-digit OTP displayed prominently
  - 10-minute validity notice
  - JalSaathi branding

### Welcome Email
- **Subject:** Welcome to JalSaathi!
- **Content:** Sent after successful verification with:
  - Welcome message
  - Role-specific information
  - Login button/link
  - Support contact information

---

## Database Changes

### User Model Updates
New fields added to the User schema:

```javascript
{
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationOTP: {
    type: String,
    select: false  // Not included in queries by default
  },
  otpExpiry: {
    type: Date,
    select: false  // Not included in queries by default
  }
}
```

### Instance Methods Added
- `generateOTP()` - Generates a 6-digit OTP and sets expiry time
- `verifyOTP(enteredOTP)` - Validates the OTP and checks expiry

---

## Frontend Integration Guide

### Step 1: Registration Form Submission
```javascript
const handleRegister = async (formData) => {
  try {
    const response = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Show OTP input screen
      setShowOTPScreen(true);
      setEmail(formData.email);
    } else {
      // Show error message
      alert(data.message);
    }
  } catch (error) {
    console.error('Registration error:', error);
  }
};
```

### Step 2: OTP Verification
```javascript
const handleVerifyOTP = async (otp) => {
  try {
    const payload = {
      email: email,
      otp: otp,
      // Include registrationData for providers
      ...(role === 'provider' && { registrationData: providerData })
    };
    
    const response = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Store token and redirect to dashboard
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      navigate('/dashboard');
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error('OTP verification error:', error);
  }
};
```

### Step 3: Resend OTP (Optional)
```javascript
const handleResendOTP = async () => {
  try {
    const response = await fetch('/api/auth/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    alert(data.message);
  } catch (error) {
    console.error('Resend OTP error:', error);
  }
};
```

---

## Security Features

1. **OTP Expiry**: OTPs are valid for only 10 minutes
2. **One-time Use**: OTPs are deleted after successful verification
3. **Password Hashing**: Passwords are hashed before storage
4. **Email Validation**: Email format is validated before sending OTP
5. **Rate Limiting**: Consider adding rate limiting to prevent OTP spam
6. **Inactive Accounts**: Unverified accounts remain inactive until email verification

---

## Environment Variables Required

Make sure these are set in your `.env` file:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=JalSaathi <your-email@gmail.com>
FRONTEND_URL=http://localhost:5173
```

---

## Testing Guide

### 1. Test Customer Registration
```bash
# Step 1: Send OTP
curl -X POST http://localhost:5000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123",
    "phone": "9876543210",
    "role": "customer"
  }'

# Step 2: Check email for OTP

# Step 3: Verify OTP
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456"
  }'
```

### 2. Test Provider Registration
```bash
# Step 1: Send OTP (same as customer)

# Step 2: Verify OTP with provider data
curl -X POST http://localhost:5000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "provider@example.com",
    "otp": "123456",
    "registrationData": {
      "businessName": "Test Water Supply",
      "pricePerCan": 25
    }
  }'
```

### 3. Test Resend OTP
```bash
curl -X POST http://localhost:5000/api/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'
```

---

## Troubleshooting

### OTP Email Not Received
1. Check spam/junk folder
2. Verify EMAIL_* environment variables are correct
3. Check console logs for email sending errors
4. For Gmail, ensure "App Passwords" are used, not regular password

### OTP Expired
- OTPs expire after 10 minutes
- Use the resend-otp endpoint to get a new OTP

### Email Already Verified Error
- User has already completed verification
- Direct them to login page

### Invalid Credentials on Login
- Ensure password is correct
- Check if email is verified (`isEmailVerified: true`)

---

## Notes

- **Backward Compatibility**: Old `/api/auth/register` endpoint still works but doesn't require email verification (deprecated)
- **For Delivery Role**: Email verification is optional for delivery partners as email is not required for them
- **Production**: Consider implementing rate limiting on OTP endpoints to prevent abuse
- **Email Service**: Uses nodemailer with Gmail SMTP. Consider using dedicated email services like SendGrid or AWS SES for production

