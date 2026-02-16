import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Droplets, 
  Truck, 
  Users, 
  Shield, 
  CheckCircle, 
  Star,
  ArrowRight,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';

const Landing = () => {
  const features = [
    {
      icon: Droplets,
      title: 'Easy Water Ordering',
      description: 'Order water cans with just a few clicks. View nearby providers and transparent pricing.'
    },
    {
      icon: Truck,
      title: 'Real-time Tracking',
      description: 'Track your water delivery in real-time from order to doorstep delivery.'
    },
    {
      icon: Users,
      title: 'Trusted Providers',
      description: 'All water suppliers are verified and approved for quality and reliability.'
    },
    {
      icon: Shield,
      title: 'Secure Payments',
      description: 'Safe and secure payment options including cash on delivery and online payment.'
    }
  ];

  const howItWorks = [
    {
      step: 1,
      title: 'Sign Up',
      description: 'Create your JalSaathi account in just a few minutes'
    },
    {
      step: 2,
      title: 'Find Providers',
      description: 'Browse nearby water suppliers and their rates'
    },
    {
      step: 3,
      title: 'Place Order',
      description: 'Select quantity, choose payment method, and place order'
    },
    {
      step: 4,
      title: 'Get Delivered',
      description: 'Track your order and receive fresh water at your doorstep'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Droplets className="h-8 w-8 text-water-500" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">JalSaathi</h1>
                <p className="text-xs text-gray-500">Har Pyaas Ka Saathi</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link to="/about" className="text-gray-600 hover:text-gray-900">About</Link>
              <Link to="/contact" className="text-gray-600 hover:text-gray-900">Contact</Link>
              <Link to="/login" className="btn-outline">Sign In</Link>
              <Link to="/register" className="btn-primary">Get Started</Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="gradient-water text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold font-display mb-6 animate-fade-in-up">
              JalSaathi
            </h1>
            <h2 className="text-xl md:text-2xl mb-4 animate-fade-in-up animation-delay-100">
              Har Pyaas Ka Saathi
            </h2>
            <p className="text-lg md:text-xl mb-8 max-w-3xl mx-auto animate-fade-in-up animation-delay-200">
              Your trusted partner for area-based water can delivery. Connect with local suppliers, 
              track deliveries, and never run out of fresh drinking water again.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-300">
              <Link to="/register/customer" className="btn-primary bg-white text-water-600 hover:bg-gray-100 text-lg px-8 py-3">
                Order Water Now <ArrowRight className="h-5 w-5" />
              </Link>
              <Link to="/register/provider" className="btn-outline border-white text-white hover:bg-white hover:text-water-600 text-lg px-8 py-3">
                Become a Provider
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-display text-gray-900 mb-4">
              Why Choose JalSaathi?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              We make water delivery simple, reliable, and transparent for everyone in your area.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center animate-fade-in-up" style={{animationDelay: `${index * 100}ms`}}>
                <div className="w-16 h-16 mx-auto mb-4 bg-water-100 rounded-full flex items-center justify-center">
                  <feature.icon className="h-8 w-8 text-water-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-display text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Getting fresh water delivered is as easy as 1-2-3-4
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((step, index) => (
              <div key={index} className="text-center animate-fade-in-up" style={{animationDelay: `${index * 150}ms`}}>
                <div className="w-12 h-12 mx-auto mb-4 bg-primary-500 text-white rounded-full flex items-center justify-center text-xl font-bold">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-20 bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="animate-fade-in-up">
              <div className="text-4xl md:text-5xl font-bold mb-2">1000+</div>
              <div className="text-lg">Happy Customers</div>
            </div>
            <div className="animate-fade-in-up animation-delay-100">
              <div className="text-4xl md:text-5xl font-bold mb-2">50+</div>
              <div className="text-lg">Trusted Providers</div>
            </div>
            <div className="animate-fade-in-up animation-delay-200">
              <div className="text-4xl md:text-5xl font-bold mb-2">5000+</div>
              <div className="text-lg">Orders Delivered</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold font-display text-gray-900 mb-4">
            Ready to Never Run Out of Water Again?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join thousands of satisfied customers who trust JalSaathi for their daily water needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn-primary text-lg px-8 py-3">
              Start Ordering <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Droplets className="h-8 w-8 text-water-400" />
                <div>
                  <h3 className="text-xl font-bold">JalSaathi</h3>
                  <p className="text-sm text-gray-400">Har Pyaas Ka Saathi</p>
                </div>
              </div>
              <p className="text-gray-300">
                Making water delivery simple, reliable, and accessible for everyone in your area.
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link to="/about" className="text-gray-300 hover:text-white">About Us</Link></li>
                <li><Link to="/contact" className="text-gray-300 hover:text-white">Contact</Link></li>
                <li><Link to="/register" className="text-gray-300 hover:text-white">Sign Up</Link></li>
                <li><Link to="/login" className="text-gray-300 hover:text-white">Sign In</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">Contact Info</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span className="text-gray-300">+91 12345 67890</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4" />
                  <span className="text-gray-300">support@jalsaathi.com</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-gray-300">Available Pan-India</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-800 text-center">
            <p className="text-gray-400">
              © 2024 JalSaathi. All rights reserved. Built with ❤️ for better water delivery.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;