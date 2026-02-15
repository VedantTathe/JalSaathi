const User = require('../user/model');
const Provider = require('../provider/model');
const { generateTokenResponse, formatResponse } = require('../../utils/helpers');

class AuthService {
  // Register a new user
  static async register(userData) {
    try {
      const { role, businessName, pricePerCan, serviceRadius, coordinates, addressCoordinates, ...userInfo } = userData;
      
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
      
      // Only include address if provided (not required for delivery partners)
      if (role === 'delivery' && !userInfo.address) {
        userPayload.address = {};
      }
      
      // Add coordinates to customer address if provided
      if (role === 'customer' && addressCoordinates) {
        if (!userPayload.address) {
          userPayload.address = {};
        }
        userPayload.address.coordinates = addressCoordinates;
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
          coordinates: coordinates || { latitude: 0, longitude: 0 }
        };
        
        await Provider.create(providerData);
      }
      
      return formatResponse(true, 'User registered successfully', generateTokenResponse(user), 201);
      
    } catch (error) {
      console.error('Registration error:', error);
      return formatResponse(false, 'Registration failed', null, 500);
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
}

module.exports = AuthService;