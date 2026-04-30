# ComplyFlow - Wireframes & Key Screen Designs

## 1. Onboarding Flow

### Screen 1: Welcome Screen
```
┌─────────────────────────────────────────────────────────────┐
│                    ComplyFlow                               │
│           Compliance Made Simple for SMBs                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   [Illustration: Shield with checkmark]                    │
│                                                             │
│   Welcome to ComplyFlow!                                    │
│   We'll help you navigate GDPR, CCPA, HIPAA                │
│   compliance in simple, guided steps.                      │
│                                                             │
│   Let's get started by understanding your business.        │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐ │
│   │ Business Name: [____________________________]       │ │
│   │                                                     │ │
│   │ Industry: [Select Industry ▼]                      │ │
│   │   • Technology                                      │ │
│   │   • Healthcare                                      │ │
│   │   • Financial Services                              │ │
│   │   • Retail/E-commerce                               │ │
│   │   • Professional Services                           │ │
│   │                                                     │ │
│   │ Number of Employees: [Select Range ▼]              │ │
│   │   • 1-10                                            │ │
│   │   • 11-50                                           │ │
│   │   • 51-200                                          │ │
│   │   • 201-500                                         │ │
│   │                                                     │ │
│   │ Primary Location: [Select Country/Region ▼]        │ │
│   │                                                     │ │
│   └─────────────────────────────────────────────────────┘ │
│                                                             │
│   [Continue]                                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Screen 2: Regulation Selection
```
┌─────────────────────────────────────────────────────────────┐
│                    ComplyFlow                               │
│           Step 2: Select Your Compliance Needs             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Based on your business profile, we recommend:            │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐ │
│   │  [✓] GDPR Compliance                               │ │
│   │  For businesses handling EU citizen data           │ │
│   │                                                    │ │
│   │  Key requirements:                                │ │
│   │  • Data protection principles                      │ │
│   │  • Individual rights management                    │ │
│   │  • Breach notification                            │ │
│   │                                                    │ │
│   │  Estimated time: 4-6 weeks                        │ │
│   └─────────────────────────────────────────────────────┘ │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐ │
│   │  [ ] CCPA Compliance                               │ │
│   │  For businesses operating in California            │ │
│   │                                                    │ │
│   │  Key requirements:                                │ │
│   │  • Consumer privacy rights                        │ │
│   │  • Data sale opt-out                              │ │
│   │  • Privacy policy requirements                    │ │
│   │                                                    │ │
│   │  Estimated time: 3-4 weeks                        │ │
│   └─────────────────────────────────────────────────────┘ │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐ │
│   │  [ ] HIPAA Compliance                              │ │
│   │  For healthcare organizations                     │ │
│   │                                                    │ │
│   │  Key requirements:                                │ │
│   │  • Protected health information safeguards        │ │
│   │  • Patient rights notifications                   │ │
│   │  • Security risk assessments                     │ │
│   │                                                    │ │
│   │  Estimated time: 6-8 weeks                        │ │
│   └─────────────────────────────────────────────────────┘ │
│                                                             │
│   [Back] [Continue]                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 2. Dashboard - High Fidelity Mockup

