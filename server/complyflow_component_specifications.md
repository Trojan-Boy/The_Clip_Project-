HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'unstyled';
}
```

**Design Specifications:**
- **Default:** White background, gray border, focus blue border
- **Filled:** Light gray background, no border
- **Unstyled:** No background, no border

**States:**
- **Focus:** Blue border with ring shadow
- **Error:** Red border with error message below
- **Disabled:** Gray background, lighter text
- **Read Only:** Gray background, normal text

#### Select Dropdown
```typescript
interface SelectProps {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
}
```

**Design Specifications:**
- **Dropdown:** White background, shadow, max-height 200px
- **Option Hover:** Light blue background
- **Option Selected:** Blue background, white text
- **Chevron Icon:** Rotates on open/close

#### Checkbox & Radio
```typescript
interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}
```

**Design Specifications:**
- **Default:** Gray border, white background
- **Checked:** Blue background, white checkmark
- **Disabled:** Lighter colors, no interaction
- **Focus:** Blue ring outline

## 3. Dashboard Components

### Compliance Score Card
```typescript
interface ScoreCardProps {
  score: number; // 0-100
  title: string;
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  size?: 'sm' | 'md' | 'lg';
}
```

**Design Specifications:**
- **Circular Progress:** SVG with gradient based on score
- **Score Colors:** Red (0-49), Yellow (50-79), Green (80-100)
- **Trend Indicator:** Up/down arrow with percentage
- **Animation:** Score number count-up on load

### Task Card
```typescript
interface TaskCardProps {
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: Date;
  assignee?: {
    name: string;
    avatar?: string;
  };
  progress?: number; // 0-100
  status: 'not-started' | 'in-progress' | 'completed' | 'overdue';
  onComplete?: () => void;
  onEdit?: () => void;
}
```

**Design Specifications:**
- **Priority Badges:** Red (high), Yellow (medium), Green (low)
- **Status Indicators:** Color-coded dots or icons
- **Progress Bar:** Thin bar below title
- **Hover State:** Slight elevation increase
- **Actions:** Hover-reveal action buttons

### Data Table
```typescript
interface DataTableProps<T> {
  columns: Array<{
    key: string;
    title: string;
    width?: string;
    sortable?: boolean;
    render?: (value: any, row: T) => React.ReactNode;
  }>;
  data: T[];
  onRowClick?: (row: T) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  selection?: {
    selectedRows: T[];
    onSelectionChange: (rows: T[]) => void;
  };
}
```

**Design Specifications:**
- **Striped Rows:** Alternate row backgrounds for readability
- **Hover State:** Light blue background on row hover
- **Selected State:** Blue background with checkmark
- **Sort Indicators:** Arrow icons in column headers
- **Mobile View:** Stacked cards instead of table

## 4. Navigation Components

### Top Navigation Bar
```typescript
interface NavBarProps {
  logo: React.ReactNode;
  navItems: Array<{
    label: string;
    href: string;
    icon?: React.ReactNode;
    badge?: number;
  }>;
  userMenu: {
    name: string;
    email: string;
    avatar?: string;
    menuItems: Array<{
      label: string;
      onClick: () => void;
      icon?: React.ReactNode;
    }>;
  };
  searchBar?: {
    placeholder: string;
    onSearch: (query: string) => void;
  };
}
```

**Design Specifications:**
- **Fixed Position:** Sticks to top of viewport
- **Background:** White with subtle shadow
- **Active Nav Item:** Blue underline indicator
- **User Menu Dropdown:** Shadow, rounded corners
- **Mobile:** Hamburger menu, collapsible navigation

### Sidebar Navigation
```typescript
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  items: Array<{
    label: string;
    href: string;
    icon: React.ReactNode;
    badge?: number;
    children?: Array<{
      label: string;
      href: string;
    }>;
  }>;
  collapsed?: boolean;
}
```

**Design Specifications:**
- **Collapsible:** Can be minimized to icons only
- **Active Item:** Blue background, white text
- **Nested Items:** Indented with smaller font
- **Badges:** Red dot or number count
- **Mobile:** Full-screen overlay

## 5. Layout Components

### Dashboard Grid
```typescript
interface DashboardGridProps {
  columns: 1 | 2 | 3 | 4;
  gap: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}
```

**Responsive Behavior:**
- **Desktop:** Full column count
- **Tablet:** Reduced to 2 columns
- **Mobile:** Single column

### Modal/Dialog
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}
```

