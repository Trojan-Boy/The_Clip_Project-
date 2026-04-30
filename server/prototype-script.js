// ComplyFlow Interactive Prototype - Enhanced JavaScript
// Updated with accessibility features, form validation, and improved user experience

// Global state
let selectedRegulations = [];
let onboardingStep = 1;
let userTestingScenario = null;
let completedTasks = [];
let userActions = [];
let formErrors = {};

// Show a specific screen with accessibility improvements
function showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen-container').forEach(screen => {
        screen.classList.remove('active');
        screen.setAttribute('aria-hidden', 'true');
    });
    
    // Show selected screen
    const screen = document.getElementById(`screen-${screenId}`);
    if (screen) {
        screen.classList.add('active');
        screen.setAttribute('aria-hidden', 'false');
        
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
    
    // Log screen change for user testing
    logUserAction('screen_change', { screen: screenId, timestamp: new Date().toISOString() });
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
    button.innerHTML = '