### Main Dashboard View
```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ ┌─────┐                                                                             │
│ │Logo │ ComplyFlow                              [Search...] [Notifications] [User ▼]│
│ └─────┘                                                                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│ Welcome back, Sarah!                                                               │
│ Your compliance journey dashboard                                                   │
│                                                                                     │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Compliance Overview                                                              │ │
│ ├─────────────────────────────────────────────────────────────────────────────────┤ │
│ │                                                                                 │ │
│ │  Overall Compliance Score                                                       │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │                                                                         │   │ │
│ │  │  ┌─────────────────────────────────────────────────────────────────┐   │   │ │
│ │  │  │                                                                 │   │   │ │
│ │  │  │   [Circular Progress: 68%]                                     │   │   │ │
│ │  │  │                                                                 │   │   │ │
│ │  │  │   Score: 68/100                                                 │   │   │ │
│ │  │  │   ▲ 12% from last month                                         │   │   │ │
│ │  │  └─────────────────────────────────────────────────────────────────┘   │   │ │
│ │  │                                                                         │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ │  Regulation Breakdown                                                           │ │
│ │  ┌─────┬─────┬─────┬─────┬─────┐                                               │ │
│ │  │GDPR │CCPA │HIPAA│PCI  │Other│                                               │ │
│ │  ├─────┼─────┼─────┼─────┼─────┤                                               │ │
│ │  │ 75% │ 60% │ 40% │ 80% │ 85% │                                               │ │
│ │  └─────┴─────┴─────┴─────┴─────┘                                               │ │
│ │                                                                                 │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Urgent Tasks                                                                     │ │
│ ├─────────────────────────────────────────────────────────────────────────────────┤ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ ⚠️ HIGH PRIORITY                                                        │   │ │
│ │  │ Update Privacy Policy                                                    │   │ │
│ │  │ Due: Today                                                              │   │ │
│ │  │ GDPR • Data Processing                                                   │   │ │
│ │  │ ──────────────────────────────────────────────────────────────────────  │   │ │
│ │  │ [Mark Complete] [Reschedule]                                            │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ ⚠️ HIGH PRIORITY                                                        │   │ │
│ │  │ Data Protection Officer Appointment                                      │   │ │
│ │  │ Due: Tomorrow                                                            │   │ │
│ │  │ GDPR • Governance                                                        │   │ │
│ │  │ ──────────────────────────────────────────────────────────────────────  │   │ │
│ │  │ [Mark Complete] [Reschedule]                                            │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ ⚠️ MEDIUM PRIORITY                                                      │   │ │
│ │  │ Employee Training Completion                                             │   │ │
│ │  │ Due: 3 days                                                              │   │ │
│ │  │ GDPR • Awareness                                                         │   │ │
│ │  │ ──────────────────────────────────────────────────────────────────────  │   │ │
│ │  │ [Mark Complete] [Reschedule]                                            │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Recent Activity                                                                  │ │
│ ├─────────────────────────────────────────────────────────────────────────────────┤ │
│ │                                                                                 │ │
│ │  Today                                                                          │ │
│ │  • Alex completed "Data Mapping Exercise"                                       │ │
│ │  • Privacy Policy updated to v2.1                                               │ │
│ │                                                                                 │ │
│ │  Yesterday                                                                      │ │
│ │  • New team member added: Jamie (IT Admin)                                      │ │
│ │  • GDPR Assessment started                                                      │ │
│ │                                                                                 │ │
│ │  Last Week                                                                      │ │
│ │  • Compliance score increased from 56% to 68%                                   │ │
│ │  • 3 overdue tasks completed                                                    │ │
│ │                                                                                 │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 3. GDPR Compliance Workflow - Detailed Mockup

### GDPR Overview Screen
```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ ┌─────┐                                                                             │
│ │Logo │ ComplyFlow                              [Search...] [Notifications] [User ▼]│
│ └─────┘                                                                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ GDPR Compliance • Overview                                                           │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│ │ GDPR Compliance Journey                                                          │ │
│ ├─────────────────────────────────────────────────────────────────────────────────┤ │
│ │                                                                                 │ │
│ │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │ │
│ │  │   Phase 1   │  │   Phase 2   │  │   Phase 3   │  │   Phase 4   │            │ │
│ │  │ Assessment  │  │ Preparation │  │ Implementation│  │ Maintenance │           │ │
│ │  │   25%       │  │   40%       │  │   15%       │  │   20%       │            │ │
│ │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘            │ │
│ │                                                                                 │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Key Requirements                                                                 │ │
│ ├─────────────────────────────────────────────────────────────────────────────────┤ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ ✅ Lawful Basis for Processing                                          │   │ │
│ │  │ Determine and document legal grounds for data processing               │   │ │
│ │  │ Status: Complete                                                       │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ 🔄 Data Protection Impact Assessment                                   │   │ │
│ │  │ Conduct DPIA for high-risk processing activities                        │   │ │
│ │  │ Status: In Progress (60%)                                              │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ ⏳ Records of Processing Activities                                     │   │ │
│ │  │ Maintain ROPA documenting all data processing activities               │   │ │
│ │  │ Status: Not Started                                                    │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ ⏳ Data Subject Rights Procedure                                        │   │ │
│ │  │ Establish process for handling DSARs                                    │   │ │
│ │  │ Status: Not Started                                                    │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Next Steps                                                                       │ │
│ ├─────────────────────────────────────────────────────────────────────────────────┤ │
│ │                                                                                 │ │
│ │  1. Complete Data Protection Impact Assessment                                  │ │
│ │     • Due: 2 days                                                               │ │
│ │     • Assigned to: Alex Johnson                                                 │ │
│ │                                                                                 │ │
│ │  2. Appoint Data Protection Officer                                            │ │
│ │     • Due: 5 days                                                               │ │
│ │     • Assigned to: Sarah Chen                                                   │ │
│ │                                                                                 │ │
│ │  3. Update Privacy Policy                                                       │ │
│ │     • Due: 7 days                                                               │ │
│ │     • Assigned to: Marketing Team                                              │ │
│ │                                                                                 │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│ [Start Assessment] [View All Tasks] [Generate Report]                               │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Data Mapping Interface
```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ ┌─────┐                                                                             │
│ │Logo │ ComplyFlow                              [Search...] [Notifications] [User ▼]│
│ └─────┘                                                                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ GDPR Compliance • Data Mapping                                                       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│ Step 2 of 6: Map Your Data Flows                                                    │
│                                                                                     │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Data Categories                                                                  │ │
│ ├─────────────────────────────────────────────────────────────────────────────────┤ │
│ │                                                                                 │ │
│ │ Drag and drop data types to map your organization's data flows                 │ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ Data Sources                                                            │   │ │
│ │  ├─────────────────────────────────────────────────────────────────────────┤   │ │
│ │  │                                                                         │   │ │
│ │  │ ┌─────┐ Customer Data                    ┌─────┐ Employee Data         │   │ │
│ │  │ │     │ • Contact info                   │     │ • HR records          │   │ │
│ │  │ │     │ • Purchase history               │     │ • Performance data    │   │ │
│ │  │ └─────┘ • Support tickets                └─────┘ • Contact details     │   │ │
│ │  │                                                                         │   │ │
│ │  │ ┌─────┐ Financial Data                   ┌─────┐ Website Data          │   │ │
│ │  │ │     │ • Payment info                   │     │ • Cookies            │   │ │
│ │  │ │     │ • Transaction records            │     │ • Analytics          │   │ │
│ │  │ └─────┘ • Invoices                       └─────┘ • User behavior       │   │ │
│ │  │                                                                         │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ Processing Activities                                                   │   │ │
│ │  ├─────────────────────────────────────────────────────────────────────────┤   │ │
│ │  │                                                                         │   │ │
│ │  │ ┌─────┐ Marketing                       ┌─────┐ Customer Support       │   │ │
│ │  │ │     │ • Email campaigns               │     │ • Ticket management    │   │ │
│ │  │ │     │ • Analytics                     │     │ • Communication       │   │ │
│ │  │ └─────┘ • Personalization               └─────┘ • Feedback collection  │   │ │
│ │  │                                                                         │   │ │
│ │  │ ┌─────┐ Sales                           ┌─────┐ Operations             │   │ │
│ │  │ │     │ • Lead management               │     │ • Order processing    │   │ │
│ │  │ │     │ • CRM                           │     │ • Inventory           │   │ │
│ │  │ └─────┘ • Contract management           └─────┘ • Logistics            │   │ │
│ │  │                                                                         │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ Data Storage Locations                                                 │   │ │
│ │  ├─────────────────────────────────────────────────────────────────────────┤   │ │
│ │  │                                                                         │   │ │
│ │  │ ┌─────┐ Cloud Services                  ┌─────┐ On-premise Servers     │   │ │
│ │  │ │     │ • AWS                           │     │ • Local database      │   │ │
│ │  │ │     │ • Azure                         │     │ • File servers        │   │ │
│ │  │ └─────┘ • Google Cloud                  └─────┘ • Backup systems      │   │ │
│ │  │                                                                         │   │ │
│ │  │ ┌─────┐ Third-party Services            ┌─────┐ Employee Devices       │   │ │
│ │  │ │     │ • CRM platforms                 │     │ • Laptops             │   │ │
│ │  │ │     │ • Payment processors            │     │ • Mobile devices      │   │ │
│ │  │ └─────┘ • Analytics tools               └─────┘ • USBs                 │   │ │
│ │  │                                                                         │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│ [Save Progress] [Previous] [Next: Policy Generation]                                │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 4. Task Management Interface - Detailed Mockup

### Task List View
```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ ┌─────┐                                                                             │
│ │Logo │ ComplyFlow                              [Search...] [Notifications] [User ▼]│
│ └─────┘                                                                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ Tasks • All                                                                         │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Filters & Views                                                                 │ │
│ ├─────────────────────────────────────────────────────────────────────────────────┤ │
│ │                                                                                 │ │
│ │ [All Tasks] [Assigned to Me] [Overdue] [High Priority]                         │ │
│ │                                                                                 │ │
│ │ Status: [All ▼]      Priority: [All ▼]      Regulation: [All ▼]                 │ │
│ │                                                                                 │ │
│ │ Sort by: [Due Date ▼]                                                           │ │
│ │                                                                                 │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Task List                                                                       │ │
│ ├─────────────────────────────────────────────────────────────────────────────────┤ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ ⚠️ HIGH PRIORITY • DUE TODAY                                            │   │ │
│ │  │ Update Privacy Policy                                                    │   │ │
│ │  │ GDPR • Data Processing • Documentation                                  │   │ │
│ │  │ ──────────────────────────────────────────────────────────────────────  │   │ │
│ │  │ Assigned to: Sarah Chen                                                  │   │ │
│ │  │ Due: Today • 2 hours remaining                                           │   │ │
│ │  │ Progress: ████████████████████████████████████░░ 80%                    │   │ │
│ │  │                                                                         │   │ │
│ │  │ [Mark Complete] [Add Comment] [Reschedule]                             │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ ⚠️ HIGH PRIORITY • DUE TOMORROW                                         │   │ │
│ │  │ Data Protection Officer Appointment                                      │   │ │
│ │  │ GDPR • Governance • Legal                                                │   │ │
│ │  │ ──────────────────────────────────────────────────────────────────────  │   │ │
│ │  │ Assigned to: Legal Team                                                  │   │ │
│ │  │ Due: Tomorrow                                                            │   │ │
│ │  │ Progress: █████████████░░░░░░░░░░░░░░░░░░░░░░░░ 30%                      │   │ │
│ │  │                                                                         │   │ │
│ │  │ [Mark Complete] [Add Comment] [Reschedule]                             │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ ⚠️ MEDIUM PRIORITY • DUE IN 3 DAYS                                      │   │ │
│ │  │ Employee Training Completion                                             │   │ │
│ │  │ GDPR • Awareness • Training                                             │   │ │
│ │  │ ──────────────────────────────────────────────────────────────────────  │   │ │
│ │  │ Assigned to: HR Department                                              │   │ │
│ │  │ Due: 3 days                                                             │   │ │
│ │  │ Progress: ████████████████████████████████████████ 100%                 │   │ │
│ │  │                                                                         │   │ │
│ │  │ ✅ Completed • Awaiting Review                                          │   │ │
│ │  │ [Review] [Add Comment]                                                  │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ ⚠️ LOW PRIORITY • DUE IN 7 DAYS                                        │   │ │
│ │  │ Security Risk Assessment                                                │   │ │
│ │  │ GDPR • Security • Assessment                                            │   │ │
│ │  │ ──────────────────────────────────────────────────────────────────────  │   │ │
│ │  │ Assigned to: IT Department                                              │   │ │
│ │  │ Due: 7 days                                                             │   │ │
│ │  │ Progress: █████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 25%                  │   │ │
│ │  │                                                                         │   │ │
│ │  │ [Mark Complete] [Add Comment] [Reschedule]                             │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│ [Create New Task] [Export Tasks] [Bulk Actions ▼]                                   │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Task Detail View
```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ ┌─────┐                                                                             │
│ │Logo │ ComplyFlow                              [Search...] [Notifications] [User ▼]│
│ └─────┘                                                                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ Tasks • Update Privacy Policy                                                       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Task Details                                                                    │ │
│ ├─────────────────────────────────────────────────────────────────────────────────┤ │
│ │                                                                                 │ │
│ │  Title: Update Privacy Policy                                                   │ │
│ │  Description: Review and update the company privacy policy to ensure GDPR       │ │
│ │  compliance. Include new data processing activities and contact information.   │ │
│ │                                                                                 │ │
│ │  Priority: ⚠️ HIGH                                                             │ │
│ │  Status: In Progress                                                            │ │
│ │  Regulation: GDPR • Data Processing • Documentation                              │ │
│ │  Due Date: Today • 2 hours remaining                                            │ │
│ │  Created: 5 days ago                                                            │ │
│ │  Last Updated: 1 hour ago                                                       │ │
│ │                                                                                 │ │
│ │  Assigned To: Sarah Chen                                                        │ │
│ │  Created By: Compliance Bot                                                     │ │
│ │                                                                                 │ │
│ │  Progress: ████████████████████████████████████░░ 80%                          │ │
│ │                                                                                 │ │
│ │  Checklist:                                                                     │ │
│ │  [✓] Review current privacy policy                                             │ │
│ │  [✓] Identify new data processing activities                                   │ │
│ │  [✓] Update contact information for DPO                                        │ │
│ │  [ ] Add data retention periods                                                │ │
│ │  [ ] Include data subject rights information                                   │ │
│ │  [ ] Final review by legal team                                               │ │
│ │                                                                                 │ │
│ │  Attachments:                                                                   │ │
│ │  • privacy_policy_v1.docx                                                       │ │
│ │  • gdpr_checklist.pdf                                                          │ │
│ │  • data_processing_agreement.pdf                                               │ │
│ │                                                                                 │ │
│ │  [Upload File] [View All Attachments]                                          │ │
│ │                                                                                 │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Activity & Comments                                                            │ │
│ ├─────────────────────────────────────────────────────────────────────────────────┤ │
│ │                                                                                 │ │
│ │  Today, 10:30 AM • Sarah Chen                                                  │ │
│ │  Updated checklist item "Review current privacy policy" to complete             │ │
│ │                                                                                 │
│ │  Today, 9:45 AM • Legal Team                                                   │ │
│ │  Added comment: "Please ensure we include the new data processing              │ │
│ │  agreement terms in section 4.2"                                               │ │
│ │                                                                                 │
│ │  Yesterday, 3:15 PM • Compliance Bot                                           │ │
│ │  Task created automatically based on GDPR assessment results                   │ │
│ │                                                                                 │
│ │  [Add Comment...]                                                              │ │
│ │                                                                                 │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│ [Mark Complete] [Reschedule] [Add Checklist Item] [Share Task]                      │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 5. Document Management Interface

### Document Library
```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ ┌─────┐                                                                             │
│ │Logo │ ComplyFlow                              [Search...] [Notifications] [User ▼]│
│ └─────┘                                                                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ Documents • Library                                                                 │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Document Categories                                                             │ │
│ ├─────────────────────────────────────────────────────────────────────────────────┤ │
│ │                                                                                 │ │
│ │ [All Documents] [GDPR] [CCPA] [HIPAA] [Templates] [Archived]                    │ │
│ │                                                                                 │ │
│ │ Sort by: [Recent ▼]      Filter by: [Status ▼]      Search: [_________]         │ │
│ │                                                                                 │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Document Grid                                                                   │ │
│ ├─────────────────────────────────────────────────────────────────────────────────┤ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ 📄 Privacy Policy v2.1                                                 │   │ │
│ │  │ GDPR • Policy • Approved                                              │   │ │
│ │  │ ──────────────────────────────────────────────────────────────────────  │   │ │
│ │  │ Last modified: Today, 11:30 AM                                         │   │ │
│ │  │ Size: 245 KB                                                           │   │ │
│ │  │ Status: ✅ Approved                                                    │   │ │
│ │  │                                                                         │   │ │
│ │  │ [View] [Download] [Share]                                              │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ 📄 Data Processing Agreement                                           │   │ │
│ │  │ GDPR • Agreement • Draft                                              │   │ │
│ │  │ ──────────────────────────────────────────────────────────────────────  │   │ │
│ │  │ Last modified: Yesterday, 3:45 PM                                      │   │ │
│ │  │ Size: 189 KB                                                           │   │ │
│ │  │ Status: 🔄 In Review                                                   │   │ │
│ │  │                                                                         │   │ │
│ │  │ [View] [Download] [Share]                                              │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ 📄 Employee Training Materials                                         │   │ │
│ │  │ GDPR • Training • Final                                               │   │ │
│ │  │ ──────────────────────────────────────────────────────────────────────  │   │ │
│ │  │ Last modified: 3 days ago                                              │   │ │
│ │  │ Size: 3.2 MB                                                          │   │ │
│ │  │ Status: ✅ Approved                                                    │   │ │
│ │  │                                                                         │   │ │
│ │  │ [View] [Download] [Share]                                              │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ 📄 Incident Response Plan                                              │   │ │
│ │  │ GDPR • Procedure • Needs Update                                        │   │ │
│ │  │ ──────────────────────────────────────────────────────────────────────  │   │ │
│ │  │ Last modified: 1 week ago                                               │   │ │
│ │  │ Size: 412 KB                                                           │   │ │
│ │  │ Status: ⚠️ Needs Update                                                │   │ │
│ │  │                                                                         │   │ │
│ │  │ [View] [Download] [Share]                                              │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ 📄 Records of Processing Activities                                    │   │ │
│ │  │ GDPR • Record • Template                                              │   │ │
│ │  │ ──────────────────────────────────────────────────────────────────────  │   │ │
│ │  │ Last modified: 2 weeks ago                                             │   │ │
│ │  │ Size: 128 KB                                                           │   │ │
│ │  │ Status: 📝 Template                                                    │   │ │
│ │  │                                                                         │   │ │
│ │  │ [Use Template] [Download] [Share]                                      │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ ＋ Upload New Document                                                 │   │ │
│ │  │                                                                         │   │ │
│ │  │ Drag and drop files here or click to browse                             │   │ │
│ │  │ Supported formats: PDF, DOCX, XLSX, PPTX                               │   │ │
│ │  │ Max size: 50 MB                                                        │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│ [New Folder] [Bulk Actions ▼] [Export Library]                                      │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 6. Team Collaboration Interface

