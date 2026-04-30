import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface Regulation {
  id: string;
  name: string;
  description: string;
  selected: boolean;
}

const RegulationSelection: React.FC = () => {
  const navigate = useNavigate();
  const [selectedRegulations, setSelectedRegulations] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sample regulations data - in a real app this would come from an API
  const regulations: Regulation[] = [
    {
      id: 'gdpr',
      name: 'GDPR',
      description: 'General Data Protection Regulation for European Union',
      selected: false
    },
    {
      id: 'hipaa',
      name: 'HIPAA',
      description: 'Health Insurance Portability and Accountability Act',
      selected: false
    },
    {
      id: 'sox',
      name: 'SOX',
      description: 'Sarbanes-Oxley Act for financial reporting',
      selected: false
    },
    {
      id: 'ccpa',
      name: 'CCPA',
      description: 'California Consumer Privacy Act',
      selected: false
    },
    {
      id: 'pci',
      name: 'PCI DSS',
      description: 'Payment Card Industry Data Security Standard',
      selected: false
    },
    {
      id: 'pii',
      name: 'PII',
      description: 'Personally Identifiable Information protection',
      selected: false
    }
  ];

  const toggleRegulation = (id: string) => {
    setSelectedRegulations(prev => {
      if (prev.includes(id)) {
        return prev.filter(reg => reg !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // TODO: Replace with actual API call
      console.log('Selected regulations:', selectedRegulations);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      navigate('/onboarding/priority');
    } catch (error) {
      console.error('Error selecting regulations:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Select Compliance Regulations</h1>
        <p className="mt-3 text-lg text-gray-600">
          Choose the regulations that apply to your business
        </p>
      </div>

      {/* Regulation List */}
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Select all that apply. You can always update these later in your account settings.
        </p>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {regulations.map((regulation) => (
            <div 
              key={regulation.id}
              onClick={() => toggleRegulation(regulation.id)}
              className={`cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 ${
                selectedRegulations.includes(regulation.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full border ${
                  selectedRegulations.includes(regulation.id)
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}>
                  {selectedRegulations.includes(regulation.id) && (
                    <div className="h-2 w-2 rounded-full bg-white"></div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{regulation.name}</h3>
                  <p className="mt-1 text-sm text-gray-600">{regulation.description}</p>
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
          disabled={selectedRegulations.length === 0 || isSubmitting}
        >
          {isSubmitting ? 'Processing...' : 'Continue to Priorities'}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default RegulationSelection;