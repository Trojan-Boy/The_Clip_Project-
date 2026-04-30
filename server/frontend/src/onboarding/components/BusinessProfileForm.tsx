import React, { useState } from 'react';
import styles from './BusinessProfileForm.module.css';
import { BusinessProfile, Industry, Country } from '../types';

interface BusinessProfileFormProps {
  initialData?: Partial<BusinessProfile>;
  industries: Industry[];
  countries: Country[];
  onSubmit: (data: BusinessProfile) => Promise<void>;
  isLoading?: boolean;
}

const BusinessProfileForm: React.FC<BusinessProfileFormProps> = ({
  initialData,
  industries,
  countries,
  onSubmit,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<Partial<BusinessProfile>>({
    businessName: initialData?.businessName || '',
    industryId: initialData?.industryId || '',
    employeeCount: initialData?.employeeCount || '1-10',
    primaryLocation: initialData?.primaryLocation || '',
    annualRevenue: initialData?.annualRevenue || '',
    complianceBudget: initialData?.complianceBudget || undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const employeeRanges = [
    { value: '1-10', label: '1-10 employees' },
    { value: '11-50', label: '11-50 employees' },
    { value: '51-200', label: '51-200 employees' },
    { value: '201-500', label: '201-500 employees' },
    { value: '501-1000', label: '501-1000 employees' },
    { value: '1000+', label: '1000+ employees' },
  ];

  const handleChange = (field: keyof BusinessProfile, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.businessName?.trim()) {
      newErrors.businessName = 'Business name is required';
    }
    
    if (!formData.industryId) {
      newErrors.industryId = 'Please select an industry';
    }
    
    if (!formData.primaryLocation) {
      newErrors.primaryLocation = 'Please select a primary location';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Submit the form
    await onSubmit(formData as BusinessProfile);
  };

  const selectedIndustry = industries.find(ind => ind.id === formData.industryId);

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formSection}>
        <h2 className={styles.sectionTitle}>Company Information</h2>
        <p className={styles.sectionDescription}>
          Tell us about your business to customize your compliance experience.
        </p>

        {/* Business Name */}
        <div className={styles.formGroup}>
          <label htmlFor="businessName" className={styles.label}>
            Business Name *
          </label>
          <input
            id="businessName"
            type="text"
            value={formData.businessName || ''}
            onChange={(e) => handleChange('businessName', e.target.value)}
            className={`${styles.input} ${errors.businessName ? styles.inputError : ''}`}
            placeholder="Enter your company name"
            disabled={isLoading}
          />
          {errors.businessName && (
            <div className={styles.errorMessage}>{errors.businessName}</div>
          )}
        </div>

        {/* Industry Selection */}
        <div className={styles.formGroup}>
          <label htmlFor="industry" className={styles.label}>
            Industry *
          </label>
          <select
            id="industry"
            value={formData.industryId || ''}
            onChange={(e) => handleChange('industryId', e.target.value)}
            className={`${styles.select} ${errors.industryId ? styles.selectError : ''}`}
            disabled={isLoading}
          >
            <option value="">Select your industry</option>
            {industries.map((industry) => (
              <option key={industry.id} value={industry.id}>
                {industry.name}
              </option>
            ))}
          </select>
          {errors.industryId && (
            <div className={styles.errorMessage}>{errors.industryId}</div>
          )}
          {selectedIndustry && (
            <div className={styles.industryInfo}>
              <p className={styles.industryDescription}>
                {selectedIndustry.description}
              </p>
              <div className={styles.regulationTags}>
                <span className={styles.tagLabel}>Common regulations:</span>
                {selectedIndustry.regulations.slice(0, 3).map((reg, index) => (
                  <span key={index} className={styles.regulationTag}>
                    {reg}
                  </span>
                ))}
                {selectedIndustry.regulations.length > 3 && (
                  <span className={styles.moreTag}>
                    +{selectedIndustry.regulations.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Employee Count */}
        <div className={styles.formGroup}>
          <label className={styles.label}>
            Number of Employees *
          </label>
          <div className={styles.radioGroup}>
            {employeeRanges.map((range) => (
              <label key={range.value} className={styles.radioLabel}>
                <input
                  type="radio"
                  name="employeeCount"
                  value={range.value}
                  checked={formData.employeeCount === range.value}
                  onChange={(e) => handleChange('employeeCount', e.target.value)}
                  className={styles.radioInput}
                  disabled={isLoading}
                />
                <span className={styles.radioCustom}></span>
                <span className={styles.radioText}>{range.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Primary Location */}
        <div className={styles.formGroup}>
          <label htmlFor="location" className={styles.label}>
            Primary Business Location *
          </label>
          <select
            id="location"
            value={formData.primaryLocation || ''}
            onChange={(e) => handleChange('primaryLocation', e.target.value)}
            className={`${styles.select} ${errors.primaryLocation ? styles.selectError : ''}`}
            disabled={isLoading}
          >
            <option value="">Select your primary location</option>
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
          {errors.primaryLocation && (
            <div className={styles.errorMessage}>{errors.primaryLocation}</div>
          )}
        </div>
      </div>

      <div className={styles.formSection}>
        <h2 className={styles.sectionTitle}>Additional Information (Optional)</h2>
        <p className={styles.sectionDescription}>
          Help us better understand your compliance needs.
        </p>

        {/* Annual Revenue */}
        <div className={styles.formGroup}>
          <label htmlFor="annualRevenue" className={styles.label}>
            Annual Revenue Range
          </label>
          <select
            id="annualRevenue"
            value={formData.annualRevenue || ''}
            onChange={(e) => handleChange('annualRevenue', e.target.value)}
            className={styles.select}
            disabled={isLoading}
          >
            <option value="">Select revenue range</option>
            <option value="under-100k">Under $100,000</option>
            <option value="100k-500k">$100,000 - $500,000</option>
            <option value="500k-1m">$500,000 - $1,000,000</option>
            <option value="1m-5m">$1,000,000 - $5,000,000</option>
            <option value="5m-10m">$5,000,000 - $10,000,000</option>
            <option value="10m+">$10,000,000+</option>
          </select>
        </div>

        {/* Compliance Budget */}
        <div className={styles.formGroup}>
          <label htmlFor="complianceBudget" className={styles.label}>
            Annual Compliance Budget (Optional)
          </label>
          <div className={styles.budgetInputGroup}>
            <span className={styles.currencySymbol}>$</span>
            <input
              id="complianceBudget"
              type="number"
              min="0"
              step="1000"
              value={formData.complianceBudget || ''}
              onChange={(e) => handleChange('complianceBudget', parseFloat(e.target.value) || 0)}
              className={styles.budgetInput}
              placeholder="0"
              disabled={isLoading}
            />
            <span className={styles.budgetSuffix}>/ year</span>
          </div>
          <p className={styles.helperText}>
            This helps us recommend the right compliance solutions for your budget.
          </p>
        </div>
      </div>

      <div className={styles.formActions}>
        <button
          type="submit"
          className={styles.submitButton}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className={styles.spinner}></span>
              Saving...
            </>
          ) : (
            'Save & Continue'
          )}
        </button>
        <p className={styles.formNote}>
          * Required fields. All information is kept confidential and secure.
        </p>
      </div>
    </form>
  );
};

export default BusinessProfileForm;