### Team Overview
```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ ┌─────┐                                                                             │
│ │Logo │ ComplyFlow                              [Search...] [Notifications] [User ▼]│
│ └─────┘                                                                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ Team • Overview                                                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Team Members                                                                     │ │
│ ├─────────────────────────────────────────────────────────────────────────────────┤ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ 👤 Sarah Chen                                                          │   │ │
│ │  │ Compliance Manager                                                     │   │ │
│ │  │ sarah@company.com                                                      │   │ │
│ │  │ ──────────────────────────────────────────────────────────────────────  │   │ │
│ │  │ Active Tasks: 5                                                        │   │ │
│ │  │ Completion Rate: 92%                                                   │   │ │
│ │  │ Last Active: Today, 11:45 AM                                           │   │ │
│ │  │                                                                         │   │ │
│ │  │ [Message] [Assign Task] [View Profile]                                 │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ 👤 Alex Johnson                                                        │   │ │
│ │  │ IT Security Officer                                                    │   │ │
│ │  │ alex@company.com                                                       │   │ │
│ │  │ ──────────────────────────────────────────────────────────────────────  │   │ │
│ │  │ Active Tasks: 3                                                        │   │ │
│ │  │ Completion Rate: 85%                                                   │   │ │
│ │  │ Last Active: Today, 10:30 AM                                           │   │ │
│ │  │                                                                         │   │ │
│ │  │ [Message] [Assign Task] [View Profile]                                 │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ 👤 Jamie Wilson                                                         │   │ │
│ │  │ Data Protection Officer                                                 │   │ │
│ │  │ jamie@company.com                                                       │   │ │
│ │  │ ──────────────────────────────────────────────────────────────────────  │   │ │
│ │  │ Active Tasks: 2                                                        │   │ │
│ │  │ Completion Rate: 100%                                                  │   │ │
│ │  │ Last Active: Yesterday, 4:15 PM                                         │   │ │
│ │  │                                                                         │   │ │
│ │  │ [Message] [Assign Task] [View Profile]                                 │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ 👤 Marketing Team                                                        │   │ │
│ │  │ Team • 4 members                                                        │   │ │
│ │  │ marketing@company.com                                                   │   │ │
│ │  │ ──────────────────────────────────────────────────────────────────────  │   │ │
│ │  │ Active Tasks: 7                                                        │   │ │
│ │  │ Completion Rate: 78%                                                   │   │ │
│ │  │ Last Active: Today, 9:00 AM                                             │   │ │
│ │  │                                                                         │   │ │
│ │  │ [Message] [Assign Task] [View Team]                                     │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ ＋ Invite Team Member                                                   │   │ │
│ │  │                                                                         │   │ │
│ │  │ Add new team members to collaborate on compliance tasks                │   │ │
│ │  │                                                                         │   │ │
│ │  │ [Invite by Email] [Generate Invite Link]                                │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Team Activity                                                                    │ │
│ ├─────────────────────────────────────────────────────────────────────────────────┤ │
│ │                                                                                 │ │
│ │  Today                                                                          │ │
│ │  • Sarah updated Privacy Policy v2.1                                            │ │
│ │  • Alex completed Data Mapping Exercise                                         │ │
│ │  • Jamie reviewed Security Assessment                                          │ │
│ │                                                                                 │ │
│ │  Yesterday                                                                      │ │
│ │  • Marketing Team uploaded new Cookie Policy                                    │ │
│ │  • Legal Team commented on Data Processing Agreement                           │ │
│ │  • IT Department started Security Risk Assessment                              │ │
│ │                                                                                 │ │
│ │  This Week                                                                      │ │
│ │  • Team compliance score increased by 12%                                      │ │
│ │  • 15 tasks completed                                                          │ │
│ │  • 3 new documents added to library                                            │ │
│ │                                                                                 │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│ [New Message] [Schedule Meeting] [Team Reports]                                     │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 7. Mobile Responsive Designs

### Mobile Dashboard View
```
┌─────────────────────────────────────────────────────────────┐
│ [Menu] ComplyFlow                     [Notifications] [🔍] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Welcome back, Sarah!                                        │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Compliance Score: 68%                              │ │
│ │ ▲ 12% from last month                              │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Urgent Tasks (2)                                   │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ ⚠️ Update Privacy Policy                           │ │
│ │   Due: Today • GDPR                               │ │
│ │                                                    │ │
│ │ ⚠️ DPO Appointment                                │ │
│ │   Due: Tomorrow • GDPR                            │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Quick Actions                                       │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ [➕ New Task] [📄 Documents] [👥 Team] [⚙️ Settings]│ │
│ └─────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Recent Activity                                     │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ • Alex completed Data Mapping                       │ │
│ │ • Privacy Policy updated                            │ │
│ │ • Compliance score +12%                             │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                             │
│ [Dashboard] [Tasks] [Documents] [Team] [More]              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Mobile Task Detail View
```
┌─────────────────────────────────────────────────────────────┐
│ ← Tasks            Update Privacy Policy                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Update Privacy Policy                                       │
│ ⚠️ HIGH • Due Today • GDPR                               │
│                                                             │
│ Review and update the company privacy policy to ensure      │
│ GDPR compliance. Include new data processing activities     │
│ and contact information.                                   │
│                                                             │
│ Progress: 80%                                               │
│ ████████████████████████████████████░░                     │
│                                                             │
│ Checklist:                                                  │
│ ✓ Review current privacy policy                            │
│ ✓ Identify new data processing activities                  │
│ ✓ Update contact information for DPO                       │
│ □ Add data retention periods                               │
│ □ Include data subject rights information                  │
│ □ Final review by legal team                               │
│                                                             │
│ Assigned to: Sarah Chen                                    │
│                                                             │
│ [Mark Complete] [Reschedule] [Add Comment]                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Comments                                                    │
├─────────────────────────────────────────────────────────────┤
│ Today, 10:30 AM • Sarah Chen                              │
│ Updated checklist item                                     │
│                                                             │
│ Today, 9:45 AM • Legal Team                               │
│ Please ensure we include the new data processing           │
│ agreement terms in section 4.2                            │
│                                                             │
│ [Add a comment...]                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 8. Settings & Configuration

### Account Settings
```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ ┌─────┐                                                                             │
│ │Logo │ ComplyFlow                              [Search...] [Notifications] [User ▼]│
│ └─────┘                                                                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ Settings • Account                                                                   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Profile Information                                                             │ │
│ ├─────────────────────────────────────────────────────────────────────────────────┤ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ Name: Sarah Chen                                                       │   │ │
│ │  │ Email: sarah@company.com                                               │   │ │
│ │  │ Role: Compliance Manager                                                │   │ │
│ │  │ Phone: +1 (555) 123-4567                                               │   │ │
│ │  │                                                                         │   │ │
│ │  │ [Edit Profile]                                                          │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Notification Preferences                                                        │ │
│ ├─────────────────────────────────────────────────────────────────────────────────┤ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ Email Notifications                                                     │   │ │
│ │  │ [✓] Task assignments                                                   │   │ │
│ │  │ [✓] Due date reminders                                                 │   │ │
│ │  │ [✓] Document approvals                                                 │   │ │
│ │  │ [ ] Weekly compliance reports                                          │   │ │
│ │  │                                                                         │   │ │
│ │  │ Push Notifications                                                      │   │ │
│ │  │ [✓] Urgent tasks                                                       │   │ │
│ │  │ [✓] Team mentions                                                      │   │ │
│ │  │ [ ] All task updates                                                   │   │ │
│ │  │                                                                         │   │ │
│ │  │ Frequency: Daily                                                        │   │ │
│ │  │                                                                         │   │ │
│ │  │ [Save Preferences]                                                      │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Security & Access                                                               │ │
│ ├─────────────────────────────────────────────────────────────────────────────────┤ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ Two-Factor Authentication                                              │   │ │
│ │  │ Status: Enabled                                                         │   │ │
│ │  │ Last used: Today, 9:30 AM                                               │   │ │
│ │  │                                                                         │   │ │
│ │  │ [Manage 2FA]                                                            │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ Session Management                                                      │   │ │
│ │  │ Active sessions: 3                                                      │   │ │
│ │  │ Last login: Today, 8:45 AM from Chrome on Windows                       │   │ │
│ │  │                                                                         │   │ │
│ │  │ [View All Sessions] [Log Out Other Devices]                              │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ API Access                                                              │   │ │
│ │  │ Status: Disabled                                                         │   │ │
│ │  │                                                                         │   │ │
│ │  │ [Enable API] [Generate Token]                                           │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│ ┌─────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Billing & Subscription                                                          │ │
│ ├─────────────────────────────────────────────────────────────────────────────────┤ │
│ │                                                                                 │ │
│ │  ┌─────────────────────────────────────────────────────────────────────────┐   │ │
│ │  │ Current Plan: Business                                                  │   │ │
│ │  │ Price: $299/month                                                       │   │ │
│ │  │ Next billing: May 15, 2026                                              │   │ │
│ │  │ Users: 10/15                                                            │   │ │
│ │  │ Storage: 45GB/100GB                                                     │   │ │
│ │  │                                                                         │   │ │
│ │  │ [Change Plan] [Update Payment Method]                                   │   │ │
│ │  └─────────────────────────────────────────────────────────────────────────┘   │ │
│ │                                                                                 │ │
│ └─────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
│ [Save Changes]                                                                      │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## 9. Responsive Design Notes

