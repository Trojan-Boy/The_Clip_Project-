import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface Priority {
  id: string;
  name: string;
  description: string;
  selected: boolean;
}

const PrioritySetup: React.FC = () => {
  const navigate = useNavigate();
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sample priorities data - in a real app this would come from an API
  const priorities: Priority[] = [
    {
      id: 'compliance-monitoring',
      name: 'Compliance Monitoring',
      description: 'Track and monitor regulatory compliance status',
      selected: false
    },
    {
      id: 'risk-assessment',
      name: 'Risk Assessment',
      description: 'Identify and evaluate compliance risks',
      selected: false
    },
    {
      id: 'reporting',
      name: 'Reporting',
      description: 'Generate compliance reports',
      selected: false
    },
    {
      id: 'training',
      name: 'Training',
      description: 'Manage compliance training programs',
      selected: false
    },
    {
      id: 'automated-alerts',
      name: 'Automated Alerts',
      description: 'Receive notifications for compliance issues',
      selected: false
    },
    {
      id: 'audit-trail',
      name: 'Audit Trail',
      description: 'Maintain detailed compliance records',
      selected: false
    }
  ];

  const togglePriority = (id: string) => {
    setSelectedPriorities(prev => {
      if (prev.includes(id)) {
        return prev.filter(priority => priority !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // TODO: Replace with actual API call
      console.log('Selected priorities:', selectedPriorities);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      navigate('/onboarding/team');
    } catch (error) {
      console.error('Error selecting priorities:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Set Your Priorities</h1>
        <p className="mt-3 text-lg text-gray-600">
          What are your top compliance priorities?
        </p>
      </div>

      {/* Priority List */}
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Select your top 3 priorities. You can adjust these later in your account settings.
        </p>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {priorities.map((priority) => (
            <div 
              key={priority.id}
              onClick={() => togglePriority(priority.id)}
              className={`cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 ${
                selectedPriorities.includes(priority.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border ${
                  selectedPriorities.includes(priority.id)
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}>
                  {selectedPriorities.includes(priority.id) && (
                    <div className="h-2 w-2 rounded-full bg-white"></div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{priority.name}</h3>
                  <p className="mt-1 text-sm text-gray-600">{priority.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button 
          onClick={handleSubmit} 
          disabled={selectedPriorities.length < 1 || isSubmitting}
        >
          {isSubmitting ? 'Processing...' : 'Continue to Team Setup'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default PrioritySetup;