**Design Specifications:**
- **Overlay:** Semi-transparent black background
- **Animation:** Fade in/out with scale
- **Focus Trap:** Keyboard navigation within modal
- **Escape Key:** Closes modal
- **Size Variants:** sm=400px, md=600px, lg=800px, xl=1000px

### Empty State
```typescript
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

**Design Specifications:**
- **Centered Layout:** Vertical and horizontal center
- **Illustration:** Custom SVG or icon
- **Action Button:** Primary button below description
- **Subtle Animation:** Gentle floating animation on icon

## 6. Compliance-Specific Components

### Regulation Progress Card
```typescript
interface RegulationProgressProps {
  regulation: 'GDPR' | 'CCPA' | 'HIPAA' | string;
  progress: number; // 0-100
  requirements: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
  };
  nextDeadline?: Date;
  onViewDetails?: () => void;
}
```

**Design Specifications:**
- **Regulation Icon:** Custom icon for each regulation
- **Progress Visualization:** Circular or horizontal bar
- **Requirement Breakdown:** Small pills with counts
- **Deadline Warning:** Red text if within 7 days

### Risk Assessment Widget
```typescript
interface RiskWidgetProps {
  score: number; // 0-100
  categories: Array<{
    name: string;
    score: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  recommendations: Array<{
    title: string;
    priority: 'high' | 'medium' | 'low';
    impact: string;
  }>;
}
```

**Design Specifications:**
- **Risk Score:** Large number with color coding
- **Category Bars:** Horizontal bars for each category
- **Trend Arrows:** Up/down arrows with color coding
- **Recommendation Cards:** Expandable cards with details

## 7. Implementation Guidelines

### Component Structure
```
src/components/
├── core/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.stories.tsx
│   │   ├── Button.test.tsx
│   │   └── index.ts
│   ├── Card/
│   └── ...
├── forms/
│   ├── Input/
│   ├── Select/
│   └── ...
├── dashboard/
│   ├── ScoreCard/
│   ├── TaskCard/
│   └── ...
├── navigation/
│   ├── NavBar/
│   ├── Sidebar/
│   └── ...
└── compliance/
    ├── RegulationProgress/
    ├── RiskWidget/
    └── ...
```

### Styling Approach
1. **CSS-in-JS:** Use Emotion or Styled Components
2. **Design Tokens:** Import from centralized token file
3. **Theme Provider:** Wrap app with theme context
4. **Responsive:** Use media query hooks/components

### Accessibility Requirements
1. **Keyboard Navigation:** All interactive elements focusable
2. **ARIA Labels:** Proper labels for screen readers
3. **Color Contrast:** Minimum 4.5:1 ratio
4. **Focus Management:** Visible focus indicators
5. **Skip Links:** For keyboard users to skip navigation

### Performance Considerations
1. **Code Splitting:** Lazy load non-critical components
2. **Memoization:** Use React.memo for expensive components
3. **Virtualization:** For long lists/tables
4. **Image Optimization:** Lazy loading, proper formats

## 8. Component States & Interactions

### Loading States
```typescript
// Skeleton screens for initial load
interface SkeletonProps {
  type: 'text' | 'card' | 'table' | 'dashboard';
  count?: number;
}

// Loading spinners
interface SpinnerProps {
  size: 'sm' | 'md' | 'lg';
  color?: string;
}
```

### Error States
```typescript
interface ErrorStateProps {
  title: string;
  message: string;
  retryAction?: () => void;
  icon?: React.ReactNode;
}
```

### Success States
```typescript
interface SuccessToastProps {
  message: string;
  duration?: number;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

## 9. Testing Requirements

### Unit Tests
- Component rendering with different props
- Event handlers fire correctly
- State changes trigger re-renders
- Conditional rendering works as expected

### Integration Tests
- Form submission flows
- Navigation between pages
- Data fetching and display
- User interactions across components

### Visual Regression Tests
- Component appearance across browsers
- Responsive behavior at breakpoints
- Dark mode/light mode switching
- Accessibility color contrast

## 10. Handoff Checklist

### Design Handoff
- [ ] All design tokens documented
- [ ] Component specifications complete
- [ ] Interactive prototypes available
- [ ] Responsive breakpoints defined
- [ ] Accessibility requirements listed

### Development Ready
- [ ] Component API interfaces defined
- [ ] State management patterns documented
- [ ] Performance considerations noted
- [ ] Testing requirements specified
- [ ] Browser support requirements listed

### Collaboration Points
- [ ] API contract with backend team
- [ ] Component library setup
- [ ] Storybook documentation
- [ ] Design system integration
- [ ] Continuous deployment pipeline