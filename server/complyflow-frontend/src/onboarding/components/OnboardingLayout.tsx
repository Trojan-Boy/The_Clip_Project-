import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import ProgressIndicator from './ProgressIndicator';

const OnboardingLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  const handleBack = () => {
    // Determine previous step based on current path
    const steps = ['welcome', 'regulations', 'priority', 'team', 'finalize'];
    const currentStep = pathname.split('/').pop();
    const currentIndex = steps.indexOf(currentStep || 'welcome');
    
    if (currentIndex > 0) {
      navigate(`/onboarding/${steps[currentIndex - 1]}`);
    } else {
      navigate('/');
    }
  };

  const getCurrentStep = () => {
    const path = pathname.split('/').pop();
    const steps = ['welcome', 'regulations', 'priority', 'team', 'finalize'];
    return steps.indexOf(path || 'welcome') + 1;
  };

  const totalSteps = 5;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <div className="hidden sm:block">
                <span className="text-sm font-medium text-gray-500">Step {getCurrentStep()} of {totalSteps}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:block">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
                    <span className="text-sm font-semibold text-white">CF</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">ComplyFlow</span>
                </div>
              </div>
              <button className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <HelpCircle className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* Mobile Progress */}
          <div className="mt-4 sm:hidden">
            <ProgressIndicator currentStep={getCurrentStep()} totalSteps={totalSteps} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Desktop Progress */}
        <div className="mb-8 hidden sm:block">
          <ProgressIndicator currentStep={getCurrentStep()} totalSteps={totalSteps} />
        </div>
        
        {/* Content Area */}
        <div className="rounded-2xl bg-white p-6 shadow-lg sm:p-8">
          <Outlet />
        </div>
        
        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Questions? Contact our support team at{' '}
            <a href="mailto:support@complyflow.com" className="font-medium text-blue-600 hover:text-blue-500">
              support@complyflow.com
            </a>
          </p>
          <p className="mt-2 text-xs text-gray-400">
            By continuing, you agree to our{' '}
            <a href="#" className="text-blue-600 hover:text-blue-500">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-blue-600 hover:text-blue-500">Privacy Policy</a>
          </p>
        </div>
      </main>
    </div>
  );
};

export default OnboardingLayout;