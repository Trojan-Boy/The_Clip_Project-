import json
from bs4 import BeautifulSoup

def parse_ycombinator(html_file_content):
    soup = BeautifulSoup(html_file_content, 'html.parser')

    companies = []
    script_tags = soup.find_all('script')
    print("Found script tags. Attempting to parse:")
    for script in script_tags:
        if script.string:
            print(f"--- Script content start ---\n{script.string[:500]}\n--- Script content end ---") # Print first 500 chars to avoid truncation
            
            try:
                data = json.loads(script.string)
                # Look for a common pattern where company data might be stored
                # This often involves nested dictionaries
                if 'props' in data and 'pageProps' in data['props'] and 'companies' in data['props']['pageProps']:
                    print("Found companies data within script tag!")
                    for company_data in data['props']['pageProps']['companies']:
                        companies.append({
                            'name': company_data.get('name', 'N/A'),
                            'description': company_data.get('description', 'N/A'),
                            'Batch': company_data.get('batch', 'N/A'),
                            'Tags': [tag['name'] for tag in company_data.get('tags', [])],
                            'Company_URL': company_data.get('url', 'N/A'),
                            'Link_to_YC_Page': f"https://www.ycombinator.com/companies/{company_data.get('slug')}"
                        })
                    return companies # Assuming we found the main data, exit loop and return
            except json.JSONDecodeError:
                print("Not a JSON script.")
                continue 
            except TypeError:
                print("Script string is None or other error.")
                continue 
            except Exception as e:
                print(f"An error occurred while parsing script: {e}")
                continue
    
    print("No relevant JSON data found in script tags. Falling back to HTML parsing.")
    # Fallback to original parsing if script tag not found or failed
    for company_card in soup.find_all('a', class_='group'):
        name_tag = company_card.find('div', class_='font-bold')
        description_tag = company_card.find('div', class_='text-sm text-gray-500 line-clamp-2')
        
        name = name = name_tag.get_text(strip=True) if name_tag else 'N/A'
        description = description_tag.get_text(strip=True) if description_tag else 'N/A'
        
        if name != 'N/A':
            companies.append({
                'name': name,
                'description': description
            })

    return companies

def parse_hackernews(html_file_content):
    soup = BeautifulSoup(html_file_content, 'html.parser')
    articles = []
    for item in soup.find_all('tr', class_='athing'):
        title_tag = item.find('span', class_='titleline')
        if title_tag:
            link = title_tag.find('a')
            if link:
                url = link['href']
                title = link.get_text(strip=True)
                articles.append({
                    'title': title,
                    'url': url
                })
    return articles

def main():
    with open('ycombinator_startups.html', 'r', encoding='utf-8') as f:
        ycombinator_html_content = f.read()
    
    with open('hackernews.html', 'r', encoding='utf-8') as f:
        hackernews_html_content = f.read()

    ycombinator_data = parse_ycombinator(ycombinator_html_content)
    hackernews_data = parse_hackernews(hackernews_html_content)

    output = {
        'ycombinator_startups': ycombinator_data,
        'hackernews_articles': hackernews_data
    }

    with open('parsed_data.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=4)

if __name__ == '__main__':
    main()
