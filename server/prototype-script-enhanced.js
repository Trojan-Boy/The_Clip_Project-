// ComplyFlow Interactive Prototype - Enhanced JavaScript
// Updated with accessibility features, form validation, and improved user experience

// Global state
let selectedRegulations = [];
let onboardingStep = 1;
let userTestingScenario = null;
let completedTasks = [];
let userActions = [];
let formErrors = {};

// Initialize the prototype
document.addEventListener('DOMContentLoaded', function() {
    initializePrototype();
    setupEventListeners();
    setupAccessibilityFeatures();
});

// Initialize prototype
function initializePrototype() {
    // Show dashboard by default
    showScreen('dashboard');
    
    // Initialize any required data
    initializeSampleData();
    
    // Announce page load for screen readers
    announceToScreenReader('ComplyFlow prototype loaded. Use Tab to navigate.');
}

// Set up event listeners
function setupEventListeners() {
    // Form validation
    document.querySelectorAll('.form-input').forEach(input => {
        input.addEventListener('blur', validateField);
        input.addEventListener('input', clearFieldError);
    });
    
    // Keyboard navigation
    document.addEventListener('keydown', handleKeyboardNavigation);
    
    // Focus trapping for modals
    document.addEventListener('focus', trapFocus, true);
}

// Set up accessibility features
function setupAccessibilityFeatures() {
    // Add skip to main content link
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.className = 'skip-to-main';
    skipLink.textContent = 'Skip to main content';
    document.body.prepend(skipLink);
    
    // Add main content landmark
    const mainContent = document.querySelector('.prototype-container');
    if (mainContent) {
        mainContent.id = 'main-content';
        mainContent.setAttribute('role', 'main');
    }
    
    // Add ARIA labels to interactive elements
    document.querySelectorAll('button').forEach(button => {
        if (!button.getAttribute('aria-label')) {
            const label = button.textContent.trim() || button.title;
            if (label) {
                button.setAttribute('aria-label', label);
            }
        }
    });
}

// Show a specific screen with accessibility improvements
function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen-container').forEach(screen => {
        screen.classList.remove('active');
        screen.setAttribute('aria-hidden', 'true');
        screen.setAttribute('tabindex', '-1');
    });
    
    // Show selected screen
    const screen = document.getElementById(`screen-${screenId}`);
    if (screen) {
        screen.classList.add('active');
        screen.setAttribute('aria-hidden', 'false');
        screen.removeAttribute('tabindex');
        
        // Focus on the first focusable element in the screen
        setTimeout(() => {
            const firstFocusable = screen.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }, 100);
    }
    
    // Update navigation
    updateNavigation(screenId);
    
    // Update page title for screen readers
    updatePageTitle(screenId);
    
    // Announce screen change for screen readers
    announceToScreenReader(`Now viewing ${getScreenName(screenId)} screen`);
    
    // Log screen change for user testing
    logUserAction('screen_change', { 
        screen: screenId, 
        screenName: getScreenName(screenId),
        timestamp: new Date().toISOString() 
    });
}

// Get human-readable screen name
function getScreenName(screenId) {
    const screenNames = {
        'dashboard': 'Dashboard',
        'onboarding': 'Onboarding',
        'regulation-selection': 'Regulation Selection',
        'compliance-workflow': 'Compliance Workflow',
        'document-management': 'Document Management',
        'team-collaboration': 'Team Collaboration',
        'settings': 'Settings'
    };
    return screenNames[screenId] || screenId;
}

// Update navigation active state
function updateNavigation(screenId) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        link.setAttribute('aria-current', 'false');
    });
    
    // Set dashboard as active for non-dashboard screens or specific screen
    if (screenId === 'dashboard') {
        const dashboardLink = document.querySelector('.nav-link[onclick*="dashboard"]');
        if (dashboardLink) {
            dashboardLink.classList.add('active');
            dashboardLink.setAttribute('aria-current', 'page');
        }
    } else {
        // For other screens, keep dashboard active or find matching nav
        const dashboardLink = document.querySelector('.nav-link[onclick*="dashboard"]');
        if (dashboardLink) {
            dashboardLink.classList.add('active');
            dashboardLink.setAttribute('aria-current', 'page');
        }
    }
}

