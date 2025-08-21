#!/usr/bin/env python3
"""
Mayo Clinic Data Cleaner

This script cleans the Mayo Clinic JSON data by keeping only specific sections:
- Overview
- Symptoms 
- When to see a doctor
- Causes
- Risk factors
- Complications
- Prevention
"""

import json
import os
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def clean_mayo_clinic_data():
    """Clean Mayo Clinic data to keep only specified sections."""
    
    # Define the sections to keep
    sections_to_keep = [
        'Overview',
        'Symptoms',
        'When to see a doctor',
        'Causes',
        'Risk factors',
        'Complications',
        'Prevention'
    ]
    
    # Load Mayo Clinic data
    mayo_data_file = 'mayo_clinic_data/mayo_clinic_diseases.json'
    if not os.path.exists(mayo_data_file):
        print(f"Error: {mayo_data_file} not found. Please run collect_mayo_clinic.py first.")
        return
    
    with open(mayo_data_file, 'r', encoding='utf-8') as f:
        mayo_data = json.load(f)
    
    cleaned_data = []
    total_sections_before = 0
    total_sections_after = 0
    
    for i, disease_info in enumerate(mayo_data):
        print(f"Cleaning {i+1}/{len(mayo_data)}: {disease_info['name']}")
        
        # Get the structured content
        structured_content = disease_info.get('structured_content', {})
        if not structured_content:
            continue
        
        total_sections_before += len(structured_content)
        
        # Filter sections to keep only the specified ones
        cleaned_sections = {}
        
        for section_name, section_content in structured_content.items():
            # Check if this section should be kept
            should_keep = False
            for target_section in sections_to_keep:
                if target_section.lower() in section_name.lower():
                    should_keep = True
                    break
            
            if should_keep:
                cleaned_sections[section_name] = section_content
                print(f"  - Keeping section: {section_name}")
            else:
                print(f"  - Removing section: {section_name}")
        
        total_sections_after += len(cleaned_sections)
        
        # Only add if we have at least one valid section
        if cleaned_sections:
            cleaned_data.append({
                'name': disease_info['name'],
                'url': disease_info['url'],
                'structured_content': cleaned_sections
            })
    
    # Save the cleaned data
    os.makedirs('mayo_clinic_data', exist_ok=True)
    cleaned_file = 'mayo_clinic_data/mayo_clinic_diseases.json'
    
    with open(cleaned_file, 'w', encoding='utf-8') as f:
        json.dump(cleaned_data, f, indent=2, ensure_ascii=False)
    
    print(f"\nCleaned data saved to {cleaned_file}")
    print(f"Total diseases: {len(cleaned_data)} (original: {len(mayo_data)})")
    print(f"Total sections: {total_sections_after} (original: {total_sections_before})")
    print(f"Sections removed: {total_sections_before - total_sections_after}")
    
    # Print section statistics
    section_counts = {}
    for disease_info in cleaned_data:
        for section_name in disease_info['structured_content'].keys():
            section_counts[section_name] = section_counts.get(section_name, 0) + 1
    
    print("\nSection statistics:")
    for section, count in sorted(section_counts.items()):
        print(f"  - {section}: {count} diseases")

if __name__ == "__main__":
    clean_mayo_clinic_data()