### Mobile Navigation Pattern
- **Bottom Navigation Bar** (for primary navigation)
- **Hamburger Menu** for secondary navigation
- **Swipe gestures** for navigating between dashboard widgets
- **Card-based layouts** instead of tables

### Tablet Optimization
- **Two-column layouts** where appropriate
- **Larger touch targets** for interactive elements
- **Split-screen views** for document editing
- **Adaptive typography** scaling

### Desktop Enhancements
- **Multi-column dashboards** with more data density
- **Side-by-side comparisons** of compliance status
- **Advanced filtering** and sorting options
- **Keyboard shortcuts** for power users

## 10. Interactive Elements & Microinteractions

### Progress Indicators
- **Animated progress bars** when tasks are completed
- **Pulse animations** for new notifications
- **Smooth transitions** between workflow steps
- **Loading states** with skeleton screens

### Feedback Mechanisms
- **Success toast notifications** when actions complete
- **Error messages** with specific guidance
- **Confirmation dialogs** for destructive actions
- **Tooltips** for complex terms and regulations

### Accessibility Features
- **Focus management** for keyboard navigation
- **Screen reader announcements** for status changes
- **High contrast mode** toggle
- **Text size adjustment** controls

## 11. High-Fidelity Design Specifications

### Dashboard Components with Real Colors & Spacing