// Update page title for screen readers
function updatePageTitle(screenId) {
    const screenTitle = document.querySelector(`#screen-${screenId} .screen-title`);
    if (screenTitle) {
        document.title = `${screenTitle.textContent} - ComplyFlow`;
    }
}

// Complete task with enhanced feedback
function completeTask(button) {
    const taskItem = button.closest('.task-item');
    const taskName = taskItem.querySelector('h4').textContent;
    const taskPriority = taskItem.querySelector('.task-priority')?.textContent || 'Unknown';
    const taskDue = taskItem.querySelector('.task-meta span:nth-child(2)')?.textContent || 'No due date';
    
    // Disable button during processing
    button.disabled = true;
    button.innerHTML = '<span class="loading"></span> Completing...';
    
    // Show loading state
    showLoading();
    
    // Simulate API call
    setTimeout(() => {
        // Update task item appearance
        taskItem.style.opacity = '0.5';
        taskItem.style.background = '#F0FDF4';
        button.textContent = 'Completed';
        button.disabled = true;
        button.classList.remove('btn-primary');
        button.classList.add('btn-success');
        
        // Hide loading
        hideLoading();
        
        // Show success notification
        showNotification(`Task "${taskName}" completed successfully!`, 'success');
        
        // Store completed task
        completedTasks.push({
            name: taskName,
            priority: taskPriority,
            due: taskDue,
            completedAt: new Date().toISOString()
        });
        
        // Announce completion for screen readers
        announceToScreenReader(`Task "${taskName}" marked as completed`);
        
        // Remove task after delay
        setTimeout(() => {
            taskItem.remove();
            updateTaskCount();
            
            // Log task completion for user testing
            logUserAction('task_completed', { 
                taskName, 
                priority: taskPriority,
                due: taskDue,
                totalCompleted: completedTasks.length 
            });
        }, 1000);
    }, 800);
}

// Update task count
function updateTaskCount() {
    const taskItems = document.querySelectorAll('.task-item:not([style*="background: #F0FDF4"])');
    const taskCount = taskItems.length;
    const titleElements = document.querySelectorAll('.card-title');
    
    titleElements.forEach(title => {
        if (title.textContent.includes('Pending Tasks')) {
            title.textContent = `Pending Tasks (${taskCount})`;
        }
    });
}

// Next onboarding step
function nextOnboardingStep() {
    const companyName = document.getElementById('companyName').value;
    const industry = document.getElementById('industry').value;
    const employeeCount = document.getElementById('employeeCount').value;
    
    // Validate all fields
    let isValid = true;
    
    if (!companyName) {
        showFieldError('companyName', 'Company name is required');
        isValid = false;
    }
    
    if (!industry) {
        showFieldError('industry', 'Industry is required');
        isValid = false;
    }
    
    if (!employeeCount) {
        showFieldError('employeeCount', 'Employee count is required');
        isValid = false;
    }
    
    if (!isValid) {
        showNotification('Please fill in all required fields before proceeding.', 'error');
        return;
    }
    
    showLoading();
    
    setTimeout(() => {
        hideLoading();
        showScreen('regulation-selection');
        
        // Update wizard steps
        updateWizardSteps(2);
        
        // Log onboarding progress
        logUserAction('onboarding_step_completed', {
            step: 1,
            companyName,
            industry,
            employeeCount,
            timestamp: new Date().toISOString()
        });
    }, 800);
}

// Previous onboarding step
function prevOnboardingStep() {
    showScreen('onboarding');
    updateWizardSteps(1);
}

// Update wizard steps
function updateWizardSteps(step) {
    document.querySelectorAll('.wizard-step').forEach((el, index) => {
        el.classList.remove('active', 'completed');
        
        if (index + 1 < step) {
            el.classList.add('completed');
        } else if (index + 1 === step) {
            el.classList.add('active');
        }
    });
}

