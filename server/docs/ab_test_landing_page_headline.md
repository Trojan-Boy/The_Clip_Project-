# A/B Test: Landing Page Headline

## Overview

This document outlines the setup for an A/B test aimed at optimizing the conversion rate of the landing page by testing different headlines. Due to the lack of an existing analytics setup, a foundational Google Analytics 4 (GA4) implementation was completed as a prerequisite (see `docs/analytics_setup.md`). This A/B test is simulated with client-side JavaScript.

## Test Parameters

*   **Objective:** Increase sign-up rate on the landing page.
*   **Hypothesis:** A more benefit-oriented headline will lead to a higher sign-up rate compared to the current feature-oriented headline.
*   **Target Audience:** All visitors to the landing page.
*   **Duration:** N/A (simulated, would be determined once live GA4 is active and statistical significance can be reached).
*   **Success Metric:** `sign_up` event count, measured in GA4.

## Variations

*   **Control Headline:** "Paperclip: Automate Your Development Workflow"
*   **Variation Headline:** "Boost Your Productivity with Paperclip's AI-Powered Development Assistance"

## Implementation Details

### Location

The A/B test logic is implemented directly within `index.html` using client-side JavaScript.

### Mechanism

1.  **Random Assignment:** On page load, a JavaScript snippet randomly assigns the user to either the 'control' or 'variation' group (50/50 split).
2.  **Headline Display:** The `h1` element with `id="landing-headline"` is updated with the respective headline for the assigned group.
3.  **Event Tracking:** The `simulateSignUp()` function, triggered by clicking the "Sign Up Now" button, now passes the `currentVariation` (control or variation) as a parameter (`test_variation`) to the GA4 `sign_up` event. This allows for segmentation and comparison of conversion rates between the groups within GA4.

### GA4 Integration

*   A basic GA4 setup (with a `G-PLACEHOLDER_ID`) is included in `index.html`.
*   The `sign_up` event is configured to send the A/B test variation as a custom event parameter. This parameter would need to be registered as a custom dimension in the GA4 property for effective reporting.

## Monitoring and Analysis (Future Steps)

*   **Replace Placeholder GA4 ID:** The `G-PLACEHOLDER_ID` in `index.html` must be replaced with a valid GA4 Measurement ID.
*   **GA4 Configuration:** Register the `test_variation` event parameter as a custom dimension in GA4.
*   **Data Collection:** Allow sufficient time for data collection to occur.
*   **Reporting:** Monitor `sign_up` event counts and conversion rates for both the 'control' and 'variation' groups within the GA4 interface.
*   **Statistical Significance:** Determine if there is a statistically significant difference in performance between the two headlines.
*   **Decision:** Based on the results, decide whether to adopt the variation, stick with the control, or conduct further tests.

## Recommendation

Once a live GA4 Measurement ID is in place and configured correctly, monitor the A/B test performance over a defined period (e.g., 2-4 weeks or until statistical significance is reached with sufficient sample size). If the variationheadline clearly outperforms the control in terms of sign-up rate, it should be adopted as the new default headline.