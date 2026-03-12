import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, 
  Phone,
  ArrowLeft
} from 'lucide-react';

const Contact = () => {
  const navigate = useNavigate();
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
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-water-600 text-white py-16">
        <div className="max-w-6xl mx-auto px-4">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center space-x-2 text-white hover:text-primary-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back</span>
          </button>
          
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Get in Touch</h1>
            <p className="text-xl text-primary-100 max-w-2xl mx-auto">
              We're here to help! Reach out to us for any questions, support, or feedback.
            </p>
          </div>
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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
    </div>
  );
};

export default Contact;