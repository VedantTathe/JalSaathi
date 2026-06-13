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
import { useLanguage } from '../contexts/LanguageContext';

const Landing = () => {
  const { t } = useLanguage();
  const features = [
    {
      icon: Droplets,
      title: t('landing.feature1Title'),
      description: t('landing.feature1Desc')
    },
    {
      icon: Truck,
      title: t('landing.feature2Title'),
      description: t('landing.feature2Desc')
    },
    {
      icon: Users,
      title: t('landing.feature3Title'),
      description: t('landing.feature3Desc')
    },
    {
      icon: Shield,
      title: t('landing.feature4Title'),
      description: t('landing.feature4Desc')
    }
  ];

  const howItWorks = [
    {
      step: 1,
      title: t('landing.step1Title'),
      description: t('landing.step1Desc')
    },
    {
      step: 2,
      title: t('landing.step2Title'),
      description: t('landing.step2Desc')
    },
    {
      step: 3,
      title: t('landing.step3Title'),
      description: t('landing.step3Desc')
    },
    {
      step: 4,
      title: t('landing.step4Title'),
      description: t('landing.step4Desc')
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-3 sm:py-4">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2 min-w-0">
                <Droplets className="h-8 w-8 text-water-500 flex-shrink-0" />
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-gray-900 leading-tight">{t('common.appName')}</h1>
                  <p className="text-xs text-gray-500">{t('common.tagline')}</p>
                </div>
              </div>

              <div className="hidden sm:flex items-center space-x-4">
                <Link to="/about" className="text-gray-600 hover:text-gray-900">{t('common.about')}</Link>
                <Link to="/contact" className="text-gray-600 hover:text-gray-900">{t('common.contact')}</Link>
                <Link to="/register/provider" className="text-primary-600 font-medium hover:text-primary-700">{t('common.becomeProvider')}</Link>
                <Link to="/login" className="btn-outline">{t('common.signIn')}</Link>
              </div>

              <div className="sm:hidden flex items-center space-x-2">
                <Link to="/register/provider" className="text-xs text-primary-600 font-medium hover:text-primary-700 whitespace-nowrap">
                  {t('common.becomeProvider')}
                </Link>
                <Link to="/login" className="inline-flex items-center justify-center border border-primary-500 text-primary-600 font-semibold rounded-xl px-3 py-2 whitespace-nowrap shadow-sm text-sm">
                  {t('common.signIn')}
                </Link>
              </div>
            </div>

            <div className="sm:hidden mt-3 flex items-center gap-3">
              <Link to="/about" className="inline-flex items-center rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">{t('common.about')}</Link>
              <Link to="/contact" className="inline-flex items-center rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200">{t('common.contact')}</Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="gradient-water text-white py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold font-display mb-4 sm:mb-6 animate-fade-in-up">
              {t('landing.heroTitle')}
            </h1>
            <h2 className="text-lg sm:text-xl md:text-2xl mb-3 sm:mb-4 animate-fade-in-up animation-delay-100">
              {t('landing.heroSubtitle')}
            </h2>
            <p className="text-base sm:text-lg md:text-xl mb-8 max-w-3xl mx-auto animate-fade-in-up animation-delay-200">
              {t('landing.heroDesc')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-300">
              <Link to="/register/customer" className="btn-primary bg-white text-water-600 hover:bg-gray-100 text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto">
                {t('landing.orderNow')} <ArrowRight className="h-5 w-5" />
              </Link>
              <Link to="/register/provider" className="btn-outline border-white text-white hover:bg-white hover:text-water-600 text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto">
                {t('common.becomeProvider')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display text-gray-900 mb-4">
              {t('landing.whyChoose')}
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              {t('landing.whyChooseDesc')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card premium-glass-card text-center animate-fade-in-up flex flex-col items-center p-6 sm:p-8" style={{animationDelay: `${index * 100}ms`}}>
                <div className="w-16 h-16 mx-auto mb-4 bg-water-100 rounded-full flex items-center justify-center shadow-inner">
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
      <section className="py-14 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display text-gray-900 mb-4">
              {t('landing.howItWorks')}
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              {t('landing.howItWorksDesc')}
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-8">
            {howItWorks.map((step, index) => (
              <div key={index} className="card premium-glass-card text-center animate-fade-in-up flex flex-col items-center p-6 sm:p-8" style={{animationDelay: `${index * 150}ms`}}>
                <div className="w-12 h-12 mx-auto mb-4 bg-primary-500 text-white rounded-full flex items-center justify-center text-xl font-bold shadow-lg">
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
      <section className="py-14 sm:py-20 bg-primary-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 text-center">
            <div className="animate-fade-in-up">
              <div className="text-4xl md:text-5xl font-bold mb-2">1000+</div>
              <div className="text-lg">{t('landing.stats1Label')}</div>
            </div>
            <div className="animate-fade-in-up animation-delay-100">
              <div className="text-4xl md:text-5xl font-bold mb-2">50+</div>
              <div className="text-lg">{t('landing.stats2Label')}</div>
            </div>
            <div className="animate-fade-in-up animation-delay-200">
              <div className="text-4xl md:text-5xl font-bold mb-2">5000+</div>
              <div className="text-lg">{t('landing.stats3Label')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold font-display text-gray-900 mb-4">
            {t('landing.ctaTitle')}
          </h2>
          <p className="text-base sm:text-lg text-gray-600 mb-8">
            {t('landing.ctaDesc')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="btn-primary text-base sm:text-lg px-6 sm:px-8 w-full sm:w-auto">
              {t('landing.startOrdering')} <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            <div>
              <div className="flex items-center justify-center md:justify-start space-x-2 mb-4">
                <Droplets className="h-8 w-8 text-water-400" />
                <div>
                  <h3 className="text-xl font-bold">{t('common.appName')}</h3>
                  <p className="text-sm text-gray-400">{t('common.tagline')}</p>
                </div>
              </div>
              <p className="text-gray-300">
                {t('landing.whyChooseDesc')}
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">{t('landing.quickLinks')}</h4>
              <ul className="space-y-2">
                <li><Link to="/about" className="text-gray-300 hover:text-white">{t('common.about')}</Link></li>
                <li><Link to="/contact" className="text-gray-300 hover:text-white">{t('common.contact')}</Link></li>
                <li><Link to="/register" className="text-gray-300 hover:text-white">{t('landing.step1Title')}</Link></li>
                <li><Link to="/login" className="text-gray-300 hover:text-white">{t('common.signIn')}</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">{t('landing.contactInfo')}</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-center md:justify-start space-x-2">
                  <Phone className="h-4 w-4" />
                  <span className="text-gray-300">+91 12345 67890</span>
                </div>
                <div className="flex items-center justify-center md:justify-start space-x-2">
                  <Mail className="h-4 w-4" />
                  <span className="text-gray-300">support@jalsaathi.com</span>
                </div>
                <div className="flex items-center justify-center md:justify-start space-x-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-gray-300">{t('landing.panIndia')}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-800 text-center">
            <p className="text-gray-400">
              {t('landing.footerText')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;