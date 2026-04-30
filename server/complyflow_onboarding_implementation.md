# ComplyFlow Onboarding Implementation - Code Structure

## 1. TypeScript Type Definitions

### `src/types/onboarding.ts`
```typescript
// Business Profile Types
export interface BusinessProfile {
  businessName: string;
  industryId: string;
  employeeCount: EmployeeRange;
  primaryLocation: string;
  annualRevenue?: string;
  complianceBudget?: number;
}

export type EmployeeRange = '1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1000+';

export interface Industry {
  id: string;
  name: string;
  description: string;
}

// Regulation Types
export interface Regulation {
  id: string;
  name: string;
  code: string;
  description: string;
  applicableIndustries: string[];
  complexity: 'low' | 'medium' | 'high';
  estimatedTimeToCompliance: string;
  icon: string;
}

export interface RegulationSelection {
  regulationId: string;
  priority: number;
  customNotes?: string;
}

// Team Invitation Types
export interface TeamMemberInvitation {
  email: string;
  role: TeamRole;
  permissions: Permission[];
}

export type TeamRole = 'admin' | 'compliance_manager' | 'auditor' | 'viewer';
export type Permission = 'read' | 'write' | 'approve' | 'audit';

// Onboarding State
export interface OnboardingState {
  currentStep: number;
  completedSteps: number[];
  businessProfile: BusinessProfile | null;
  selectedRegulations: RegulationSelection[];
  teamInvitations: TeamMemberInvitation[];
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingOptIn: boolean;
  isLoading: boolean;
  errors: Record<string, string>;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

## 2. Validation Schemas

### `src/utils/validationSchemas.ts`
```typescript
import { z } from 'zod';

export const businessProfileSchema = z.object({
  businessName: z.string()
    .min(2, 'Business name must be at least 2 characters')
    .max(100, 'Business name cannot exceed 100 characters'),
  
  industryId: z.string().uuid('Invalid industry selection'),
  
  employeeCount: z.enum([
    '1-10', '11-50', '51-200', 
    '201-500', '501-1000', '1000+'
  ], { required_error: 'Please select employee count' }),
  
  primaryLocation: z.string()
    .min(2, 'Location must be at least 2 characters')
    .max(100, 'Location cannot exceed 100 characters'),
  
  annualRevenue: z.string().optional(),
  complianceBudget: z.number().min(0).optional(),
});

export const regulationSelectionSchema = z.object({
  regulationId: z.string().uuid('Invalid regulation selection'),
  priority: z.number().min(1).max(5),
  customNotes: z.string().max(500).optional(),
});

export const teamInvitationSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['admin', 'compliance_manager', 'auditor', 'viewer']),
  permissions: z.array(z.enum(['read', 'write', 'approve', 'audit'])).min(1),
});

export const onboardingCompleteSchema = z.object({
  termsAccepted: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions',
  }),
  privacyAccepted: z.boolean().refine(val => val === true, {
    message: 'You must accept the privacy policy',
  }),
  marketingOptIn: z.boolean().default(false),
});
```

## 3. State Management Store

### `src/store/onboardingStore.ts`
```typescript
import { create } from 'zustand';
import { OnboardingState, BusinessProfile, RegulationSelection, TeamMemberInvitation } from '../types/onboarding';
import { businessProfileSchema, regulationSelectionSchema, teamInvitationSchema } from '../utils/validationSchemas';

interface OnboardingStore extends OnboardingState {
  // Actions
  setCurrentStep: (step: number) => void;
  markStepComplete: (step: number) => void;
  
  // Business Profile
  setBusinessProfile: (profile: Partial<BusinessProfile>) => void;
  validateBusinessProfile: () => Promise<boolean>;
  
  // Regulations
  addRegulation: (regulation: RegulationSelection) => void;
  removeRegulation: (regulationId: string) => void;
  updateRegulationPriority: (regulationId: string, priority: number) => void;
  
  // Team
  addTeamInvitation: (invitation: TeamMemberInvitation) => void;
  removeTeamInvitation: (email: string) => void;
  updateTeamRole: (email: string, role: TeamMemberInvitation['role']) => void;
  
  // Acceptance
  setTermsAccepted: (accepted: boolean) => void;
  setPrivacyAccepted: (accepted: boolean) => void;
  setMarketingOptIn: (optIn: boolean) => void;
  
  // Submission
  submitOnboarding: () => Promise<boolean>;
  
  // Reset
  resetOnboarding: () => void;
}

