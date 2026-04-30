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

// Step Types
export type OnboardingStep = 
  | 'welcome' 
  | 'business_profile' 
  | 'regulation_selection' 
  | 'priority_setup' 
  | 'team_invitation' 
  | 'account_finalization';

export interface StepConfig {
  id: OnboardingStep;
  title: string;
  description: string;
  index: number;
  component: React.ComponentType<any>;
}

// Country/Location Types
export interface Country {
  code: string;
  name: string;
  region: string;
}

// Progress Types
export interface ProgressStep {
  number: number;
  label: string;
  description: string;
  completed: boolean;
  current: boolean;
}