// Toggle regulation selection
function toggleRegulation(button, regulation) {
    const isSelected = selectedRegulations.includes(regulation);
    
    if (isSelected) {
        selectedRegulations = selectedRegulations.filter(r => r !== regulation);
        button.classList.remove('btn-primary');
        button.classList.add('btn-outline');
        button.textContent = `Select ${regulation}`;
    } else {
        selectedRegulations.push(regulation);
        button.classList.remove('btn-outline');
        button.classList.add('btn-primary');
        button.textContent = `✓ ${regulation} Selected`;
    }
    
    // Update selection count
    updateRegulationCount();
    
    // Log regulation selection
    logUserAction('regulation_toggled', {
        regulation,
        selected: !isSelected,
        totalSelected: selectedRegulations.length
    });
}

// Update regulation count
function updateRegulationCount() {
    const countElement = document.getElementById('regulationCount');
    if (countElement) {
        countElement.textContent = `${selectedRegulations.length} regulations selected`;
    }
}

// Complete regulation selection
function completeRegulationSelection() {
    if (selectedRegulations.length === 0) {
        showNotification('Please select at least one regulation to continue.', 'warning');
        return;
    }
    
    showLoading();
    
    setTimeout(() => {
        hideLoading();
        showScreen('compliance-workflow');
        
        // Update wizard steps
        updateWizardSteps(3);
        
        // Show success notification
        showNotification(`Selected ${selectedRegulations.length} regulations. Starting compliance workflow...`, 'success');
        
        // Log regulation selection completion
        logUserAction('regulation_selection_completed', {
            regulations: selectedRegulations,
            count: selectedRegulations.length,
            timestamp: new Date().toISOString()
        });
    }, 800);
}

