import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';
import clsx from 'clsx';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const stepLabels = [
  'Business Profile',
  'Regulations',
  'Priorities',
  'Team Setup',
  'Finalize'
];

const stepDescriptions = [
  'Tell us about your business',
  'Select compliance regulations',
  'Set up your priorities',
  'Invite team members',
  'Complete your account'
];

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ currentStep, totalSteps }) => {
  return (
    <div className="w-full">
      {/* Desktop Progress Bar */}
      <div className="hidden sm:block">
        <div className="relative">
          {/* Progress Line */}
          <div className="absolute left-0 top-4 h-0.5 w-full bg-gray-200">
            <div 
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
            />
          </div>
          
          {/* Steps */}
          <div className="relative flex justify-between">
            {Array.from({ length: totalSteps }).map((_, index) => {
              const stepNumber = index + 1;
              const isCompleted = stepNumber < currentStep;
              const isCurrent = stepNumber === currentStep;
              
              return (
                <div key={stepNumber} className="flex flex-col items-center">
                  {/* Step Circle */}
                  <div className={clsx(
                    'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors duration-300',
                    isCompleted && 'border-blue-600 bg-blue-600',
                    isCurrent && 'border-blue-600 bg-white',
                    !isCompleted && !isCurrent && 'border-gray-300 bg-white'
                  )}>
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-white" />
                    ) : (
                      <span className={clsx(
                        'text-sm font-semibold',
                        isCurrent ? 'text-blue-600' : 'text-gray-400'
                      )}>
                        {stepNumber}
                      </span>
                    )}
                  </div>
                  
                  {/* Step Label */}
                  <div className="mt-3 text-center">
                    <p className={clsx(
                      'text-sm font-medium',
                      isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'
                    )}>
                      {stepLabels[index]}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {stepDescriptions[index]}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Mobile Progress */}
      <div className="sm:hidden">
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-500">
            Step {currentStep} of {totalSteps}
          </p>
          <p className="mt-1 text-lg font-semibold text-gray-900">
            {stepLabels[currentStep - 1]}
          </p>
          <p className="text-sm text-gray-500">
            {stepDescriptions[currentStep - 1]}
          </p>
        </div>
        
        {/* Mobile Progress Bar */}
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div 
            className="h-full rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ProgressIndicator;