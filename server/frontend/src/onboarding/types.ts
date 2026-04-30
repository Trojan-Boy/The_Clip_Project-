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
  regulations: string[]; // Regulation IDs that apply to this industry
}

export interface Country {
  id: string;
  name: string;
  code: string;
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
  countries: string[]; // Country IDs where this regulation applies
}

export interface RegulationSelection {
  regulationId: string;
  priority: number; // 1-5, where 1 is highest priority
  customNotes?: string;
  isSelected: boolean;
}

// Team Invitation Types
export interface TeamMemberInvitation {
  email: string;
  role: TeamRole;
  permissions: Permission[];
  invitationSent: boolean;
  accepted: boolean;
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
  lastUpdated: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// Step Configuration
export interface OnboardingStep {
  id: number;
  title: string;
  subtitle: string;
  component: string; // Component name to render
  required: boolean;
  canSkip: boolean;
  validationSchema?: any; // Zod schema for validation
}

// Onboarding configuration
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: 'Business Profile',
    subtitle: 'Tell us about your company',
    component: 'BusinessProfileForm',
    required: true,
    canSkip: false
  },
  {
    id: 2,
    title: 'Regulation Selection',
    subtitle: 'Choose the regulations that apply to you',
    component: 'RegulationSelection',
    required: true,
    canSkip: false
  },
  {
    id: 3,
    title: 'Priority Setup',
    subtitle: 'Set your compliance priorities',
    component: 'PrioritySetup',
    required: true,
    canSkip: false
  },
  {
    id: 4,
    title: 'Team Invitation',
    subtitle: 'Invite your team members',
    component: 'TeamInvitation',
    required: false,
    canSkip: true
  },
  {
    id: 5,
    title: 'Account Finalization',
    subtitle: 'Complete your account setup',
    component: 'AccountFinalization',
    required: true,
    canSkip: false
  }
];