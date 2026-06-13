import React from 'react';
import { 
  Droplets, 
  Users, 
  Truck, 
  Shield, 
  Clock, 
  Award,
  CheckCircle,
  MapPin,
  Phone,
  Mail,
  ArrowLeft
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const About = () => {
  const navigate = useNavigate();
  const features = [
    {
      icon: Droplets,
      title: 'Pure Water Delivery',
      description: 'Clean, safe, and pure drinking water delivered to your doorstep with quality assurance.'
    },
    {
      icon: Clock,
      title: 'Fast Delivery',
      description: 'Quick and reliable delivery service with real-time tracking and estimated delivery times.'
    },
    {
      icon: Shield,
      title: 'Quality Guaranteed',
      description: 'All our water suppliers are verified and maintain the highest quality standards.'
    },
    {
      icon: Users,
      title: 'Trusted Network',
      description: 'A network of verified water suppliers and delivery professionals in your area.'
    }
  ];

  const stats = [
    { number: '10,000+', label: 'Happy Customers' },
    { number: '500+', label: 'Verified Suppliers' },
    { number: '50+', label: 'Cities Covered' },
    { number: '99.9%', label: 'Delivery Success' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Top right Become Provider button */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50">
        <Link 
          to="/register/provider"
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-600 bg-white hover:bg-gray-50 transition-colors"
        >
          Become a Provider
        </Link>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-water-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center space-x-2 text-white hover:text-primary-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back</span>
          </button>
          
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              About JalSaathi
            </h1>
            <p className="text-xl md:text-2xl text-primary-100 mb-8 max-w-3xl mx-auto">
              Your trusted companion for clean water delivery. Connecting communities 
              with reliable water supply through innovative technology.
            </p>
            <div className="flex items-center justify-center space-x-2 text-sm">
              <Droplets className="h-5 w-5" />
              <span>Pure • Reliable • Accessible</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mission Statement */}
      <div className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
          <p className="text-lg text-gray-600 leading-relaxed mb-8">
            To revolutionize water delivery in India by creating a seamless, technology-driven 
            platform that connects communities with trusted water suppliers. We believe access 
            to clean water is a fundamental right, and we're committed to making it convenient, 
            affordable, and reliable for everyone.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Quality First</h3>
              <p className="text-gray-600 text-sm">
                Every supplier is verified for water quality and safety standards
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-water-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-water-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Community Focus</h3>
              <p className="text-gray-600 text-sm">
                Supporting local water suppliers and creating employment opportunities
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="h-8 w-8 text-success-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Reliable Service</h3>
              <p className="text-gray-600 text-sm">
                Consistent, on-time delivery with real-time tracking and support
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose JalSaathi?</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We've designed our platform to make water delivery simple, reliable, and accessible for everyone.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const FeatureIcon = feature.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FeatureIcon className="h-8 w-8 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-16 bg-primary-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Impact</h2>
            <p className="text-lg text-gray-600">
              Numbers that reflect our commitment to serving communities across India
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary-600 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-lg text-gray-600">
              Getting clean water delivered is simple with our three-step process
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Choose & Order</h3>
              <p className="text-gray-600 mb-4">
                Browse verified water suppliers in your area, compare prices, and place your order with just a few clicks.
              </p>
              <div className="flex items-center justify-center text-primary-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span className="text-sm">Quick & Easy</span>
              </div>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Track Delivery</h3>
              <p className="text-gray-600 mb-4">
                Get real-time updates on your order status and track your delivery person's location on the map.
              </p>
              <div className="flex items-center justify-center text-primary-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span className="text-sm">Real-time Tracking</span>
              </div>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Receive & Enjoy</h3>
              <p className="text-gray-600 mb-4">
                Receive your pure water cans at your doorstep and enjoy the convenience of our reliable service.
              </p>
              <div className="flex items-center justify-center text-primary-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span className="text-sm">Doorstep Delivery</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Values</h2>
            <p className="text-lg text-gray-600">
              The principles that guide everything we do
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Droplets className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Purity & Quality</h3>
                <p className="text-gray-600">
                  We never compromise on water quality. Every supplier undergoes rigorous verification 
                  and quality checks to ensure you get the purest water.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="h-6 w-6 text-success-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Community First</h3>
                <p className="text-gray-600">
                  We support local water suppliers and create opportunities for delivery professionals, 
                  contributing to community growth and employment.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-water-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="h-6 w-6 text-water-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Trust & Transparency</h3>
                <p className="text-gray-600">
                  Open communication, fair pricing, and honest business practices build the 
                  foundation of trust with our customers and partners.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-warning-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Award className="h-6 w-6 text-warning-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Excellence & Innovation</h3>
                <p className="text-gray-600">
                  Continuous improvement and innovation in our services to provide the best 
                  possible experience for our customers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact CTA */}
      <div className="py-16 bg-primary-600 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Join JalSaathi?</h2>
          <p className="text-xl text-primary-100 mb-8">
            Experience the convenience of reliable water delivery today
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn-secondary">
              Get Started Today
            </Link>
            <Link to="/contact" className="btn-outline-white">
              Contact Us
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Contact Info */}
      <div className="py-8 bg-gray-800 text-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex items-center justify-center space-x-3">
              <MapPin className="h-5 w-5 text-primary-400" />
              <span className="text-sm">Serving 50+ cities across India</span>
            </div>
            <div className="flex items-center justify-center space-x-3">
              <Phone className="h-5 w-5 text-primary-400" />
              <span className="text-sm">24/7 Customer Support</span>
            </div>
            <div className="flex items-center justify-center space-x-3">
              <Mail className="h-5 w-5 text-primary-400" />
              <span className="text-sm">support@jalsaathi.com</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;