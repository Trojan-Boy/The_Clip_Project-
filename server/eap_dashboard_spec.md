# EAP Customer Tracking Dashboard Specification

## 1. Overview Dashboard (Google Sheet Tab)

### Key Metrics Summary:
*   **Total EAP Sign-ups:** Count of unique users who have joined the program.
*   **Active EAP Users:** Count of users who have logged in or performed a key action within the last 7 days.
*   **Activation Rate (%):** (Active EAP Users / Total EAP Sign-ups) * 100.
*   **Feedback Submitted:** Total count of feedback entries.
*   **Bugs Reported:** Total count of unique bug reports.
*   **Key Engagement Metric:** Define a primary engagement metric relevant to the product (e.g., Average Sessions per Week, Average Feature X Usage per User).

### Charts:
*   **Sign-up Trend:** Line chart showing daily/weekly sign-ups.
*   **Active User Trend:** Line chart showing daily/weekly active users.
*   **Feedback Categories:** Bar chart showing distribution of feedback types (Bug, Feature Request, Usability, General).

## 2. User List & Details (Google Sheet Tab)

### Columns:
*   **User ID:** Unique identifier for each EAP participant.
*   **Name:** Full name of the participant.
*   **Email:** Contact email address.
*   **Company/Organization:** Affiliated company or organization.
*   **Sign-up Date:** Date when the user joined the EAP.
*   **Last Active Date:** Most recent date of user activity.
*   **Key Features Used:** Track usage of critical features (e.g., `Feature A: Yes/No`, `Feature B: Count`). This will be customized based on product features.
*   **Feedback Notes:** A column for aggregated notes derived from feedback, or a link to specific feedback entries in the `Feedback Log` sheet.
*   **Bugs Reported:** A column for aggregated notes derived from bug reports, or a link to specific bug reports in the `Bug Report Log` sheet.
*   **Status:** Current status of the EAP participant (e.g., `Active`, `Inactive`, `Converted to Paid`, `Churned`).

## 3. Feedback Log (Google Sheet Tab)

### Columns:
*   **Feedback ID:** Unique identifier for each feedback entry.
*   **User ID:** ID of the user who submitted the feedback.
*   **Date Submitted:** Date when the feedback was received.
*   **Feedback Type:** Categorization of feedback (e.g., `Bug`, `Feature Request`, `Usability`, `General Question`, `Praise`).
*   **Description:** Detailed text of the feedback.
*   **Severity/Priority:** (e.g., `High`, `Medium`, `Low`) applicable for bugs or critical feature requests.
*   **Status:** Current status of the feedback (e.g., `New`, `Reviewed`, `In Progress`, `Implemented`, `Declined`).

## 4. Bug Report Log (Google Sheet Tab)

### Columns:
*   **Bug ID:** Unique identifier for each bug report.
*   **User ID:** ID of the user who reported the bug.
*   **Date Submitted:** Date when the bug was reported.
*   **Description:** Detailed description of the bug.
*   **Steps to Reproduce:** Clear steps to replicate the bug.
*   **Screenshots/Attachments:** Link to any supporting media.
*   **Environment:** User's operating system, browser, device, etc.
*   **Severity:** (e.g., `Critical`, `High`, `Medium`, `Low`).
*   **Status:** Current status of the bug (e.g., `New`, `Confirmed`, `In Progress`, `Fixed`, `Closed`, `Cannot Reproduce`).

## Data Collection & Maintenance:
*   Data will initially be collected manually or via simple form integrations (e.g., Google Forms).
*   Regular updates (daily/weekly) to ensure data freshness.
*   Consider automated data pipelines as the program scales.

## Future Enhancements:
*   Integration with product analytics tools for automated data population.
*   Automated reporting for key stakeholders.