**Compliance Score Card (Detailed Spec):**
```
Background: #FFFFFF
Border: 1px solid #E5E7EB
Border Radius: 12px
Padding: 24px
Shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1)

Score Circle:
- Size: 120px diameter
- Stroke Width: 8px
- Colors based on score:
  • 0-49: #EF4444 (Red)
  • 50-79: #F59E0B (Yellow)
  • 80-100: #10B981 (Green)
- Animation: Count-up from 0 to score over 1.5s
- Inner Text: Score number (48px, #1F2937, Bold)
- Subtext: "Overall Score" (16px, #6B7280)

Trend Indicator:
- Up Arrow: #10B981 with "+12%" text
- Down Arrow: #EF4444 with "-5%" text
- Font: 14px, #6B7280
```

**Task Card (Detailed Spec):**
```
Background: #FFFFFF
Border: 1px solid #E5E7EB
Border Radius: 8px
Padding: 16px
Margin Bottom: 12px
Hover State: Background #F9FAFB, Border #D1D5DB

Priority Badge:
- High: Background #FEF2F2, Text #991B1B, Border #FCA5A5
- Medium: Background #FFFBEB, Text #92400E, Border #FBBF24
- Low: Background #F0FDF4, Text #065F46, Border #34D399

Progress Bar:
- Height: 4px
- Background: #E5E7EB
- Progress Fill: #3B82F6
- Border Radius: 2px
- Animation: Smooth width transition over 300ms

Due Date Indicator:
- Today: #DC2626 (Red)
- Tomorrow: #F59E0B (Yellow)
- Future: #6B7280 (Gray)
```

