import csv

def generate_eap_report():
    try:
        with open('eap_customers.csv', 'r') as f:
            reader = csv.DictReader(f)
            customers = list(reader)
    except FileNotFoundError:
        return "EAP customer data file (eap_customers.csv) not found."

    total_customers = len(customers)
    active_customers = [c for c in customers if c.get('Onboarding Status', '').lower() == 'active']
    num_active_customers = len(active_customers)

    report = "# Early Adopter Program (EAP) Status Report\\n\\n"
    report += f"**Total EAP Customers:** {total_customers}\\n"
    report += f"**Active EAP Customers:** {num_active_customers}\\n\\n"

    if customers:
        report += "| Customer ID | Company/Individual Name | Onboarding Status | Onboarding Date |\\n"
        report += "|-------------|-------------------------|-------------------|-----------------|\s\n"
        for customer in customers:
            customer_id = customer.get('Customer ID', 'N/A')
            company_name = customer.get('Company/Individual Name', 'N/A')
            onboarding_status = customer.get('Onboarding Status', 'N/A')
            onboarding_date = customer.get('Onboarding Date', 'N/A')
            report += f"| {customer_id} | {company_name} | {onboarding_status} | {onboarding_date} |\\n"
    else:
        report += "No EAP customer data available yet.\\n"

    print(report)

if __name__ == "__main__":
    generate_eap_report()
