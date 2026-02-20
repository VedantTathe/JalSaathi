# Login with OTP (Passwordless Login)

## Overview
Added a **passwordless login** feature that allows users to log in using an OTP sent to their email instead of entering a password. This provides an alternative, secure login method that's convenient for users who may have forgotten their password or prefer passwordless authentication.

## How It Works

### Login with OTP Flow

1. **User Enters Email**
   - User provides their registered email address
   - System verifies the account exists and is active

2. **OTP Generation & Email**
   - 6-digit OTP is generated (valid for 10 minutes)
   - OTP is sent to the user's email
   - OTP is securely stored with expiry time

3. **User Enters OTP**
   - User receives email and enters the OTP
   - System verifies the OTP
   - Upon successful verification:
     - OTP is cleared from database
     - JWT token is returned
     - User is logged in

## API Endpoints

### 1. Send Login OTP
**POST** `/api/auth/login/send-otp`

Sends an OTP to the user's email for passwordless login.

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
  "message": "Login OTP sent to your email",
  "data": {
    "email": "john@example.com"
  }
}
```

**Response (Error - User Not Found):**
```json
{
  "success": false,
  "message": "No account found with this email"
}
```

**Response (Error - Email Not Verified):**
```json
{
  "success": false,
  "message": "Please verify your email first"
}
```

**Response (Error - Account Deactivated):**
```json
{
  "success": false,
  "message": "Account is deactivated"
}
```

---

### 2. Verify Login OTP
**POST** `/api/auth/login/verify-otp`

Verifies the OTP and logs the user in.

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Login successful",
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

**Response (Error - Account Deactivated):**
```json
{
  "success": false,
  "message": "Account is deactivated"
}
```

---

## Login Options Available

Users now have **two ways** to log in:

### Option 1: Traditional Login (with password)
**POST** `/api/auth/login`
```json
{
  "identifier": "john@example.com",  // or phone number
  "password": "securePassword123"
}
```

### Option 2: Login with OTP (passwordless)
**POST** `/api/auth/login/send-otp` → **POST** `/api/auth/login/verify-otp`
```json
// Step 1
{
  "email": "john@example.com"
}

// Step 2
{
  "email": "john@example.com",
  "otp": "123456"
}
```

---

## Email Template

### Login OTP Email
- **Subject:** JalSaathi - Login OTP
- **Content:** Professionally formatted HTML email with:
  - 6-digit OTP prominently displayed
  - 10-minute validity notice
  - Security warning (if user didn't request it)
  - JalSaathi branding

**Email Preview:**
```
Hello John Doe,

You requested to log in to your JalSaathi account using OTP. 
Use the code below to complete your login:

┌─────────────┐
│   123456    │
└─────────────┘

This OTP is valid for 10 minutes.

⚠️ Security Notice: If you didn't request this login OTP, 
please ignore this email and ensure your account is secure.

Best regards,
JalSaathi Team
```

---

## Security Features

1. **OTP Expiry**: OTPs are valid for only 10 minutes
2. **One-time Use**: OTPs are deleted after successful verification
3. **Account Validation**: 
   - Checks if account exists
   - Checks if account is active
   - Checks if email is verified (for customers/providers)
4. **Rate Limiting**: Consider adding rate limiting to prevent OTP spam
5. **Security Warning**: Email includes warning if user didn't request OTP

---

## Frontend Integration Guide

### Login Page Implementation

```javascript
import { useState } from 'react';