const initialState: OnboardingState = {
  currentStep: 1,
  completedSteps: [],
  businessProfile: null,
  selectedRegulations: [],
  teamInvitations: [],
  termsAccepted: false,
  privacyAccepted: false,
  marketingOptIn: false,
  isLoading: false,
  errors: {},
};

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
  ...initialState,
  
  setCurrentStep: (step) => set({ currentStep: step }),
  
  markStepComplete: (step) => {
    const { completedSteps } = get();
    if (!completedSteps.includes(step)) {
      set({ completedSteps: [...completedSteps, step] });
    }
  },
  
  setBusinessProfile: (profile) => {
    const current = get().businessProfile;
    set({ 
      businessProfile: { ...current, ...profile } as BusinessProfile 
    });
  },
  
  validateBusinessProfile: async () => {
    const { businessProfile } = get();
    if (!businessProfile) return false;
    
    try {
      await businessProfileSchema.parseAsync(businessProfile);
      return true;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  },
  
  addRegulation: (regulation) => {
    const { selectedRegulations } = get();
    const existingIndex = selectedRegulations.findIndex(r => r.regulationId === regulation.regulationId);
    
    if (existingIndex >= 0) {
      const updated = [...selectedRegulations];
      updated[existingIndex] = regulation;
      set({ selectedRegulations: updated });
    } else {
      set({ selectedRegulations: [...selectedRegulations, regulation] });
    }
  },
  
  removeRegulation: (regulationId) => {
    const { selectedRegulations } = get();
    set({
      selectedRegulations: selectedRegurations.filter(r => r.regulationId !== regulationId)
    });
  },
  
  updateRegulationPriority: (regulationId, priority) => {
    const { selectedRegulations } = get();
    const updated = selectedRegulations.map(r => 
      r.regulationId === regulationId ? { ...r, priority } : r
    );
    set({ selectedRegulations: updated });
  },
  
  addTeamInvitation: (invitation) => {
    const { teamInvitations } = get();
    set({ teamInvitations: [...teamInvitations, invitation] });
  },
  
  removeTeamInvitation: (email) => {
    const { teamInvitations } = get();
    set({
      teamInvitations: teamInvitations.filter(i => i.email !== email)
    });
  },
  
  updateTeamRole: (email, role) => {
    const { teamInvitations } = get();
    const updated = teamInvitations.map(i => 
      i.email === email ? { ...i, role } : i
    );
    set({ teamInvitations: updated });
  },
  
  setTermsAccepted: (accepted) => set({ termsAccepted: accepted }),
  setPrivacyAccepted: (accepted) => set({ privacyAccepted: accepted }),
  setMarketingOptIn: (optIn) => set({ marketingOptIn: optIn }),
  
  submitOnboarding: async () => {
    const state = get();
    
    // Validate all steps
    const businessValid = await state.validateBusinessProfile();
    const regulationsValid = state.selectedRegulations.length > 0;
    const termsValid = state.termsAccepted && state.privacyAccepted;
    
    if (!businessValid || !regulationsValid || !termsValid) {
      return false;
    }
    
    set({ isLoading: true });
    
    try {
      // API call to submit onboarding
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessProfile: state.businessProfile,
          selectedRegulations: state.selectedRegulations,
          teamInvitations: state.teamInvitations,
          termsAccepted: state.termsAccepted,
          privacyAccepted: state.privacyAccepted,
          marketingOptIn: state.marketingOptIn,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Mark all steps as complete
        set({ completedSteps: [1, 2, 3, 4, 5, 6] });
        return true;
      } else {
        set({ errors: { submission: result.error || 'Submission failed' } });
        return false;
      }
    } catch (error) {
      console.error('Submission error:', error);
      set({ errors: { submission: 'Network error occurred' } });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
  
  resetOnboarding: () => set(initialState),
}));
```

## 4. React Components Structure

### `src/components/onboarding/OnboardingLayout.tsx`
```typescript
import React from 'react';
import { useOnboardingStore } from '../../store/onboardingStore';
import ProgressIndicator from './ProgressIndicator';
import { WelcomeScreen } from './WelcomeScreen/WelcomeScreen';
import { BusinessProfileForm } from './WelcomeScreen/BusinessProfileForm';
import { RegulationSelection } from './RegulationSelection/RegulationSelection';
import { PrioritySetup } from './PrioritySetup/PrioritySetup';
import { TeamInvitation } from './TeamInvitation/TeamInvitation';
import { AccountFinalization } from './AccountFinalization/AccountFinalization';

