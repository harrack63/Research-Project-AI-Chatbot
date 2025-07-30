#!/usr/bin/env python3
"""
Mayo Clinic Disease/Condition Data Collector

This script collects disease and condition information from Mayo Clinic's website.
It scrapes index pages from A-Z and extracts detailed content from each disease page.
"""

import requests
from bs4 import BeautifulSoup
import time
import string
import json
import os
from urllib.parse import urljoin, urlparse
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MayoClinicCollector:
    def __init__(self, delay=1.0):
        self.base_url = "https://www.mayoclinic.org"
        self.delay = delay
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        
    def collect_disease_urls_for_letter(self, letter):
        """Collect all disease URLs for a specific letter."""
        url = f"{self.base_url}/diseases-conditions/index?letter={letter}"
        logger.info(f"Collecting URLs for letter: {letter}")
        
        try:
            response = self.session.get(url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Find all divs with class "cmp-result-name"
            result_divs = soup.find_all('div', class_='cmp-result-name')
            
            urls = []
            for div in result_divs:
                # Look for anchor tags within the div
                link = div.find('a', class_='cmp-result-name__link')
                if link and link.get('href'):
                    full_url = urljoin(self.base_url, link.get('href'))
                    disease_name = link.get_text(strip=True)
                    urls.append({
                        'name': disease_name,
                        'url': full_url
                    })
            
            logger.info(f"Found {len(urls)} disease URLs for letter {letter}")
            return urls
            
        except Exception as e:
            logger.error(f"Error collecting URLs for letter {letter}: {str(e)}")
            return []
    
    def collect_all_disease_urls(self):
        """Collect disease URLs from all letter pages (A-Z)."""
        all_urls = []
        
        for letter in string.ascii_uppercase:
            urls = self.collect_disease_urls_for_letter(letter)
            all_urls.extend(urls)
            time.sleep(self.delay)
        
        logger.info(f"Total disease URLs collected: {len(all_urls)}")
        return all_urls
    
    def extract_main_content(self, url):
        """Extract main content with headers and associated text from a disease page."""
        try:
            response = self.session.get(url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Remove navigation, sidebar, footer, and other non-content elements
            for element in soup.find_all(['nav', 'header', 'footer', 'aside', 'script', 'style']):
                element.decompose()
            
            # Remove elements with common navigation/UI classes
            for class_name in ['nav', 'navigation', 'menu', 'sidebar', 'footer', 'header', 'breadcrumb']:
                for element in soup.find_all(attrs={'class': lambda x: x and class_name in ' '.join(x).lower()}):
                    element.decompose()
            
            # Remove ad containers and other unwanted elements
            for element in soup.find_all(attrs={'id': lambda x: x and 'ad-' in x.lower()}):
                element.decompose()
            
            # Try to find the main content area
            main_content = None
            
            # Look for common main content selectors
            for selector in ['main', '[role="main"]', '.main-content', '.content', '#main', '#content']:
                main_content = soup.select_one(selector)
                if main_content:
                    break
            
            # If no main content found, use the body but remove common non-content elements
            if not main_content:
                main_content = soup.find('body')
                if main_content:
                    # Remove additional non-content elements
                    for element in main_content.find_all(attrs={'class': lambda x: x and any(term in ' '.join(x).lower() for term in ['nav', 'menu', 'sidebar', 'footer', 'header', 'ad', 'advertisement'])}):
                        element.decompose()
            
            if not main_content:
                logger.warning(f"Could not find main content for {url}")
                return None
            
            # Extract structured content with headers
            structured_content = {}
            current_header = None
            current_content = []
            
            # Find all elements in order
            all_elements = main_content.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'ul', 'ol'])
            
            for element in all_elements:
                # Check if this is a header
                if element.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                    # Save previous section if exists
                    if current_header and current_content:
                        structured_content[current_header] = '\n'.join(current_content)
                    
                    # Start new section
                    current_header = element.get_text(strip=True)
                    current_content = []
                    
                    # Skip if header is too short or looks like navigation
                    if len(current_header) < 3 or current_header.lower() in ['menu', 'navigation', 'skip']:
                        current_header = None
                        continue
                
                # Process content elements
                elif element.name in ['p', 'li']:
                    text = element.get_text(strip=True)
                    if text and len(text) > 10:  # Filter out very short text
                        # Skip if looks like navigation or ads
                        if any(skip_word in text.lower() for skip_word in ['click here', 'learn more', 'advertisement', 'sponsored']):
                            continue
                        
                        if current_header:
                            current_content.append(text)
                        else:
                            # Content without header - use 'Overview' as default
                            if 'Overview' not in structured_content:
                                structured_content['Overview'] = text
                            else:
                                structured_content['Overview'] += '\n' + text
                
                # Handle lists
                elif element.name in ['ul', 'ol']:
                    list_items = []
                    for li in element.find_all('li'):
                        text = li.get_text(strip=True)
                        if text and len(text) > 5:
                            list_items.append(text)
                    
                    if list_items and current_header:
                        current_content.extend(list_items)
            
            # Don't forget the last section
            if current_header and current_content:
                structured_content[current_header] = '\n'.join(current_content)
            
            # Filter out common non-content headers
            filtered_content = {}
            valid_headers = ['Overview', 'Symptoms', 'When to see a doctor', 'Causes', 'Risk factors', 'Complications', 'Prevention', 'Diagnosis', 'Treatment', 'Lifestyle and home remedies', 'Preparing for your appointment']
            
            for header, content in structured_content.items():
                # Check if header matches common medical article sections
                if any(valid_header.lower() in header.lower() for valid_header in valid_headers):
                    filtered_content[header] = content
                # Also include headers that are likely section headers (reasonable length)
                elif 5 <= len(header) <= 50 and not any(skip in header.lower() for skip in ['copyright', 'privacy', 'terms', 'cookie']):
                    filtered_content[header] = content
            
            return filtered_content if filtered_content else None
            
        except Exception as e:
            logger.error(f"Error extracting content from {url}: {str(e)}")
            return None
    
    def collect_disease_data(self, disease_info):
        """Collect detailed data for a single disease."""
        name = disease_info['name']
        url = disease_info['url']
        
        logger.info(f"Collecting data for: {name}")
        
        structured_content = self.extract_main_content(url)
        if structured_content:
            return {
                'name': name,
                'url': url,
                'structured_content': structured_content
            }
        return None
    
    def save_data(self, data, filename):
        """Save collected data to a JSON file."""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        logger.info(f"Data saved to {filename}")