**Data Visualization Colors:**
```
GDPR: #2563EB (Blue)
CCPA: #8B5CF6 (Purple)
HIPAA: #10B981 (Green)
PCI DSS: #F59E0B (Yellow)
Other: #6B7280 (Gray)

Chart Background: #F9FAFB
Grid Lines: #E5E7EB
Data Points: Respective regulation colors
Tooltip: #1F2937 background, #FFFFFF text
```

### Typography Implementation
```
Font Family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif

Headings:
- H1: 32px, 40px line-height, #1F2937, Font Weight 700
- H2: 24px, 32px line-height, #1F2937, Font Weight 600
- H3: 20px, 28px line-height, #1F2937, Font Weight 600

Body Text:
- Large: 18px, 28px line-height, #374151
- Regular: 16px, 24px line-height, #374151
- Small: 14px, 20px line-height, #6B7280

Labels & Captions:
- Label: 14px, 20px line-height, #6B7280, Font Weight 500
- Caption: 12px, 16px line-height, #9CA3AF
```

### Interactive States
```
Button States:
- Default: Background #3B82F6, Text #FFFFFF
- Hover: Background #2563EB
- Active: Background #1D4ED8
- Disabled: Background #93C5FD, Text #FFFFFF

Input States:
- Default: Border #D1D5DB, Background #FFFFFF
- Focus: Border #3B82F6, Box Shadow 0 0 0 3px rgba(59, 130, 246, 0.1)
- Error: Border #EF4444, Text #DC2626
- Success: Border #10B981, Text #059669

Card States:
- Default: Background #FFFFFF, Border #E5E7EB
- Hover: Background #F9FAFB, Border #D1D5DB, Shadow 0 4px 6px -1px rgba(0, 0, 0, 0.1)
- Selected: Background #EFF6FF, Border #3B82F6
```

