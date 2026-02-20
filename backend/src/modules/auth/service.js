const User = require('../user/model');
const Provider = require('../provider/model');
const { generateTokenResponse, formatResponse } = require('../../utils/helpers');
const { sendOTPEmail, sendLoginOTPEmail, sendWelcomeEmail, sendPasswordResetOTPEmail } = require('../../utils/mailer');

class AuthService {
  // Send OTP for email verification during registration
  static async sendRegistrationOTP(userData) {
    console.log('🔐 sendRegistrationOTP called with:', { 
      email: userData.email, 
      name: userData.name, 
      role: userData.role 
    });
    
    try {
      const { 
        role, 
        email, 
        name
      } = userData;
      
      // Validate required fields
      if (!email || !name || !role) {
        console.log('❌ Validation failed: missing required fields');
        return formatResponse(false, 'Email, name, and role are required', null, 400);
      }
      
      console.log('✅ Validation passed');
      
      // Check if user already exists and is verified
      console.log('🔍 Checking if user exists...');
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser.isEmailVerified) {
        console.log('❌ User already exists and is verified');
        return formatResponse(false, 'User already exists with this email', null, 400);
      }
      
      // If user exists but not verified, delete the old record
      if (existingUser && !existingUser.isEmailVerified) {
        console.log('🗑️  Deleting unverified user record');
        await User.findByIdAndDelete(existingUser._id);
      }
      
      console.log('📝 Creating temporary user...');
      // Create temporary user with OTP (not verified yet)
      const tempUser = new User({
        name,
        email,
        password: userData.password,
        role,
        phone: userData.phone,
        address: userData.address,
        isEmailVerified: false,
        isActive: false // Keep inactive until verified
      });
      
      // Generate OTP
      console.log('🔢 Generating OTP...');
      const otp = tempUser.generateOTP();
      console.log(`   OTP generated: ${otp}`);
      
      // Save temporary user
      console.log('💾 Saving user to database...');
      await tempUser.save();
      console.log('✅ User saved successfully');
      
      // Send OTP email
      console.log('📧 Calling sendOTPEmail...');
      const emailResult = await sendOTPEmail(email, otp, name);
      console.log('📧 Email result:', emailResult);
      
      if (!emailResult.success) {
        console.error('❌ Email sending failed, cleaning up user record');
        // If email fails, delete the temp user
        await User.findByIdAndDelete(tempUser._id);
        return formatResponse(false, 'Failed to send verification email. Please try again.', null, 500);
      }
      
      console.log('✅ Registration OTP process completed successfully');
      return formatResponse(true, 'Verification OTP sent to your email', { email }, 200);
      
    } catch (error) {
      console.error('❌ Send OTP error:', error);
      return formatResponse(false, 'Failed to send OTP', null, 500);
    }
  }
  
  // Verify OTP and complete registration
  static async verifyEmailAndRegister(email, otp, registrationData) {
    try {
      // Find user with email and get OTP fields
      const user = await User.findOne({ email })
        .select('+emailVerificationOTP +otpExpiry');
      
      if (!user) {
        return formatResponse(false, 'User not found. Please register again.', null, 404);
      }
      
      if (user.isEmailVerified) {
        return formatResponse(false, 'Email already verified. Please login.', null, 400);
      }
      
      // Verify OTP
      if (!user.verifyOTP(otp)) {
        return formatResponse(false, 'Invalid or expired OTP', null, 400);
      }
      
      // Mark email as verified and activate user
      user.isEmailVerified = true;
      user.isActive = true;
      user.emailVerificationOTP = undefined;
      user.otpExpiry = undefined;
      
      await user.save();
      
      // If registering as provider, create provider profile
      if (user.role === 'provider' && registrationData) {
        const {
          businessName,
          pricePerCan,
          serviceRadius,
          minimumOrder,
          operatingHours,
          description,
          bankDetails,
          upiId,
          upiNumber,
          coordinates
        } = registrationData;
        
        const providerData = {
          userId: user._id,
          businessName,
          area: user.address?.area || '',
          pricePerCan,
          serviceRadius: serviceRadius || 5,
          minimumOrder: minimumOrder || 1,
          coordinates: coordinates || { latitude: 0, longitude: 0 },
          operatingHours: operatingHours || { open: '08:00', close: '20:00' },
          description: description || ''
        };
        
        // Add payment details if provided
        if (bankDetails && (bankDetails.accountHolder || bankDetails.bankName || bankDetails.accountNumber || bankDetails.ifsc)) {
          providerData.bankDetails = bankDetails;
        }
        if (upiId) {
          providerData.upiId = upiId;
        }
        if (upiNumber) {
          providerData.upiNumber = upiNumber;
        }
        
        await Provider.create(providerData);
      }
      
      // Send welcome email
      await sendWelcomeEmail(email, user.name, user.role);
      
      return formatResponse(true, 'Email verified successfully. Registration complete!', generateTokenResponse(user), 201);
      
    } catch (error) {
      console.error('Verify email error:', error);
      return formatResponse(false, 'Email verification failed', null, 500);
    }
  }
  
  // Resend OTP
  static async resendOTP(email) {
    try {
      const user = await User.findOne({ email })
        .select('+emailVerificationOTP +otpExpiry');
      
      if (!user) {
        return formatResponse(false, 'User not found', null, 404);
      }
      
      if (user.isEmailVerified) {
        return formatResponse(false, 'Email already verified', null, 400);
      }
      
      // Generate new OTP
      const otp = user.generateOTP();
      await user.save();
      
      // Send OTP email
      const emailResult = await sendOTPEmail(email, otp, user.name);
      
      if (!emailResult.success) {
        return formatResponse(false, 'Failed to send verification email', null, 500);
      }
      
      return formatResponse(true, 'New OTP sent to your email', null, 200);
      
    } catch (error) {
      console.error('Resend OTP error:', error);
      return formatResponse(false, 'Failed to resend OTP', null, 500);
    }
  }
  
  // Register a new user (DEPRECATED - Use sendRegistrationOTP + verifyEmailAndRegister instead)
  static async register(userData) {
    try {
      const { 
        role, 
        businessName, 
        pricePerCan, 
        serviceRadius, 
        minimumOrder,
        operatingHours,
        description,
        bankDetails,
        upiId,
        upiNumber,
        coordinates, 
        addressCoordinates, 
        ...userInfo 
      } = userData;
      
      // Check if user already exists
      const existingUser = await User.findOne({ email: userInfo.email });
      if (existingUser) {
        return formatResponse(false, 'User already exists with this email', null, 400);
      }
      
      // For delivery partners, ensure address is not required
      const userPayload = {
        ...userInfo,
        role
      };
      
      // Only include address if provided
      if (role === 'delivery' && !userInfo.address) {
        userPayload.address = {};
      }
      
      // For customers, address is optional - they can add it later from dashboard
      if (role === 'customer' && !userInfo.address) {
        delete userPayload.address;
      }
      
      // Create user
      const user = await User.create(userPayload);
      
      // If registering as provider, create provider profile
      if (role === 'provider') {
        const providerData = {
          userId: user._id,
          businessName,
          area: userInfo.address.area,
          pricePerCan,
          serviceRadius: serviceRadius || 5,
          minimumOrder: minimumOrder || 1,
          coordinates: coordinates || { latitude: 0, longitude: 0 },
          operatingHours: operatingHours || { open: '08:00', close: '20:00' },
          description: description || ''
        };
        
        // Add payment details if provided
        if (bankDetails && (bankDetails.accountHolder || bankDetails.bankName || bankDetails.accountNumber || bankDetails.ifsc)) {
          providerData.bankDetails = bankDetails;
        }
        if (upiId) {
          providerData.upiId = upiId;
        }
        if (upiNumber) {
          providerData.upiNumber = upiNumber;
        }
        
        await Provider.create(providerData);
      }
      
      return formatResponse(true, 'User registered successfully', generateTokenResponse(user), 201);
      
    } catch (error) {
      console.error('Registration error:', error);
      return formatResponse(false, 'Registration failed', null, 500);
    }
  }
  
  // Send OTP for passwordless login
  static async sendLoginOTP(email) {
    try {
      // Find user by email
      const user = await User.findOne({ email });
      
      if (!user) {
        return formatResponse(false, 'No account found with this email', null, 404);
      }
      
      if (!user.isActive) {
        return formatResponse(false, 'Account is deactivated', null, 401);
      }
      
      // Check if email is verified (only for customers and providers)
      if ((user.role === 'customer' || user.role === 'provider') && !user.isEmailVerified) {
        return formatResponse(false, 'Please verify your email first', null, 403);
      }
      
      // Generate OTP
      const otp = user.generateOTP();
      await user.save();
      
      // Send OTP email
      const emailResult = await sendLoginOTPEmail(email, otp, user.name);
      
      if (!emailResult.success) {
        return formatResponse(false, 'Failed to send login OTP. Please try again.', null, 500);
      }
      
      return formatResponse(true, 'Login OTP sent to your email', { email }, 200);
      
    } catch (error) {
      console.error('Send login OTP error:', error);
      return formatResponse(false, 'Failed to send login OTP', null, 500);
    }
  }
  
  // Verify login OTP and authenticate user
  static async verifyLoginOTP(email, otp) {
    try {
      // Find user with email and get OTP fields
      const user = await User.findOne({ email })
        .select('+emailVerificationOTP +otpExpiry');
      
      if (!user) {
        return formatResponse(false, 'User not found', null, 404);
      }
      
      if (!user.isActive) {
        return formatResponse(false, 'Account is deactivated', null, 401);
      }
      
      // Verify OTP
      if (!user.verifyOTP(otp)) {
        return formatResponse(false, 'Invalid or expired OTP', null, 400);
      }
      
      // Clear OTP fields after successful verification
      user.emailVerificationOTP = undefined;
      user.otpExpiry = undefined;
      await user.save();
      
      return formatResponse(true, 'Login successful', generateTokenResponse(user), 200);
      
    } catch (error) {
      console.error('Verify login OTP error:', error);
      return formatResponse(false, 'Login failed', null, 500);
    }
  }
  
  // Login user - accept email or phone as identifier
  static async login(identifier, password) {
    try {
      // Try finding by email first (if identifier looks like an email), then by phone
      let user = null;

      if (typeof identifier === 'string' && identifier.includes('@')) {
        user = await User.findOne({ email: identifier }).select('+password');
      }

      if (!user) {
        user = await User.findOne({ phone: identifier }).select('+password');
      }

      if (!user || !(await user.matchPassword(password))) {
        return formatResponse(false, 'Invalid credentials', null, 401);
      }

      if (!user.isActive) {
        return formatResponse(false, 'Account is deactivated', null, 401);
      }
      
      // Check if email is verified (only for customers and providers)
      if ((user.role === 'customer' || user.role === 'provider') && !user.isEmailVerified) {
        return formatResponse(false, 'Please verify your email before logging in', null, 403);
      }

      return formatResponse(true, 'Login successful', generateTokenResponse(user), 200);

    } catch (error) {
      console.error('Login error:', error);
      return formatResponse(false, 'Login failed', null, 500);
    }
  }
  
  // Get current user profile
  static async getProfile(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        return formatResponse(false, 'User not found', null, 404);
      }
      
      let profileData = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        specialNotes: user.specialNotes,
        isActive: user.isActive,
        createdAt: user.createdAt
      };
      
      // If user is a provider, include provider details
      if (user.role === 'provider') {
        const provider = await Provider.findOne({ userId: user._id });
        if (provider) {
          profileData.providerDetails = {
            businessName: provider.businessName,
            area: provider.area,
            isOnline: provider.isOnline,
            coordinates: provider.coordinates,
            pricePerCan: provider.pricePerCan,
            serviceRadius: provider.serviceRadius,
            minimumOrder: provider.minimumOrder,
            operatingHours: provider.operatingHours,
            description: provider.description,
            rating: provider.rating,
            totalOrders: provider.totalOrders,
            completedOrders: provider.completedOrders,
            revenue: provider.revenue,
            isApproved: provider.isApproved
          };
          // include linked contact info
          profileData.contact = {
            name: user.name,
            email: user.email,
            phone: user.phone,
            address: user.address
          };
        }
      }
      
      return formatResponse(true, 'Profile retrieved successfully', profileData, 200);
      
    } catch (error) {
      console.error('Get profile error:', error);
      return formatResponse(false, 'Failed to retrieve profile', null, 500);
    }
  }
  
  // Update user profile
  static async updateProfile(userId, updateData) {
    try {
      const allowedUpdates = ['name', 'phone', 'address', 'specialNotes'];
      const filteredData = {};
      
      // Filter only allowed updates
      Object.keys(updateData).forEach(key => {
        if (allowedUpdates.includes(key)) {
          filteredData[key] = updateData[key];
        }
      });
      
      const user = await User.findByIdAndUpdate(
        userId, 
        filteredData, 
        { new: true, runValidators: true }
      );
      
      if (!user) {
        return formatResponse(false, 'User not found', null, 404);
      }
      
      return formatResponse(true, 'Profile updated successfully', {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        specialNotes: user.specialNotes
      }, 200);
      
    } catch (error) {
      console.error('Update profile error:', error);
      return formatResponse(false, 'Failed to update profile', null, 500);
    }
  }
  
  // Change password
  static async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId).select('+password');
      
      if (!user) {
        return formatResponse(false, 'User not found', null, 404);
      }
      
      // Verify current password
      if (!(await user.matchPassword(currentPassword))) {
        return formatResponse(false, 'Current password is incorrect', null, 400);
      }
      
      // Update password
      user.password = newPassword;
      await user.save();
      
      return formatResponse(true, 'Password changed successfully', null, 200);
      
    } catch (error) {
      console.error('Change password error:', error);
      return formatResponse(false, 'Failed to change password', null, 500);
    }
  }

  // Send OTP for password reset
  static async sendPasswordResetOTP(email) {
    try {
      console.log('🔐 sendPasswordResetOTP called for:', email);
      
      // Find user by email
      const user = await User.findOne({ email });
      
      if (!user) {
        return formatResponse(false, 'No account found with this email', null, 404);
      }
      
      if (!user.isActive) {
        return formatResponse(false, 'Account is deactivated', null, 401);
      }
      
      // Generate OTP
      const otp = user.generateOTP();
      await user.save();
      
      console.log(`Generated password reset OTP for ${email}: ${otp}`);
      
      // Send OTP email
      const emailResult = await sendPasswordResetOTPEmail(email, otp, user.name);
      
      if (!emailResult.success) {
        return formatResponse(false, 'Failed to send password reset OTP. Please try again.', null, 500);
      }
      
      return formatResponse(true, 'Password reset OTP sent to your email', { email }, 200);
      
    } catch (error) {
      console.error('Send password reset OTP error:', error);
      return formatResponse(false, 'Failed to send password reset OTP', null, 500);
    }
  }

  // Verify password reset OTP
  static async verifyPasswordResetOTP(email, otp) {
    try {
      console.log('🔐 verifyPasswordResetOTP called for:', email);
      
      // Find user with email and get OTP fields
      const user = await User.findOne({ email })
        .select('+emailVerificationOTP +otpExpiry');
      
      if (!user) {
        return formatResponse(false, 'User not found', null, 404);
      }
      
      if (!user.isActive) {
        return formatResponse(false, 'Account is deactivated', null, 401);
      }
      
      // Verify OTP
      if (!user.verifyOTP(otp)) {
        return formatResponse(false, 'Invalid or expired OTP', null, 400);
      }
      
      // Return success but don't clear OTP yet (will clear after password reset)
      return formatResponse(true, 'OTP verified successfully', { email }, 200);
      
    } catch (error) {
      console.error('Verify password reset OTP error:', error);
      return formatResponse(false, 'OTP verification failed', null, 500);
    }
  }

  // Reset password after OTP verification
  static async resetPassword(email, otp, newPassword) {
    try {
      console.log('🔐 resetPassword called for:', email);
      
      // Find user with email and get OTP and password fields
      const user = await User.findOne({ email })
        .select('+emailVerificationOTP +otpExpiry +password');
      
      if (!user) {
        return formatResponse(false, 'User not found', null, 404);
      }
      
      if (!user.isActive) {
        return formatResponse(false, 'Account is deactivated', null, 401);
      }
      
      // Verify OTP one more time
      if (!user.verifyOTP(otp)) {
        return formatResponse(false, 'Invalid or expired OTP', null, 400);
      }
      
      // Update password
      user.password = newPassword;
      
      // Clear OTP fields
      user.emailVerificationOTP = undefined;
      user.otpExpiry = undefined;
      
      await user.save();
      
      console.log(`✅ Password reset successfully for ${email}`);
      
      return formatResponse(true, 'Password reset successful. You can now login with your new password.', null, 200);
      
    } catch (error) {
      console.error('Reset password error:', error);
      return formatResponse(false, 'Failed to reset password', null, 500);
    }
  }
}

module.exports = AuthService;