def main():
    collector = MayoClinicCollector(delay=1.0)
    
    # Create output directory if it doesn't exist
    output_dir = "mayo_clinic_data"
    os.makedirs(output_dir, exist_ok=True)
    
    # Check if disease URLs already exist
    urls_file = os.path.join(output_dir, "disease_urls.json")
    
    if os.path.exists(urls_file):
        logger.info("Loading existing disease URLs...")
        with open(urls_file, 'r', encoding='utf-8') as f:
            disease_urls = json.load(f)
        logger.info(f"Loaded {len(disease_urls)} existing disease URLs")
    else:
        # Collect all disease URLs
        logger.info("Starting URL collection...")
        disease_urls = collector.collect_all_disease_urls()
        
        # Save URLs to file
        collector.save_data(disease_urls, urls_file)
    
    # Collect detailed content for each disease
    logger.info("Starting content collection...")
    collected_data = []
    
    for i, disease_info in enumerate(disease_urls):
        if i > 0 and i % 10 == 0:
            logger.info(f"Processed {i}/{len(disease_urls)} diseases")
        
        data = collector.collect_disease_data(disease_info)
        if data:
            collected_data.append(data)
        
        # Add delay between requests
        time.sleep(collector.delay)
    
    # Save all collected data
    output_file = os.path.join(output_dir, "mayo_clinic_diseases.json")
    collector.save_data(collected_data, output_file)
    
    logger.info(f"Collection complete! Collected data for {len(collected_data)} diseases")

if __name__ == "__main__":
    main()