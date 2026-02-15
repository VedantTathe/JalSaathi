import React, { useState } from 'react';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock,
  MessageCircle,
  Send,
  CheckCircle,
  AlertCircle,
  Users,
  HelpCircle
} from 'lucide-react';
import { useMutation } from 'react-query';
import { userApi } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    category: 'general',
    message: ''
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Contact form submission mutation
  const contactMutation = useMutation(
    userApi.contactSupport,
    {
      onSuccess: () => {
        setFormSubmitted(true);
        toast.success('Message sent successfully! We\'ll get back to you soon.');
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: '',
          category: 'general',
          message: ''
        });
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to send message');
      }
    }
  );

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    contactMutation.mutate(formData);
  };

  const contactMethods = [
    {
      icon: Phone,
      title: '24/7 Customer Support',
      description: 'Speak with our support team anytime',
      value: '+91 1800-123-4567',
      action: 'Call Now',
      bgColor: 'bg-primary-100',
      iconColor: 'text-primary-600'
    },
    {
      icon: Mail,
      title: 'Email Support',
      description: 'General inquiries and support',
      value: 'support@jalsaathi.com',
      action: 'Send Email',
      bgColor: 'bg-success-100',
      iconColor: 'text-success-600'
    },
    {
      icon: MessageCircle,
      title: 'Live Chat',
      description: 'Chat with our team in real-time',
      value: 'Available 6 AM - 12 AM',
      action: 'Start Chat',
      bgColor: 'bg-water-100',
      iconColor: 'text-water-600'
    }
  ];

  const officeLocations = [
    {
      city: 'Mumbai',
      address: '301, Business Center, Andheri East, Mumbai - 400069',
      phone: '+91 22 1234 5678'
    },
    {
      city: 'Delhi',
      address: '45, Cyber Hub, Sector 18, Gurugram - 122015',
      phone: '+91 11 1234 5678'
    },
    {
      city: 'Bangalore',
      address: '12th Floor, Tech Park, Electronic City, Bangalore - 560100',
      phone: '+91 80 1234 5678'
    }
  ];

  const categories = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'support', label: 'Technical Support' },
    { value: 'order', label: 'Order Related' },
    { value: 'quality', label: 'Quality Issue' },
    { value: 'billing', label: 'Billing & Payment' },
    { value: 'partnership', label: 'Partnership Opportunity' }
  ];

  const faqs = [
    {
      question: 'How do I place an order?',
      answer: 'Simply register, browse providers in your area, select quantity, and place your order. Track delivery in real-time.'
    },
    {
      question: 'What is the delivery time?',
      answer: 'Most orders are delivered within 1-2 hours. You can track your order progress in real-time.'
    },
    {
      question: 'How do I become a water supplier?',
      answer: 'Register as a provider, complete verification process, and start receiving orders in your area.'
    },
    {
      question: 'What payment methods are accepted?',
      answer: 'We accept cash on delivery, UPI, credit/debit cards, and digital wallet payments.'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-water-600 text-white py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Get in Touch</h1>
          <p className="text-xl text-primary-100 max-w-2xl mx-auto">
            We're here to help! Reach out to us for any questions, support, or feedback.
          </p>
        </div>
      </div>

      {/* Contact Methods */}
      <div className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How can we help you?</h2>
            <p className="text-lg text-gray-600">
              Choose the most convenient way to reach us
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {contactMethods.map((method, index) => {
              const MethodIcon = method.icon;
              return (
                <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow">
                  <div className={`w-16 h-16 ${method.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <MethodIcon className={`h-8 w-8 ${method.iconColor}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {method.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3">
                    {method.description}
                  </p>
                  <p className="font-medium text-gray-900 mb-4">
                    {method.value}
                  </p>
                  <button className="btn-primary w-full text-sm">
                    {method.action}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contact Form */}
      <div className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Send us a Message</h2>
            <p className="text-lg text-gray-600">
              Fill out the form below and we'll get back to you as soon as possible
            </p>
          </div>
          
          {formSubmitted ? (
            <div className="bg-success-50 border border-success-200 rounded-lg p-8 text-center">
              <CheckCircle className="h-16 w-16 text-success-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-success-800 mb-2">Message Sent Successfully!</h3>
              <p className="text-success-700 mb-4">
                Thank you for reaching out to us. We've received your message and will respond within 24 hours.
              </p>
              <button 
                onClick={() => setFormSubmitted(false)}
                className="btn-success"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="input-field"
                    placeholder="Enter your full name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="input-field"
                    placeholder="Enter your email"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="input-field"
                    placeholder="Enter your phone number"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="input-field"
                  >
                    {categories.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  className="input-field"
                  placeholder="Brief subject line"
                />
              </div>
              
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message *
                </label>
                <textarea
                  required
                  rows="5"
                  value={formData.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  className="input-field resize-none"
                  placeholder="Please provide details about your inquiry..."
                />
              </div>
              
              <div className="mt-8 flex justify-center">
                <button
                  type="submit"
                  disabled={contactMutation.isLoading}
                  className="btn-primary px-8"
                >
                  {contactMutation.isLoading ? (
                    <>
                      <LoadingSpinner size="small" />
                      <span className="ml-2">Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Office Locations */}
      <div className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Offices</h2>
            <p className="text-lg text-gray-600">
              Visit us at our locations across India
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {officeLocations.map((office, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
                    <MapPin className="h-5 w-5 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {office.city}
                  </h3>
                </div>
                
                <p className="text-gray-600 mb-4 text-sm">
                  {office.address}
                </p>
                
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  {office.phone}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-gray-600">
              Quick answers to common questions
            </p>
          </div>
          
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <HelpCircle className="h-4 w-4 text-primary-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {faq.question}
                    </h3>
                    <p className="text-gray-600">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">
              Can't find what you're looking for?
            </p>
            <button className="btn-primary">
              <MessageCircle className="h-4 w-4 mr-2" />
              Contact Support
            </button>
          </div>
        </div>
      </div>

      {/* Business Hours */}
      <div className="py-16 bg-gray-800 text-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-8">Business Hours</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <Clock className="h-8 w-8 text-primary-400 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Customer Support</h3>
                <p className="text-gray-300">24/7 Available</p>
              </div>
              <div className="text-center">
                <Users className="h-8 w-8 text-primary-400 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Live Chat</h3>
                <p className="text-gray-300">6:00 AM - 12:00 AM</p>
              </div>
              <div className="text-center">
                <MapPin className="h-8 w-8 text-primary-400 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Delivery Service</h3>
                <p className="text-gray-300">6:00 AM - 10:00 PM</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Response Time Notice */}
      <div className="bg-primary-50 border-l-4 border-primary-400 p-6">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center">
            <AlertCircle className="h-6 w-6 text-primary-600 mr-3" />
            <div>
              <h3 className="font-semibold text-primary-800">Response Time</h3>
              <p className="text-primary-700">
                We typically respond to all inquiries within 2-4 hours during business hours. 
                For urgent matters, please call our 24/7 support line.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;