// Show loading overlay
function showLoading(message = 'Loading...') {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-content">
            <div class="loading-spinner" aria-hidden="true"></div>
            <p class="loading-message" aria-live="polite">${message}</p>
        </div>
    `;
    overlay.id = 'loading-overlay';
    document.body.appendChild(overlay);
    
    // Announce loading for screen readers
    announceToScreenReader(message);
}

// Hide loading overlay
function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(notification => {
        notification.remove();
    });
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.setAttribute('role', 'alert');
    notification.setAttribute('aria-live', 'assertive');
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()" aria-label="Close notification">
            &times;
        </button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
    
    // Log notification
    logUserAction('notification_shown', { message, type });
}

// Log user action for testing
function logUserAction(action, data = {}) {
    const actionLog = {
        action,
        data,
        timestamp: new Date().toISOString(),
        screen: document.querySelector('.screen-container.active')?.id?.replace('screen-', ''),
        userAgent: navigator.userAgent
    };
    
    userActions.push(actionLog);
    
    // In a real implementation, this would send to a backend
    console.log('User Action:', actionLog);
}

// Initialize sample data
function initializeSampleData() {
    // Sample tasks
    const sampleTasks = [
        {
            name: 'Update Privacy Policy',
            description: 'Review and update privacy policy for GDPR compliance',
            priority: 'high',
            due: '2024-04-15',
            regulation: 'GDPR'
        },
        {
            name: 'Data Processing Agreement',
            description: 'Sign data processing agreement with vendors',
            priority: 'medium',
            due: '2024-04-20',
            regulation: 'CCPA'
        },
        {
            name: 'Security Audit',
            description: 'Complete quarterly security audit',
            priority: 'low',
            due: '2024-04-30',
            regulation: 'HIPAA'
        }
    ];
    
    // Populate task list if empty
    const taskList = document.querySelector('.task-list');
    if (taskList && taskList.children.length === 0) {
        sampleTasks.forEach(task => {
            const taskItem = document.createElement('li');
            taskItem.className = 'task-item';
            taskItem.innerHTML = `
                <div class="task-content">
                    <h4 class="task-title">${task.name}</h4>
                    <p class="task-description">${task.description}</p>
                    <div class="task-meta">
                        <span class="task-priority task-priority-${task.priority}">${task.priority}</span>
                        <span>Due: ${task.due}</span>
                        <span>${task.regulation}</span>
                    </div>
                </div>
                <div class="task-actions">
                    <button class="btn btn-primary" onclick="completeTask(this)" aria-label="Complete task: ${task.name}">
                        Complete
                    </button>
                </div>
            `;
            taskList.appendChild(taskItem);
        });
    }
}

// Field validation
function validateField(event) {
    const field = event.target;
    const fieldName = field.id || field.name;
    const value = field.value.trim();
    
    // Clear previous error
    clearFieldError(event);
    
    // Required field validation
    if (field.hasAttribute('required') && !value) {
        showFieldError(fieldName, 'This field is required');
        return false;
    }
    
    // Email validation
    if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            showFieldError(fieldName, 'Please enter a valid email address');
            return false;
        }
    }
    
    // Number validation
    if (field.type === 'number' && value) {
        const min = parseFloat(field.min) || 0;
        const max = parseFloat(field.max) || Infinity;
        const numValue = parseFloat(value);
        
        if (isNaN(numValue)) {
            showFieldError(fieldName, 'Please enter a valid number');
            return false;
        }
        
        if (numValue < min || numValue > max) {
            showFieldError(fieldName, `Please enter a number between ${min} and ${max}`);
            return false;
        }
    }
    
    return true;
}

// Show field error
function showFieldError(fieldName, message) {
    const field = document.getElementById(fieldName);
    if (!field) return;
    
    // Add error class
    field.classList.add('form-input-error');
    
    // Create or update error message
    let errorElement = field.nextElementSibling;
    if (!errorElement || !errorElement.classList.contains('form-error-message')) {
        errorElement = document.createElement('div');
        errorElement.className = 'form-error-message';
        field.parentNode.insertBefore(errorElement, field.nextSibling);
    }
    
    errorElement.textContent = message;
    errorElement.setAttribute('role', 'alert');
    errorElement.setAttribute('aria-live', 'polite');
    
    // Store error
    formErrors[fieldName] = message;
    
    // Announce error for screen readers
    announceToScreenReader(`Error: ${message}`);
}

// Clear field error
function clearFieldError(event) {
    const field = event.target;
    const fieldName = field.id || field.name;
    
    // Remove error class
    field.classList.remove('form-input-error');
    
    // Remove error message
    const errorElement = field.nextElementSibling;
    if (errorElement && errorElement.classList.contains('form-error-message')) {
        errorElement.remove();
    }
    
    // Clear from errors object
    delete formErrors[fieldName];
}

// Handle keyboard navigation
function handleKeyboardNavigation(event) {
    // Escape key closes modals/notifications
    if (event.key === 'Escape') {
        const modal = document.querySelector('.modal.active');
        if (modal) {
            closeModal(modal);
        }
        
        const notification = document.querySelector('.notification');
        if (notification) {
            notification.remove();
        }
    }
    
    // Enter key on buttons
    if (event.key === 'Enter' && event.target.tagName === 'BUTTON') {
        event.target.click();
    }
}

// Trap focus in modal
function trapFocus(event) {
    const modal = document.querySelector('.modal.active');
    if (!modal) return;
    
    const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    
    if (event.target === firstFocusable && event.shiftKey) {
        event.preventDefault();
        lastFocusable.focus();
    } else if (event.target === lastFocusable && !event.shiftKey) {
        event.preventDefault();
        firstFocusable.focus();
    }
}

// Announce to screen reader
function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.padding = '0';
    announcement.style.margin = '-1px';
    announcement.style.overflow = 'hidden';
    announcement.style.clip = 'rect(0, 0, 0, 0)';
    announcement.style.whiteSpace = 'nowrap';
    announcement.style.border = '0';
    
    announcement.textContent = message;
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
        announcement.remove();
    }, 1000);
}

// Export user actions for testing
function exportUserActions() {
    const dataStr = JSON.stringify(userActions, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `complyflow-user-actions-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showNotification('User actions exported successfully', 'success');
}

// Reset prototype state
function resetPrototype() {
    if (confirm('Are you sure you want to reset the prototype? All progress will be lost.')) {
        selectedRegulations = [];
        onboardingStep = 1;
        completedTasks = [];
        userActions = [];
        formErrors = {};
        
        showScreen('dashboard');
        updateWizardSteps(1);
        
        // Clear form fields
        document.querySelectorAll('.form-input').forEach(input => {
            input.value = '';
            clearFieldError({ target: input });
        });
        
        // Reset task list
        const taskList = document.querySelector('.task-list');
        if (taskList) {
            taskList.innerHTML = '';
            initializeSampleData();
        }
        
        showNotification('Prototype reset successfully', 'info');
        
        // Log reset
        logUserAction('prototype_reset');
    }
}