export const OnboardingLayout: React.FC = () => {
  const { currentStep, isLoading } = useOnboardingStore();
  
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <WelcomeScreen />;
      case 2:
        return <BusinessProfileForm />;
      case 3:
        return <RegulationSelection />;
      case 4:
        return <PrioritySetup />;
      case 5:
        return <TeamInvitation />;
      case 6:
        return <AccountFinalization />;
      default:
        return <WelcomeScreen />;
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Progress Header */}
          <div className="px-8 py-6 border-b border-gray-200 bg-gray-50">
            <ProgressIndicator />
          </div>
          
          {/* Step Content */}
          <div className="p-8">
            {renderStepContent()}
          </div>
          
          {/* Navigation Footer */}
          <div className="px-8 py-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
            <NavigationButtons />
          </div>
        </div>
        
        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-xl shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-lg font-medium">Submitting your information...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const NavigationButtons: React.FC = () => {
  const { currentStep, setCurrentStep, submitOnboarding } = useOnboardingStore();
  
  const handleNext = async () => {
    if (currentStep === 6) {
      await submitOnboarding();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  return (
    <>
      <button
        onClick={handleBack}
        className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={currentStep === 1}
      >
        Back
      </button>
      
      <button
        onClick={handleNext}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {currentStep === 6 ? 'Complete Onboarding' : 'Continue'}
      </button>
    </>
  );
};
```

## 5. Custom Hooks

### `src/hooks/useOnboardingProgress.ts`
```typescript
import { useEffect } from 'react';
import { useOnboardingStore } from '../store/onboardingStore';

export const useOnboardingProgress = () => {
  const { currentStep, completedSteps, markStepComplete } = useOnboardingStore();
  
  // Auto-mark step as complete when moving to next step
  useEffect(() => {
    if (!completedSteps.includes(currentStep)) {
      markStepComplete(currentStep);
    }
  }, [currentStep, completedSteps, markStepComplete]);
  
  const progressPercentage = Math.round((completedSteps.length / 6) * 100);
  
  const isStepComplete = (step: number) => completedSteps.includes(step);
  const canAccessStep = (step: number) => 
    isStepComplete(step) || step === currentStep || step <= currentStep;
  
  return {
    currentStep,
    completedSteps,
    progressPercentage,
    isStepComplete,
    canAccessStep,
  };
};
```

## 6. API Client

### `src/utils/apiClient.ts`
```typescript
import { BusinessProfile, RegulationSelection, TeamMemberInvitation } from '../types/onboarding';

export class OnboardingApiClient {
  private baseUrl: string;
  
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }
  
  async saveBusinessProfile(profile: BusinessProfile) {
    const response = await fetch(`${this.baseUrl}/business/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    
    return response.json();
  }
  
  async getAvailableRegulations() {
    const response = await fetch(`${this.baseUrl}/regulations/list`);
    return response.json();
  }
  
  async saveRegulationSelections(selections: RegulationSelection[]) {
    const response = await fetch(`${this.baseUrl}/regulations/selection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selections }),
    });
    
    return response.json();
  }
  
  async sendTeamInvitations(invitations: TeamMemberInvitation[]) {
    const response = await fetch(`${this.baseUrl}/team/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitations }),
    });
    
    return response.json();
  }
  
  async completeOnboarding(data: {
    businessProfile: BusinessProfile;
    selectedRegulations: RegulationSelection[];
    teamInvitations: TeamMemberInvitation[];
    termsAccepted: boolean;
    privacyAccepted: boolean;
    marketingOptIn: boolean;
  }) {
    const response = await fetch(`${this.baseUrl}/onboarding/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    return response.json();
  }
  
  async getOnboardingStatus() {
    const response = await fetch(`${this.baseUrl}/onboarding/status`);
    return response.json();
  }
}

export const onboardingApi = new OnboardingApiClient();
```

## 7. Main App Integration

### `src/App.tsx`
```typescript
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { OnboardingLayout } from './components/onboarding/OnboardingLayout';
import { Dashboard } from './components/dashboard/Dashboard';
import { useOnboardingStore } from './store/onboardingStore';

function App() {
  const { completedSteps } = useOnboardingStore();
  const isOnboardingComplete = completedSteps.includes(6);
  
  return (
    <Router>
      <Routes>
        <Route 
          path="/onboarding/*" 
          element={isOnboardingComplete ? <Navigate to="/dashboard" /> : <OnboardingLayout />} 
        />
        <Route 
          path="/dashboard" 
          element={isOnboardingComplete ? <Dashboard /> : <Navigate to="/onboarding" />} 
        />
        <Route path="/" element={<Navigate to={isOnboardingComplete ? "/dashboard" : "/onboarding"} />} />
      </Routes>
    </Router>
  );
}

export default App;
```

## Implementation Notes

1. **File Structure**: Follow the directory structure outlined in the onboarding implementation plan
2. **Styling**: Use Tailwind CSS classes as shown, with custom CSS for complex components
3. **State Management**: Zustand provides simple, scalable state management
4. **Validation**: Zod schemas for runtime type safety and validation
5. **API Integration**: Centralized API client for consistent error handling
6. **Error Handling**: Comprehensive error states and user feedback
7. **Loading States**: Proper loading indicators for API calls
8. **Accessibility**: Semantic HTML and ARIA attributes
9. **Responsive Design**: Mobile-first approach with Tailwind's responsive utilities
10. **Testing**: Component-testing with React Testing Library