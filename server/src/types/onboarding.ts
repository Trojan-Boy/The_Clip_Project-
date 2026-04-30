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

// Onboarding Step Enum
export enum OnboardingStep {
  WELCOME = 0,
  BUSINESS_PROFILE = 1,
  REGULATION_SELECTION = 2,
  PRIORITY_SETUP = 3,
  TEAM_INVITATION = 4,
  ACCOUNT_FINALIZATION = 5,
  COMPLETE = 6
}

// Country/Location Types
export interface Country {
  code: string;
  name: string;
  region: string;
}

// Industry Data
export const INDUSTRIES: Industry[] = [
  { id: 'tech', name: 'Technology & Software', description: 'SaaS, software development, IT services' },
  { id: 'healthcare', name: 'Healthcare', description: 'Medical services, health tech, clinics' },
  { id: 'finance', name: 'Financial Services', description: 'Banking, fintech, insurance' },
  { id: 'retail', name: 'Retail & E-commerce', description: 'Online stores, physical retail' },
  { id: 'manufacturing', name: 'Manufacturing', description: 'Production, supply chain, logistics' },
  { id: 'professional-services', name: 'Professional Services', description: 'Consulting, legal, accounting' },
  { id: 'education', name: 'Education', description: 'Schools, edtech, training providers' },
  { id: 'hospitality', name: 'Hospitality', description: 'Hotels, restaurants, travel' },
  { id: 'nonprofit', name: 'Non-Profit', description: 'Charities, NGOs, foundations' },
  { id: 'other', name: 'Other', description: 'Other industries not listed' }
];

// Regulation Data
export const REGULATIONS: Regulation[] = [
  {
    id: 'gdpr',
    name: 'GDPR Compliance',
    code: 'GDPR',
    description: 'General Data Protection Regulation for data privacy in the EU',
    applicableIndustries: ['tech', 'healthcare', 'finance', 'retail', 'education'],
    complexity: 'high',
    estimatedTimeToCompliance: '4-6 weeks',
    icon: 'shield-check'
  },
  {
    id: 'ccpa',
    name: 'CCPA Compliance',
    code: 'CCPA',
    description: 'California Consumer Privacy Act for California residents',
    applicableIndustries: ['tech', 'retail', 'finance'],
    complexity: 'medium',
    estimatedTimeToCompliance: '3-4 weeks',
    icon: 'document-text'
  },
  {
    id: 'hipaa',
    name: 'HIPAA Compliance',
    code: 'HIPAA',
    description: 'Health Insurance Portability and Accountability Act for healthcare',
    applicableIndustries: ['healthcare', 'tech'],
    complexity: 'high',
    estimatedTimeToCompliance: '6-8 weeks',
    icon: 'medical'
  },
  {
    id: 'soc2',
    name: 'SOC 2 Compliance',
    code: 'SOC2',
    description: 'Service Organization Control 2 for security, availability, processing integrity',
    applicableIndustries: ['tech', 'finance', 'professional-services'],
    complexity: 'high',
    estimatedTimeToCompliance: '8-12 weeks',
    icon: 'lock-closed'
  },
  {
    id: 'iso27001',
    name: 'ISO 27001 Compliance',
    code: 'ISO27001',
    description: 'Information security management system standard',
    applicableIndustries: ['tech', 'finance', 'manufacturing'],
    complexity: 'high',
    estimatedTimeToCompliance: '12-16 weeks',
    icon: 'globe-alt'
  },
  {
    id: 'pci-dss',
    name: 'PCI DSS Compliance',
    code: 'PCI-DSS',
    description: 'Payment Card Industry Data Security Standard',
    applicableIndustries: ['retail', 'finance', 'hospitality'],
    complexity: 'medium',
    estimatedTimeToCompliance: '4-6 weeks',
    icon: 'credit-card'
  }
];