function LoginPage() {
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Traditional password login
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          identifier: email, 
          password 
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        window.location.href = '/dashboard';
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Send OTP for passwordless login
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/login/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setOtpSent(true);
        alert('OTP sent to your email. Please check your inbox.');
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      alert('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP and login
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/login/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      
      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('token', data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        window.location.href = '/dashboard';
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      alert('OTP verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h2>Login to JalSaathi</h2>
      
      {/* Login Method Toggle */}
      <div className="login-method-toggle">
        <button 
          onClick={() => setLoginMethod('password')}
          className={loginMethod === 'password' ? 'active' : ''}
        >
          Login with Password
        </button>
        <button 
          onClick={() => setLoginMethod('otp')}
          className={loginMethod === 'otp' ? 'active' : ''}
        >
          Login with OTP
        </button>
      </div>

      {/* Password Login Form */}
      {loginMethod === 'password' && (
        <form onSubmit={handlePasswordLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
          <a href="/forgot-password" className="forgot-password-link">
            Forgot Password?
          </a>
        </form>
      )}

      {/* OTP Login Form */}
      {loginMethod === 'otp' && (
        <>
          {!otpSent ? (
            <form onSubmit={handleSendOTP}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <input
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Login'}
              </button>
              <button 
                type="button" 
                onClick={handleSendOTP}
                className="resend-otp-btn"
              >
                Resend OTP
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

export default LoginPage;
```

### Simple Implementation (Minimal UI)

```javascript
// Step 1: Show login method choice
<div>
  <button onClick={() => handleLoginMethod('password')}>
    Login with Password
  </button>
  <button onClick={() => handleLoginMethod('otp')}>
    Login with OTP
  </button>
</div>

// Step 2: For OTP login, collect email
<form onSubmit={sendOTP}>
  <input 
    type="email" 
    value={email} 
    onChange={(e) => setEmail(e.target.value)} 
    placeholder="Enter your email"
  />
  <button type="submit">Send OTP</button>
</form>

// Step 3: After OTP sent, collect OTP
<form onSubmit={verifyOTP}>
  <input 
    type="text" 
    value={otp} 
    onChange={(e) => setOtp(e.target.value)} 
    placeholder="Enter 6-digit OTP"
    maxLength="6"
  />
  <button type="submit">Verify & Login</button>
  <button type="button" onClick={resendOTP}>Resend OTP</button>
</form>
```

---

## Testing Guide

### 1. Test Login with OTP Flow

```bash
# Step 1: Send OTP to email
curl -X POST http://localhost:5000/api/auth/login/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'

# Expected Response:
# {
#   "success": true,
#   "message": "Login OTP sent to your email",
#   "data": { "email": "test@example.com" }
# }

# Step 2: Check email for OTP (e.g., 123456)

# Step 3: Verify OTP and login
curl -X POST http://localhost:5000/api/auth/login/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456"
  }'

# Expected Response:
# {
#   "success": true,
#   "message": "Login successful",
#   "data": {
#     "token": "eyJhbGci...",
#     "user": { ... }
#   }
# }
```

### 2. Test Error Cases

```bash
# Test with non-existent email
curl -X POST http://localhost:5000/api/auth/login/send-otp \
  -H "Content-Type: application/json" \
  -d '{ "email": "nonexistent@example.com" }'

# Test with invalid OTP
curl -X POST http://localhost:5000/api/auth/login/verify-otp \
  -H "Content-Type: application/json" \
  -d '{ "email": "test@example.com", "otp": "000000" }'

# Test with expired OTP (wait 11 minutes after sending OTP)
curl -X POST http://localhost:5000/api/auth/login/verify-otp \
  -H "Content-Type: application/json" \
  -d '{ "email": "test@example.com", "otp": "123456" }'
```

---

## Use Cases

### When to Use Login with OTP

1. **Forgot Password**: Instead of password reset flow
2. **Quick Access**: For users who prefer not to remember passwords
3. **Shared Devices**: More secure on public/shared computers
4. **Mobile-First**: Better UX for mobile users
5. **Enhanced Security**: Additional security layer

### When to Use Traditional Login

1. **Quick Login**: For users who remember their password
2. **Offline Scenarios**: When email access is limited
3. **Preference**: Users who prefer password-based auth

---

## Comparison: Login Methods

| Feature | Password Login | OTP Login |
|---------|---------------|-----------|
| Speed | Fast (if password remembered) | Slower (wait for email) |
| Convenience | High (if password saved) | Medium |
| Security | Password-dependent | High (time-limited OTP) |
| Email Required | Not during login | Yes |
| Best For | Regular users | Occasional users, forgot password |

---

## Troubleshooting

### OTP Email Not Received
1. Check spam/junk folder
2. Verify email address is correct
3. Check EMAIL_* environment variables
4. Check console logs for email errors

### OTP Expired
- OTPs expire after 10 minutes
- Request a new OTP using the same endpoint again

### Invalid OTP Error
- Ensure OTP is entered correctly (6 digits)
- Check if OTP has expired
- Request a new OTP

### Account Issues
- **"No account found"**: User needs to register first
- **"Email not verified"**: Complete email verification first
- **"Account deactivated"**: Contact support

---

## Best Practices

1. **Rate Limiting**: Implement rate limiting on OTP endpoints
   - Limit: 3 OTP requests per 15 minutes per email
   - Prevents abuse and spam

2. **OTP Resend Logic**: Allow resending OTP but:
   - Invalidate previous OTP
   - Generate new OTP
   - Show cooldown timer (e.g., "Resend available in 60s")

3. **User Feedback**: 
   - Show clear messages about OTP status
   - Display timer for OTP validity
   - Provide option to switch back to password login

4. **Email Deliverability**:
   - Use dedicated email service in production
   - Monitor email delivery rates
   - Handle email failures gracefully

5. **Security Monitoring**:
   - Log failed OTP attempts
   - Detect suspicious patterns
   - Implement account lockout after multiple failures

---

## Future Enhancements

- [ ] SMS OTP as alternative to email
- [ ] Biometric authentication integration
- [ ] Remember device feature
- [ ] Social login integration
- [ ] Multi-factor authentication (MFA)
- [ ] Account recovery options

---

## Notes

- **Backward Compatible**: Traditional password login still works
- **No Database Changes**: Reuses existing OTP fields from registration
- **Production Ready**: Includes error handling and security measures
- **User Choice**: Users can choose their preferred login method
- **Flexible**: Can be used as standalone or alongside password login