### Animation Timings
```
Page Transitions: 300ms ease-in-out
Modal Entrances: 200ms ease-out
Toast Notifications: 400ms ease-in-out
Progress Animations: 1500ms ease-out
Hover Effects: 150ms ease-in-out
Focus Rings: 100ms ease-in-out
```

### Icon Specifications
```
Size Scale:
- Small: 16px
- Medium: 20px
- Large: 24px
- X-Large: 32px

Colors:
- Primary: #3B82F6
- Secondary: #6B7280
- Success: #10B981
- Warning: #F59E0B
- Error: #EF4444
- Disabled: #9CA3AF

Stroke Width:
- Regular: 1.5px
- Bold: 2px
- Light: 1px
```

## 12. Design Tokens (CSS Variables)

```css
:root {
  /* Colors - Primary */
  --color-primary-50: #EFF6FF;
  --color-primary-100: #DBEAFE;
  --color-primary-200: #BFDBFE;
  --color-primary-300: #93C5FD;
  --color-primary-400: #60A5FA;
  --color-primary-500: #3B82F6;
  --color-primary-600: #2563EB;
  --color-primary-700: #1D4ED8;
  --color-primary-800: #1E40AF;
  --color-primary-900: #1E3A8A;

  /* Colors - Neutral */
  --color-gray-50: #F9FAFB;
  --color-gray-100: #F3F4F6;
  --color-gray-200: #E5E7EB;
  --color-gray-300: #D1D5DB;
  --color-gray-400: #9CA3AF;
  --color-gray-500: #6B7280;
  --color-gray-600: #4B5563;
  --color-gray-700: #374151;
  --color-gray-800: #1F2937;
  --color-gray-900: #111827;

  /* Colors - Status */
  --color-success-50: #F0FDF4;
  --color-success-100: #DCFCE7;
  --color-success-200: #BBF7D0;
  --color-success-300: #86EFAC;
  --color-success-400: #4ADE80;
  --color-success-500: #22C55E;
  --color-success-600: #16A34A;
  --color-success-700: #15803D;
  --color-success-800: #166534;
  --color-success-900: #14532D;

  --color-warning-50: #FFFBEB;
  --color-warning-100: #FEF3C7;
  --color-warning-200: #FDE68A;
  --color-warning-300: #FCD34D;
  --color-warning-400: #FBBF24;
  --color-warning-500: #F59E0B;
  --color-warning-600: #D97706;
  --color-warning-700: #B45309;
  --color-warning-800: #92400E;
  --color-warning-900: #78350F;

  --color-error-50: #FEF2F2;
  --color-error-100: #FEE2E2;
  --color-error-200: #FECACA;
  --color-error-300: #FCA5A5;
  --color-error-400: #F87171;
  --color-error-500: #EF4444;
  --color-error-600: #DC2626;
  --color-error-700: #B91C1C;
  --color-error-800: #991B1B;
  --color-error-900: #7F1D1D;

  /* Typography */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 20px;
  --font-size-2xl: 24px;
  --font-size-3xl: 30px;
  --font-size-4xl: 36px;

  /* Spacing */
  --spacing-px: 1px;
  --spacing-0: 0;
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 20px;
  --spacing-6: 24px;
  --spacing-8: 32px;
  --spacing-10: 40px;
  --spacing-12: 48px;
  --spacing-16: 64px;
  --spacing-20: 80px;
  --spacing-24: 96px;

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  --shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

  /* Transitions */
  --transition-fast: 150ms ease-in-out;
  --transition-normal: 300ms ease-in-out;
  --transition-slow: 500ms ease-in-out;
}
```

This completes the high-fidelity mockups and design specifications for the ComplyFlow dashboard interface. The designs follow the established design system and component specifications, providing detailed visual guidance for implementation.