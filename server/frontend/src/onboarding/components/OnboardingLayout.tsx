import React from 'react';
import styles from './OnboardingLayout.module.css';
import { ONBOARDING_STEPS } from '../types';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  onStepChange: (step: number) => void;
  onComplete: () => void;
  onSaveProgress: () => void;
  isLoading?: boolean;
}

const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({
  children,
  currentStep,
  onStepChange,
  onComplete,
  onSaveProgress,
  isLoading = false
}) => {
  const currentStepConfig = ONBOARDING_STEPS.find(step => step.id === currentStep);
  const totalSteps = ONBOARDING_STEPS.length;
  const progressPercentage = ((currentStep - 1) / (totalSteps - 1)) * 100;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      onStepChange(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      onStepChange(currentStep - 1);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logoSection}>
          <div className={styles.logo}>ComplyFlow</div>
          <div className={styles.betaBadge}>Beta</div>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.saveButton}
            onClick={onSaveProgress}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Progress'}
          </button>
          <button className={styles.helpButton}>Help</button>
        </div>
      </header>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Progress Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.progressContainer}>
            <div className={styles.progressHeader}>
              <h2 className={styles.progressTitle}>Onboarding Progress</h2>
              <div className={styles.progressPercentage}>
                {Math.round(progressPercentage)}%
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            {/* Step Indicators */}
            <div className={styles.stepsList}>
              {ONBOARDING_STEPS.map((step) => (
                <div 
                  key={step.id}
                  className={`${styles.stepItem} ${
                    step.id === currentStep ? styles.activeStep : ''
                  } ${step.id < currentStep ? styles.completedStep : ''}`}
                  onClick={() => step.id <= currentStep && onStepChange(step.id)}
                >
                  <div className={styles.stepIndicator}>
                    {step.id < currentStep ? (
                      <span className={styles.checkmark}>✓</span>
                    ) : (
                      <span className={styles.stepNumber}>{step.id}</span>
                    )}
                  </div>
                  <div className={styles.stepInfo}>
                    <div className={styles.stepTitle}>{step.title}</div>
                    <div className={styles.stepSubtitle}>{step.subtitle}</div>
                    {step.id === currentStep && (
                      <div className={styles.currentIndicator}>Current Step</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Help Section */}
          <div className={styles.helpSection}>
            <h3 className={styles.helpTitle}>Need Help?</h3>
            <p className={styles.helpText}>
              Our compliance experts are available to guide you through the setup process.
            </p>
            <button className={styles.supportButton}>
              Contact Support
            </button>
          </div>
        </aside>

        {/* Step Content */}
        <main className={styles.contentArea}>
          <div className={styles.contentHeader}>
            <div>
              <h1 className={styles.stepTitle}>
                {currentStepConfig?.title || 'Onboarding'}
              </h1>
              <p className={styles.stepDescription}>
                {currentStepConfig?.subtitle || 'Complete your setup'}
              </p>
            </div>
            <div className={styles.stepCounter}>
              Step {currentStep} of {totalSteps}
            </div>
          </div>

          <div className={styles.stepContent}>
            {children}
          </div>

          {/* Navigation */}
          <div className={styles.navigation}>
            <div className={styles.navButtons}>
              <button
                className={styles.backButton}
                onClick={handleBack}
                disabled={currentStep === 1 || isLoading}
              >
                Back
              </button>
              <div className={styles.nextSection}>
                {currentStep < totalSteps ? (
                  <button
                    className={styles.nextButton}
                    onClick={handleNext}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Loading...' : 'Continue'}
                  </button>
                ) : (
                  <button
                    className={styles.completeButton}
                    onClick={onComplete}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Complete Setup'}
                  </button>
                )}
                <p className={styles.skipHint}>
                  {currentStepConfig?.canSkip && currentStep < totalSteps ? (
                    <button className={styles.skipButton}>Skip for now</button>
                  ) : null}
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <p className={styles.footerText}>
            Your data is secure and encrypted. By continuing, you agree to our{' '}
            <a href="/terms" className={styles.footerLink}>Terms of Service</a> and{' '}
            <a href="/privacy" className={styles.footerLink}>Privacy Policy</a>.
          </p>
          <div className={styles.securityBadge}>
            <span className={styles.lockIcon}>🔒</span>
            <span>256-bit SSL Encryption</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default OnboardingLayout;