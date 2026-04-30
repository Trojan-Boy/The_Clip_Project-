import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, MapPin, ArrowRight } from 'lucide-react';
import BusinessProfileForm from './BusinessProfileForm';
import { BusinessProfile } from '@/onboarding/types/onboarding';

const WelcomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: BusinessProfile) => {
    setIsSubmitting(true);
    try {
      // TODO: Replace with actual API call
      console.log('Submitting business profile:', data);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      navigate('/onboarding/regulations');
    } catch (error) {
      console.error('Error submitting business profile:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Welcome to ComplyFlow</h1>
        <p className="mt-3 text-lg text-gray-600">
          Let's set up your compliance management in minutes
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-100 p-2">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm text-gray-600">Business Details</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-green-100 p-2">
              <MapPin className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-sm text-gray-600">Location Setup</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-purple-100 p-2">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-sm text-gray-600">Team Ready</span>
          </div>
        </div>
      </div>

      {/* Introduction */}
      <div className="rounded-xl bg-blue-50 p-6">
        <h2 className="text-lg font-semibold text-blue-900">Why do we need this information?</h2>
        <ul className="mt-3 space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-600" />
            <span>Customize compliance requirements for your specific industry</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-600" />
            <span>Set up relevant regional regulations based on your location</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-600" />
            <span>Configure user roles and permissions for your team</span>
          </li>
          <li className="flex items-start gap-2">
            <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-600" />
            <span>Generate personalized compliance action plans</span>
          </li>
        </ul>
      </div>

      {/* Form */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Tell us about your business</h2>
        <p className="mt-2 text-gray-600">
          This information helps us tailor ComplyFlow to your specific needs
        </p>
        
        <BusinessProfileForm 
          onSubmit={handleSubmit} 
          isSubmitting={isSubmitting} 
        />
      </div>

      {/* Footer Note */}
      <div className="border-t border-gray-200 pt-6">
        <p className="text-sm text-gray-500">
          <strong>Note:</strong> All information is encrypted and secure. You can update these details anytime in your account settings.
        </p>
      </div>
    </div>
  );
};

export default WelcomeScreen;